import { describe, expect, it } from 'vitest';
import {
  checkSelfAction,
  csvCell,
  normalizeRoles,
  parseUserFilter,
  percent,
  toCsv,
} from '@/lib/admin/helpers';
import { routes } from '@/lib/routes';

describe('admin helpers', () => {
  it('parses user filters safely', () => {
    expect(parseUserFilter('suspended')).toBe('suspended');
    expect(parseUserFilter('staff')).toBe('staff');
    expect(parseUserFilter('drop table')).toBe('all');
    expect(parseUserFilter(null)).toBe('all');
  });

  it('normalizes roles: known only, student always kept, canonical order', () => {
    expect(normalizeRoles([])).toEqual(['student']);
    expect(normalizeRoles(['admin', 'teacher', 'admin'])).toEqual(['student', 'teacher', 'admin']);
    expect(normalizeRoles(['owner', 'teacher'])).toEqual(['student', 'teacher']);
  });

  it('prevents admins from locking themselves out', () => {
    expect(checkSelfAction('a', 'a', { roles: ['student'] })).toBe('self_demote');
    expect(checkSelfAction('a', 'a', { roles: ['student', 'admin'] })).toBeNull();
    expect(checkSelfAction('a', 'a', { suspend: true })).toBe('self_suspend');
    expect(checkSelfAction('a', 'b', { roles: ['student'] })).toBeNull();
    expect(checkSelfAction('a', 'b', { suspend: true })).toBeNull();
  });

  it('escapes CSV cells, including formula injection', () => {
    expect(csvCell('Sara "S" Ali')).toBe('"Sara ""S"" Ali"');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+212600')).toBe(`"'+212600"`);
    expect(csvCell('@cmd')).toBe(`"'@cmd"`);
    expect(csvCell(null)).toBe('""');
    expect(csvCell(3)).toBe('"3"');
  });

  it('builds a CSV document with BOM and CRLF', () => {
    const csv = toCsv(['name', 'email'], [['سارة', 'sara@example.com']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('"name","email"\r\n"سارة","sara@example.com"\r\n');
  });

  it('computes progress percentages', () => {
    expect(percent(0, 0)).toBe(0);
    expect(percent(1, 3)).toBe(33);
    expect(percent(5, 4)).toBe(100);
  });

  it('builds the admin user URL', () => {
    expect(routes.adminUser('ar', 'abc-123')).toBe('/ar/admin/users/abc-123/');
  });
});
