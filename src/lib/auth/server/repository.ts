/**
 * D1 data access for accounts, roles, sessions and one-time tokens.
 * Session and token ids are SHA-256 hashes of the secret values sent to the browser / by email.
 */
import type { JapaneseLevel, PreferredLanguage, Role, Session, User } from '../types';
import { ROLES } from '../types';
import { randomToken, sha256Hex } from './crypto';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** Sessions are extended when less than this remains (sliding expiry). */
const SESSION_RENEW_MS = 15 * 24 * 60 * 60 * 1000;
export const TOKEN_TTL_MS = {
  email_verification: 48 * 60 * 60 * 1000, // 48 h
  password_reset: 60 * 60 * 1000, // 1 h
} as const;
export type TokenPurpose = keyof typeof TOKEN_TTL_MS;

const now = () => new Date();
const iso = (d: Date) => d.toISOString();

interface UserRow {
  id: string;
  email: string;
  email_verified_at: string | null;
  password_hash: string | null;
  full_name: string;
  preferred_language: PreferredLanguage;
  japanese_level: JapaneseLevel;
  created_at: string;
  roles: string | null;
}

const USER_COLUMNS = `u.id, u.email, u.email_verified_at, u.password_hash, u.full_name, u.preferred_language,
  u.japanese_level, u.created_at,
  (SELECT group_concat(role_id) FROM user_roles ur WHERE ur.user_id = u.id) AS roles`;

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  roles: (row.roles ?? '').split(',').filter((r): r is Role => (ROLES as readonly string[]).includes(r)),
  preferredLanguage: row.preferred_language,
  japaneseLevel: row.japanese_level,
  emailVerified: Boolean(row.email_verified_at),
  createdAt: row.created_at,
});

export interface UserWithHash {
  user: User;
  passwordHash: string | null;
}

export const findUserByEmail = async (db: D1Database, email: string): Promise<UserWithHash | null> => {
  const row = await db
    .prepare(`SELECT ${USER_COLUMNS} FROM users u WHERE u.email = ?1 AND u.deleted_at IS NULL`)
    .bind(email.trim().toLowerCase())
    .first<UserRow>();
  return row ? { user: toUser(row), passwordHash: row.password_hash } : null;
};

export const findUserById = async (db: D1Database, id: string): Promise<User | null> => {
  const row = await db
    .prepare(`SELECT ${USER_COLUMNS} FROM users u WHERE u.id = ?1 AND u.deleted_at IS NULL`)
    .bind(id)
    .first<UserRow>();
  return row ? toUser(row) : null;
};

export interface NewUser {
  email: string;
  fullName: string;
  passwordHash: string;
  preferredLanguage: PreferredLanguage;
  japaneseLevel: JapaneseLevel;
  roles?: Role[];
}

/** Creates the user and its roles atomically. Throws `EmailTakenError` on duplicate email. */
export const createUser = async (db: D1Database, input: NewUser): Promise<User> => {
  const id = crypto.randomUUID();
  const roles = input.roles?.length ? input.roles : (['student'] as Role[]);
  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO users (id, email, password_hash, full_name, preferred_language, japanese_level)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        )
        .bind(
          id,
          input.email.trim().toLowerCase(),
          input.passwordHash,
          input.fullName.trim(),
          input.preferredLanguage,
          input.japaneseLevel,
        ),
      ...roles.map((role) =>
        db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?1, ?2)').bind(id, role),
      ),
    ]);
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw new EmailTakenError();
    throw error;
  }
  const user = await findUserById(db, id);
  if (!user) throw new Error('User was not created');
  return user;
};

export class EmailTakenError extends Error {
  constructor() {
    super('Email already registered');
    this.name = 'EmailTakenError';
  }
}

export const updatePassword = async (db: D1Database, userId: string, passwordHash: string) => {
  await db
    .prepare('UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(passwordHash, iso(now()), userId)
    .run();
};

export const markEmailVerified = async (db: D1Database, userId: string) => {
  await db
    .prepare(
      'UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?1), updated_at = ?1 WHERE id = ?2',
    )
    .bind(iso(now()), userId)
    .run();
};

/* ------------------------------------------------------------------ sessions */

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export const createSession = async (
  db: D1Database,
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<CreatedSession> => {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db
    .prepare(
      'INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent) VALUES (?1, ?2, ?3, ?4, ?5)',
    )
    .bind(
      await sha256Hex(token),
      userId,
      iso(expiresAt),
      meta.ip ?? null,
      meta.userAgent?.slice(0, 300) ?? null,
    )
    .run();
  return { token, expiresAt };
};

/**
 * Resolve a session token. Expired sessions are deleted. Returns `renewedExpiresAt` when the
 * session was extended, so the caller can refresh the cookie.
 */
export const validateSession = async (
  db: D1Database,
  token: string,
): Promise<{ session: Session; renewedExpiresAt?: Date } | null> => {
  const id = await sha256Hex(token);
  const row = await db
    .prepare('SELECT id, user_id, expires_at FROM sessions WHERE id = ?1')
    .bind(id)
    .first<{ id: string; user_id: string; expires_at: string }>();
  if (!row) return null;
  const expires = new Date(row.expires_at);
  if (expires.getTime() <= Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE id = ?1').bind(id).run();
    return null;
  }
  const user = await findUserById(db, row.user_id);
  if (!user) return null;
  let renewedExpiresAt: Date | undefined;
  if (expires.getTime() - Date.now() < SESSION_RENEW_MS) {
    renewedExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db
      .prepare('UPDATE sessions SET expires_at = ?1 WHERE id = ?2')
      .bind(iso(renewedExpiresAt), id)
      .run();
  }
  return {
    session: { id, userId: user.id, user, expiresAt: iso(renewedExpiresAt ?? expires) },
    renewedExpiresAt,
  };
};

export const deleteSession = async (db: D1Database, token: string) => {
  await db
    .prepare('DELETE FROM sessions WHERE id = ?1')
    .bind(await sha256Hex(token))
    .run();
};

export const deleteUserSessions = async (db: D1Database, userId: string) => {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(userId).run();
};

/* ------------------------------------------------------------ one-time tokens */

export const createOneTimeToken = async (db: D1Database, userId: string, purpose: TokenPurpose) => {
  const token = randomToken();
  // Only the latest token of each purpose stays valid.
  await db.batch([
    db.prepare('DELETE FROM verification_tokens WHERE user_id = ?1 AND purpose = ?2').bind(userId, purpose),
    db
      .prepare('INSERT INTO verification_tokens (id, user_id, purpose, expires_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(await sha256Hex(token), userId, purpose, iso(new Date(Date.now() + TOKEN_TTL_MS[purpose]))),
  ]);
  return token;
};

/** Marks the token used and returns its user id, or null if unknown / expired / already used. */
export const consumeOneTimeToken = async (
  db: D1Database,
  token: string,
  purpose: TokenPurpose,
): Promise<string | null> => {
  const id = await sha256Hex(token);
  const row = await db
    .prepare(
      `UPDATE verification_tokens SET used_at = ?1
       WHERE id = ?2 AND purpose = ?3 AND used_at IS NULL AND expires_at > ?1
       RETURNING user_id`,
    )
    .bind(iso(now()), id, purpose)
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
};
