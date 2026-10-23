/**
 * Login, Register, Forgot-password and Reset-password form islands.
 * Client-side validation (shared Zod schemas), accessible errors, password visibility toggle,
 * loading states. Submissions go through `authService` (src/lib/auth/AuthService.ts); the
 * session cookie is set by the server. When the backend is not configured (HTTP 501) the forms
 * show "Accounts are coming soon".
 */
import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { buttonClass } from '@/components/ui/styles';
import { authService, AuthNotAvailableError, AuthRequestError } from '@/lib/auth/AuthService';
import type { JapaneseLevel, PreferredLanguage } from '@/lib/auth/types';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  validate,
  validationMessage,
  type ValidationMessages,
} from '@/lib/validation/schemas';
import type { z } from 'zod';
import { FormAlert, PasswordField, SelectField, TextField } from './forms/fields';

export interface AuthCommonLabels {
  showPassword: string;
  hidePassword: string;
  unavailableTitle: string;
  unavailableBody: string;
  contactUs: string;
  contactHref: string;
  loading: string;
  formErrors: string;
  errorGeneric: string;
  errorInvalidCredentials: string;
  errorEmailTaken: string;
  errorRateLimited: string;
  /** Where to go after signing in / registering (unless a safe ?next= is present). */
  accountHref: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }
  | { kind: 'success' };

/** Map an API error to a user-facing message. */
const errorMessage = (error: unknown, labels: AuthCommonLabels): string => {
  if (error instanceof AuthRequestError) {
    if (error.code === 'invalid_credentials') return labels.errorInvalidCredentials;
    if (error.code === 'email_taken') return labels.errorEmailTaken;
    if (error.code === 'rate_limited') return labels.errorRateLimited;
  }
  return labels.errorGeneric;
};

/** Same-locale relative path from ?next=, or the account page. Prevents open redirects. */
const nextPath = (fallback: string): string => {
  const next = new URLSearchParams(window.location.search).get('next');
  const lang = fallback.split('/')[1];
  return next && next.startsWith(`/${lang}/`) && !next.startsWith('//') && !next.includes('\\')
    ? next
    : fallback;
};

/** Shared submit flow: validate → call service → map outcome to UI state. */
function useAuthForm<S extends z.ZodTypeAny>(
  schema: S,
  messages: ValidationMessages,
  labels: AuthCommonLabels,
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const formRef = useRef<HTMLFormElement>(null);
  const attempted = useRef(false);

  const check = (values: unknown) => {
    const result = validate(schema, values);
    if (result.success) return { data: result.data as z.infer<S>, errors: {} };
    const mapped: Record<string, string> = {};
    for (const [field, code] of Object.entries(result.errors)) {
      if (code) mapped[field] = validationMessage(code as string, messages);
    }
    return { data: null, errors: mapped };
  };

  const revalidate = (values: unknown) => {
    if (attempted.current) setErrors(check(values).errors);
  };

  /** `action` resolves to true when it handled navigation itself (keeps the loading state). */
  const submit = async (values: unknown, action: (data: z.infer<S>) => Promise<boolean | void>) => {
    attempted.current = true;
    const { data, errors: found } = check(values);
    setErrors(found);
    if (!data) {
      setStatus({ kind: 'error', message: labels.formErrors });
      const first = Object.keys(found)[0];
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setStatus({ kind: 'loading' });
    try {
      const navigating = await action(data);
      if (!navigating) setStatus({ kind: 'success' });
    } catch (error) {
      setStatus(
        error instanceof AuthNotAvailableError
          ? { kind: 'unavailable' }
          : { kind: 'error', message: errorMessage(error, labels) },
      );
    }
  };

  return { errors, status, formRef, submit, revalidate };
}

function StatusAlert({
  status,
  labels,
  success,
}: {
  status: Status;
  labels: AuthCommonLabels;
  success?: ReactNode;
}) {
  if (status.kind === 'unavailable') {
    return (
      <FormAlert tone="info" title={labels.unavailableTitle}>
        <p>{labels.unavailableBody}</p>
        <a
          href={labels.contactHref}
          className="mt-2 inline-block font-semibold text-primary underline-offset-4 hover:underline"
        >
          {labels.contactUs}
        </a>
      </FormAlert>
    );
  }
  if (status.kind === 'error') return <FormAlert tone="error">{status.message}</FormAlert>;
  if (status.kind === 'success' && success) return <FormAlert tone="success">{success}</FormAlert>;
  return null;
}

function SubmitButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button type="submit" disabled={loading} className={buttonClass('primary', 'lg', 'w-full')}>
      {loading && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent"
          aria-hidden="true"
        />
      )}
      {loading ? loadingLabel : label}
    </button>
  );
}

/* ------------------------------------------------------------------ Login */

export interface LoginLabels {
  email: string;
  password: string;
  submit: string;
  forgot: string;
  forgotHref: string;
}

export function LoginForm({
  labels,
  common,
  validation,
}: {
  labels: LoginLabels;
  common: AuthCommonLabels;
  validation: ValidationMessages;
}) {
  const [values, setValues] = useState({ email: '', password: '' });
  const { errors, status, formRef, submit, revalidate } = useAuthForm(loginSchema, validation, common);
  const set = (k: keyof typeof values, v: string) => {
    const next = { ...values, [k]: v };
    setValues(next);
    revalidate(next);
  };
  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    void submit(values, async (data) => {
      await authService.login(data);
      window.location.assign(nextPath(common.accountHref));
      return true;
    });
  };
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      className="space-y-5"
      aria-busy={status.kind === 'loading'}
      data-testid="login-form"
    >
      <StatusAlert status={status} labels={common} />
      <TextField
        name="email"
        type="email"
        label={labels.email}
        autoComplete="email"
        inputMode="email"
        dir="ltr"
        required
        value={values.email}
        error={errors.email}
        onChange={(e) => set('email', e.target.value)}
      />
      <div className="space-y-2">
        <PasswordField
          name="password"
          label={labels.password}
          autoComplete="current-password"
          required
          showLabel={common.showPassword}
          hideLabel={common.hidePassword}
          value={values.password}
          error={errors.password}
          onChange={(e) => set('password', e.target.value)}
        />
        <div className="text-end">
          <a
            href={labels.forgotHref}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {labels.forgot}
          </a>
        </div>
      </div>
      <SubmitButton loading={status.kind === 'loading'} label={labels.submit} loadingLabel={common.loading} />
    </form>
  );
}

/* --------------------------------------------------------------- Register */

export interface RegisterLabels {
  fullName: string;
  email: string;
  password: string;
  passwordHint: string;
  confirmPassword: string;
  preferredLanguage: string;
  languageOptions: { ar: string; en: string };
  japaneseLevel: string;
  chooseLevel: string;
  levels: { value: JapaneseLevel; label: string }[];
  submit: string;
  consentHtml: string;
}

export function RegisterForm({
  locale,
  labels,
  common,
  validation,
}: {
  locale: PreferredLanguage;
  labels: RegisterLabels;
  common: AuthCommonLabels;
  validation: ValidationMessages;
}) {
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    preferredLanguage: locale as string,
    japaneseLevel: '',
  });
  const { errors, status, formRef, submit, revalidate } = useAuthForm(registerSchema, validation, common);
  const set = (k: keyof typeof values, v: string) => {
    const next = { ...values, [k]: v };
    setValues(next);
    revalidate(next);
  };
  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    void submit(values, async (data) => {
      await authService.register(data);
      window.location.assign(nextPath(common.accountHref));
      return true;
    });
  };
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      className="space-y-5"
      aria-busy={status.kind === 'loading'}
      data-testid="register-form"
    >
      <StatusAlert status={status} labels={common} />
      <TextField
        name="fullName"
        label={labels.fullName}
        autoComplete="name"
        required
        maxLength={100}
        value={values.fullName}
        error={errors.fullName}
        onChange={(e) => set('fullName', e.target.value)}
      />
      <TextField
        name="email"
        type="email"
        label={labels.email}
        autoComplete="email"
        inputMode="email"
        dir="ltr"
        required
        value={values.email}
        error={errors.email}
        onChange={(e) => set('email', e.target.value)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordField
          name="password"
          label={labels.password}
          hint={labels.passwordHint}
          autoComplete="new-password"
          required
          showLabel={common.showPassword}
          hideLabel={common.hidePassword}
          value={values.password}
          error={errors.password}
          onChange={(e) => set('password', e.target.value)}
        />
        <PasswordField
          name="confirmPassword"
          label={labels.confirmPassword}
          autoComplete="new-password"
          required
          showLabel={common.showPassword}
          hideLabel={common.hidePassword}
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={(e) => set('confirmPassword', e.target.value)}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="preferredLanguage"
          label={labels.preferredLanguage}
          required
          options={[
            { value: 'ar', label: labels.languageOptions.ar },
            { value: 'en', label: labels.languageOptions.en },
          ]}
          value={values.preferredLanguage}
          error={errors.preferredLanguage}
          onChange={(e) => set('preferredLanguage', e.target.value)}
        />
        <SelectField
          name="japaneseLevel"
          label={labels.japaneseLevel}
          required
          placeholder={labels.chooseLevel}
          options={labels.levels}
          value={values.japaneseLevel}
          error={errors.japaneseLevel}
          onChange={(e) => set('japaneseLevel', e.target.value)}
        />
      </div>
      <p className="text-sm text-fg-muted" dangerouslySetInnerHTML={{ __html: labels.consentHtml }} />
      <SubmitButton loading={status.kind === 'loading'} label={labels.submit} loadingLabel={common.loading} />
    </form>
  );
}

/* ---------------------------------------------------------------- Forgot */

export function ForgotPasswordForm({
  labels,
  common,
  validation,
}: {
  labels: { email: string; submit: string; sent: string };
  common: AuthCommonLabels;
  validation: ValidationMessages;
}) {
  const [email, setEmail] = useState('');
  const { errors, status, formRef, submit, revalidate } = useAuthForm(
    forgotPasswordSchema,
    validation,
    common,
  );
  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    void submit({ email }, (data) => authService.requestPasswordReset(data.email));
  };
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      className="space-y-5"
      aria-busy={status.kind === 'loading'}
      data-testid="forgot-form"
    >
      <StatusAlert status={status} labels={common} success={labels.sent} />
      <TextField
        name="email"
        type="email"
        label={labels.email}
        autoComplete="email"
        inputMode="email"
        dir="ltr"
        required
        value={email}
        error={errors.email}
        onChange={(e) => {
          setEmail(e.target.value);
          revalidate({ email: e.target.value });
        }}
      />
      <SubmitButton loading={status.kind === 'loading'} label={labels.submit} loadingLabel={common.loading} />
    </form>
  );
}

/* ----------------------------------------------------------------- Reset */

export interface ResetPasswordLabels {
  password: string;
  passwordHint: string;
  confirmPassword: string;
  submit: string;
  success: string;
  invalidLink: string;
  requestNew: string;
  requestNewHref: string;
  login: string;
  loginHref: string;
}

export function ResetPasswordForm({
  labels,
  common,
  validation,
}: {
  labels: ResetPasswordLabels;
  common: AuthCommonLabels;
  validation: ValidationMessages;
}) {
  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [token, setToken] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const { errors, status, formRef, submit, revalidate } = useAuthForm(
    resetPasswordSchema,
    validation,
    common,
  );

  // Read the token after hydration; remove it from the address bar so it is not kept in history.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('token');
    setToken(value);
    if (!value) setInvalidLink(true);
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);

  const set = (k: keyof typeof values, v: string) => {
    const next = { ...values, [k]: v };
    setValues(next);
    revalidate({ ...next, token: token ?? '' });
  };
  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    void submit({ ...values, token: token ?? '' }, async (data) => {
      try {
        await authService.resetPassword(data);
      } catch (error) {
        if (error instanceof AuthRequestError && error.code === 'invalid_token') {
          setInvalidLink(true);
          return true;
        }
        throw error;
      }
    });
  };

  if (invalidLink) {
    return (
      <FormAlert tone="error" title={labels.invalidLink}>
        <a
          href={labels.requestNewHref}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {labels.requestNew}
        </a>
      </FormAlert>
    );
  }
  if (status.kind === 'success') {
    return (
      <div className="space-y-5" data-testid="reset-success">
        <FormAlert tone="success">{labels.success}</FormAlert>
        <a href={labels.loginHref} className={buttonClass('primary', 'lg', 'w-full')}>
          {labels.login}
        </a>
      </div>
    );
  }
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      className="space-y-5"
      aria-busy={status.kind === 'loading'}
      data-testid="reset-form"
    >
      <StatusAlert status={status} labels={common} />
      <PasswordField
        name="password"
        label={labels.password}
        hint={labels.passwordHint}
        autoComplete="new-password"
        required
        showLabel={common.showPassword}
        hideLabel={common.hidePassword}
        value={values.password}
        error={errors.password}
        onChange={(e) => set('password', e.target.value)}
      />
      <PasswordField
        name="confirmPassword"
        label={labels.confirmPassword}
        autoComplete="new-password"
        required
        showLabel={common.showPassword}
        hideLabel={common.hidePassword}
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChange={(e) => set('confirmPassword', e.target.value)}
      />
      <SubmitButton loading={status.kind === 'loading'} label={labels.submit} loadingLabel={common.loading} />
    </form>
  );
}
