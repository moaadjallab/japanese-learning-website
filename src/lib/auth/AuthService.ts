/**
 * AuthService — the only API the UI uses for authentication.
 *
 * V1 ships `HttpAuthService`, which calls /api/auth/* endpoints that currently answer
 * 501 Not Implemented. The UI turns that into a friendly "accounts are coming soon" message.
 * There are NO fake sessions: nothing is stored, nobody is "logged in".
 *
 * V2: implement the endpoints (see AUTH_PLAN.md); this client stays the same.
 */
import type { LoginRequest, RegisterRequest, Session, User } from './types';

export interface AuthService {
  login(input: LoginRequest): Promise<Session>;
  register(input: RegisterRequest): Promise<User>;
  requestPasswordReset(email: string): Promise<void>;
  logout(): Promise<void>;
  getSession(): Promise<Session | null>;
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
    return this.request<{ session: Session }>('login', input).then((d) => d.session);
  }
  register(input: RegisterRequest) {
    return this.request<{ user: User }>('register', input).then((d) => d.user);
  }
  async requestPasswordReset(email: string) {
    await this.request('forgot-password', { email });
  }
  async logout() {
    await this.request('logout');
  }
  async getSession() {
    try {
      return await this.request<{ session: Session | null }>('session', undefined, 'GET').then(
        (d) => d.session,
      );
    } catch (error) {
      if (error instanceof AuthNotAvailableError) return null;
      throw error;
    }
  }
}

/** Default client used by the UI. */
export const authService: AuthService = new HttpAuthService();
