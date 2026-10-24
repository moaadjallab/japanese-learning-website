/**
 * Pure helpers for the administration area (no D1, unit-tested in tests/unit/admin.test.ts).
 */
import { ROLES, type Role } from '@/lib/auth/types';

/** User-list filters shown as tabs on /admin. */
export const USER_FILTERS = ['all', 'subscribed', 'unsubscribed', 'staff', 'suspended'] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export const parseUserFilter = (value: unknown): UserFilter =>
  typeof value === 'string' && (USER_FILTERS as readonly string[]).includes(value)
    ? (value as UserFilter)
    : 'all';

/** Keep only known roles, without duplicates, in canonical order; every account stays a student. */
export const normalizeRoles = (input: readonly string[]): Role[] => {
  const set = new Set(input);
  set.add('student');
  return ROLES.filter((role) => set.has(role));
};

export type SelfActionError = 'self_demote' | 'self_suspend';

/**
 * Admins can't lock themselves out: removing their own admin role or suspending their own account
 * is refused. Returns the reason, or null when the action is allowed.
 */
export const checkSelfAction = (
  actorId: string,
  targetId: string,
  action: { roles?: readonly Role[]; suspend?: boolean },
): SelfActionError | null => {
  if (actorId !== targetId) return null;
  if (action.roles && !action.roles.includes('admin')) return 'self_demote';
  if (action.suspend) return 'self_suspend';
  return null;
};

/**
 * One CSV cell: quoted, inner quotes doubled, and cells starting with = + - @ (or tab/CR) prefixed
 * with ' so spreadsheet apps don't evaluate them as formulas (CSV injection).
 */
export const csvCell = (value: string | number | null | undefined): string => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const BOM = String.fromCharCode(0xfeff);

/** CSV document with a UTF-8 BOM (so Excel shows Arabic names correctly) and CRLF line endings. */
export const toCsv = (header: readonly string[], rows: readonly (readonly (string | number | null)[])[]) =>
  BOM + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';

/** Percentage 0–100, rounded; 0 when there is nothing to complete. */
export const percent = (done: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
