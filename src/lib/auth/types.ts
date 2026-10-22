/**
 * Auth domain types — defined now so V2 (accounts, dashboards) plugs in without refactors.
 * See AUTH_PLAN.md for the recommended implementation.
 */
export const ROLES = ['student', 'teacher', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export type PreferredLanguage = 'ar' | 'en';
export type JapaneseLevel = 'beginner' | 'n5' | 'n4' | 'n3' | 'n2' | 'n1' | 'unknown';

export interface User {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  preferredLanguage: PreferredLanguage;
  japaneseLevel: JapaneseLevel;
  emailVerified: boolean;
  createdAt: string; // ISO 8601
}

export interface Session {
  id: string;
  userId: string;
  user: User;
  expiresAt: string; // ISO 8601
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  preferredLanguage: PreferredLanguage;
  japaneseLevel: JapaneseLevel;
}
