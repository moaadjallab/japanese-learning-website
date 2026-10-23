import { describe, expect, it, vi } from 'vitest';
import { guardRoute, AREA_ROLES } from '@/lib/auth/guard';
import { HttpAuthService, AuthNotAvailableError } from '@/lib/auth/AuthService';
import type { Session } from '@/lib/auth/types';

describe('route guard', () => {
  const session = (roles: Session['user']['roles'], expiresAt = '2999-01-01T00:00:00Z'): Session => ({
    id: 's',
    userId: 'u',
    expiresAt,
    user: {
      id: 'u',
      email: 'a@b.c',
      fullName: 'A',
      roles,
      preferredLanguage: 'en',
      japaneseLevel: 'n5',
      emailVerified: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
  });
  it('redirects anonymous users to login', () => {
    expect(guardRoute(null, AREA_ROLES.student, 'ar')).toEqual({
      allowed: false,
      reason: 'unauthenticated',
      redirectTo: '/ar/login/',
    });
  });
  it('enforces roles and expiry', () => {
    expect(guardRoute(session(['student']), AREA_ROLES.teacher, 'en').allowed).toBe(false);
    expect(guardRoute(session(['teacher']), AREA_ROLES.teacher, 'en').allowed).toBe(true);
    expect(guardRoute(session(['admin']), AREA_ROLES.student, 'en').allowed).toBe(true);
    expect(guardRoute(session(['admin'], '2000-01-01T00:00:00Z'), AREA_ROLES.admin, 'en')).toMatchObject({
      allowed: false,
      reason: 'expired',
    });
  });
});

describe('auth service (V1)', () => {
  it('reports "not available" on 501 instead of faking a session', async () => {
    const fetch501 = vi.fn().mockResolvedValue(new Response('{}', { status: 501 }));
    const service = new HttpAuthService('/api/auth', fetch501);
    await expect(service.login({ email: 'a@b.c', password: 'x' })).rejects.toBeInstanceOf(
      AuthNotAvailableError,
    );
    expect(await service.getSession()).toBeNull();
  });
});
