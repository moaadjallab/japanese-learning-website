/**
 * AuthService — the only API the UI uses for authentication.
 *
 * `HttpAuthService` calls the /api/auth/* endpoints (D1-backed sessions, see AUTH_PLAN.md).
 * The session itself lives in an HttpOnly cookie set by the server; this client never sees it.
 * If the server answers 501 (no database configured), the UI shows "accounts are coming soon".
 */
import type { LoginRequest, RegisterRequest, User } from './types';

/** User fields returned by the API (no secrets). */
export type PublicUser = Pick<
  User,
  'id' | 'email' | 'fullName' | 'roles' | 'preferredLanguage' | 'japaneseLevel' | 'emailVerified'
>;

export interface AuthService {
  login(input: LoginRequest): Promise<PublicUser>;
  register(input: RegisterRequest & { confirmPassword: string }): Promise<PublicUser>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(input: { token: string; password: string; confirmPassword: string }): Promise<void>;
  logout(): Promise<void>;
  getSession(): Promise<{ expiresAt: string; user: PublicUser } | null>;
}

/** Thrown when the auth backend is not available yet (HTTP 501). */
export class AuthNotAvailableError extends Error {
  constructor() {
    super('Authentication is not available yet.');
    this.name = 'AuthNotAvailableError';
  }
}

/** Thrown for any other auth failure (bad credentials, validation, network…). */
export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

export class HttpAuthService implements AuthService {
  constructor(
    private readonly baseUrl = '/api/auth',
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  private async request<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}/${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    if (res.status === 501) throw new AuthNotAvailableError();
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: { code?: string; message?: string };
    } & T;
    if (!res.ok) {
      throw new AuthRequestError(
        data.error?.message ?? 'Request failed',
        data.error?.code ?? 'unknown',
        res.status,
      );
    }
    return data;
  }

  login(input: LoginRequest) {
    return this.request<{ user: PublicUser }>('login', input).then((d) => d.user);
  }
  register(input: RegisterRequest & { confirmPassword: string }) {
    return this.request<{ user: PublicUser }>('register', input).then((d) => d.user);
  }
  async requestPasswordReset(email: string) {
    await this.request('forgot-password', { email });
  }
  async resetPassword(input: { token: string; password: string; confirmPassword: string }) {
    await this.request('reset-password', input);
  }
  async logout() {
    await this.request('logout', {});
  }
  async getSession() {
    try {
      return await this.request<{ session: { expiresAt: string; user: PublicUser } | null }>(
        'session',
        undefined,
        'GET',
      ).then((d) => d.session);
    } catch (error) {
      if (error instanceof AuthNotAvailableError) return null;
      throw error;
    }
  }
}

/** Default client used by the UI. */
export const authService: AuthService = new HttpAuthService();
