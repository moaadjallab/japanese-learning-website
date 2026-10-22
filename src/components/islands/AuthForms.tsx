/**
 * Login, Register and Forgot-password form islands.
 * Real client-side validation (shared Zod schemas), accessible errors, password visibility
 * toggle and loading states. Submissions go through `authService` (src/lib/auth/AuthService.ts),
 * which in V1 reports "not available" — the UI then shows a friendly notice. No fake sessions.
 */
import { useRef, useState, type SyntheticEvent } from 'react';
import { buttonClass } from '@/components/ui/styles';
import { authService, AuthNotAvailableError } from '@/lib/auth/AuthService';
import type { JapaneseLevel, PreferredLanguage } from '@/lib/auth/types';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
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
}

type Status = 'idle' | 'loading' | 'unavailable' | 'error';

/** Shared submit flow: validate → call service → map outcome to UI state. */
function useAuthForm<S extends z.ZodTypeAny>(schema: S, messages: ValidationMessages) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
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

  const submit = async (values: unknown, action: (data: z.infer<S>) => Promise<unknown>) => {
    attempted.current = true;
    const { data, errors: found } = check(values);
    setErrors(found);
    if (!data) {
      setStatus('error');
      const first = Object.keys(found)[0];
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setStatus('loading');
    try {
      await action(data);
      setStatus('idle');
    } catch (error) {
      setStatus(error instanceof AuthNotAvailableError ? 'unavailable' : 'error');
    }
  };

  return { errors, status, formRef, submit, revalidate };
}

function StatusAlert({
  status,
  labels,
  hasFieldErrors,
}: {
  status: Status;
  labels: AuthCommonLabels;
  hasFieldErrors: boolean;
}) {
  if (status === 'unavailable') {
    return (
      <FormAlert tone="info" title={labels.unavailableTitle}>
        <p>{labels.unavailableBody}</p>
        <a href={labels.contactHref} className="mt-2 inline-block font-semibold text-primary underline-offset-4 hover:underline">
          {labels.contactUs}
        </a>
      </FormAlert>
    );
  }
  if (status === 'error') {
    return <FormAlert tone="error">{hasFieldErrors ? labels.formErrors : labels.errorGeneric}</FormAlert>;
  }
  return null;
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button type="submit" disabled={loading} className={buttonClass('primary', 'lg', 'w-full')}>
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" aria-hidden="true" />
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
  const { errors, status, formRef, submit, revalidate } = useAuthForm(loginSchema, validation);
  const set = (k: keyof typeof values, v: string) => {
    const next = { ...values, [k]: v };
    setValues(next);
    revalidate(next);
  };
  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    void submit(values, (data) => authService.login(data));
  };
  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-5" aria-busy={status === 'loading'} data-testid="login-form">
      <StatusAlert status={status} labels={common} hasFieldErrors={Object.keys(errors).length > 0} />
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
          <a href={labels.forgotHref} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            {labels.forgot}
          </a>
        </div>
      </div>
      <SubmitButton loading={status === 'loading'} label={labels.submit} loadingLabel={common.loading} />
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
  const { errors, status, formRef, submit, revalidate } = useAuthForm(registerSchema, validation);
  const set = (k: keyof typeof values, v: string) => {
    const next = { ...values, [k]: v };
    setValues(next);
    revalidate(next);
  };
  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    void submit(values, ({ confirmPassword: _confirm, ...data }) => authService.register(data));
  };
  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-5" aria-busy={status === 'loading'} data-testid="register-form">
      <StatusAlert status={status} labels={common} hasFieldErrors={Object.keys(errors).length > 0} />
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
      <SubmitButton loading={status === 'loading'} label={labels.submit} loadingLabel={common.loading} />
    </form>
  );
}

/* ---------------------------------------------------------------- Forgot */

export function ForgotPasswordForm({
  labels,
  common,
  validation,
}: {
  labels: { email: string; submit: string };
  common: AuthCommonLabels;
  validation: ValidationMessages;
}) {
  const [email, setEmail] = useState('');
  const { errors, status, formRef, submit, revalidate } = useAuthForm(forgotPasswordSchema, validation);
  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    void submit({ email }, (data) => authService.requestPasswordReset(data.email));
  };
  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-5" aria-busy={status === 'loading'} data-testid="forgot-form">
      <StatusAlert status={status} labels={common} hasFieldErrors={Object.keys(errors).length > 0} />
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
      <SubmitButton loading={status === 'loading'} label={labels.submit} loadingLabel={common.loading} />
    </form>
  );
}
