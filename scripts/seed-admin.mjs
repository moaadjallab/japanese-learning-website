// Creates (or resets) a local ADMIN test account in the LOCAL D1 database (never remote).
//
//   pnpm db:migrate:local && pnpm db:seed:local
//
// Credentials come from .dev.vars (git-ignored): SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
// If they are missing, a strong random password is generated and saved there.
// The password hash format matches src/lib/auth/server/crypto.ts (PBKDF2-SHA256, 100k iterations).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, appendFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webcrypto as crypto, randomUUID } from 'node:crypto';

const VARS_FILE = '.dev.vars';
const ITERATIONS = 100_000;

const b64url = (bytes) => Buffer.from(bytes).toString('base64url');

const readVars = () => {
  if (!existsSync(VARS_FILE)) return {};
  return Object.fromEntries(
    readFileSync(VARS_FILE, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
  );
};

const vars = readVars();
const email = (vars.SEED_ADMIN_EMAIL || 'admin@nihongo.test').toLowerCase();
let password = vars.SEED_ADMIN_PASSWORD;
if (!password) {
  // Letters + digits so it satisfies the password policy.
  password = `Adm1n-${b64url(crypto.getRandomValues(new Uint8Array(12)))}`;
  appendFileSync(
    VARS_FILE,
    `${existsSync(VARS_FILE) ? '\n' : ''}# Local test admin (created by scripts/seed-admin.mjs)\nSEED_ADMIN_EMAIL=${email}\nSEED_ADMIN_PASSWORD=${password}\n`,
  );
  console.log(`[seed] Generated a password and saved it to ${VARS_FILE}.`);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
  'deriveBits',
]);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
  key,
  256,
);
const hash = `pbkdf2$${ITERATIONS}$${b64url(salt)}$${b64url(new Uint8Array(bits))}`;

const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
const now = new Date().toISOString();
const sql = `
INSERT INTO users (id, email, email_verified_at, password_hash, full_name, preferred_language, japanese_level)
VALUES (${q(randomUUID())}, ${q(email)}, ${q(now)}, ${q(hash)}, 'Admin', 'en', 'unknown')
ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash,
  email_verified_at = COALESCE(users.email_verified_at, excluded.email_verified_at), deleted_at = NULL;
INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT id, 'admin' FROM users WHERE email = ${q(email)};
INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT id, 'student' FROM users WHERE email = ${q(email)};
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ${q(email)});
`;

const dir = mkdtempSync(join(tmpdir(), 'seed-'));
const file = join(dir, 'seed.sql');
writeFileSync(file, sql);
try {
  execFileSync('pnpm', ['exec', 'wrangler', 'd1', 'execute', 'DB', '--local', `--file=${file}`], {
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32',
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`[seed] Local admin account ready: ${email} (password in ${VARS_FILE} → SEED_ADMIN_PASSWORD).`);
