/**
 * Contact form island. Client-side validation with the same Zod schema as the API,
 * accessible errors (aria-invalid + aria-describedby, focus on first error),
 * honeypot field, optional Cloudflare Turnstile widget, loading & result states.
 */
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { buttonClass } from '@/components/ui/styles';
import {
  contactSchema,
  validate,
  validationMessage,
  type ValidationMessages,
} from '@/lib/validation/schemas';
import { FormAlert, TextField, TextareaField } from './forms/fields';

export interface ContactFormLabels {
  name: string;
  email: string;
  subject: string;
  message: string;
  submit: string;
  sending: string;
  success: string;
  errorGeneric: string;
  errorRateLimit: string;
  errorCaptcha: string;
  errorUnavailable: string;
  captchaLabel: string;
  formErrors: string;
}

interface Props {
  locale: 'en' | 'ar';
  labels: ContactFormLabels;
  validation: ValidationMessages;
  /** Public Turnstile site key; when empty the widget is not rendered (local development). */
  turnstileSiteKey?: string;
  /** Pre-rendered privacy note (contains a link). */
  privacyNoteHtml: string;
}

type Field = 'name' | 'email' | 'subject' | 'message';
type Status =
  { kind: 'idle' } | { kind: 'sending' } | { kind: 'success' } | { kind: 'error'; message: string };

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const TURNSTILE_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';

export default function ContactForm({
  locale,
  labels,
  validation,
  turnstileSiteKey,
  privacyNoteHtml,
}: Props) {
  const [values, setValues] = useState<Record<Field, string>>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [token, setToken] = useState<string>('');
  const submitted = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  // Load Turnstile only on this page, only when configured.
  useEffect(() => {
    if (!turnstileSiteKey || !widgetRef.current) return;
    const render = () => {
      if (!window.turnstile || !widgetRef.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(widgetRef.current, {
        sitekey: turnstileSiteKey,
        language: locale,
        callback: (t: string) => setToken(t),
        'expired-callback': () => setToken(''),
        'error-callback': () => setToken(''),
      });
    };
    if (window.turnstile) render();
    else {
      window.onTurnstileLoad = render;
      if (!document.querySelector(`script[src^="https://challenges.cloudflare.com/turnstile"]`)) {
        const script = document.createElement('script');
        script.src = TURNSTILE_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  }, [turnstileSiteKey, locale]);

  const runValidation = (next: Record<Field, string>) => {
    const result = validate(contactSchema, { ...next, locale });
    if (result.success) return {};
    const out: Partial<Record<Field, string>> = {};
    for (const field of ['name', 'email', 'subject', 'message'] as const) {
      const code = result.errors[field];
      if (code) out[field] = validationMessage(code, validation);
    }
    return out;
  };

  const onChange = (field: Field, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    // Re-validate live only after the first submit attempt (less noisy while typing).
    if (submitted.current) setErrors(runValidation(next));
  };

  const onSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitted.current = true;
    const found = runValidation(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus({ kind: 'error', message: labels.formErrors });
      const first = (Object.keys(found) as Field[])[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (turnstileSiteKey && !token) {
      setStatus({ kind: 'error', message: labels.errorCaptcha });
      return;
    }

    setStatus({ kind: 'sending' });
    const honeypot = (formRef.current?.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, locale, turnstileToken: token || undefined, website: honeypot }),
      });
      if (res.ok) {
        setStatus({ kind: 'success' });
        setValues({ name: '', email: '', subject: '', message: '' });
        submitted.current = false;
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: { code?: string; fields?: Record<string, string> };
      } | null;
      const code = data?.error?.code;
      if (code === 'validation_error' && data?.error?.fields) {
        const fieldErrors: Partial<Record<Field, string>> = {};
        for (const [k, v] of Object.entries(data.error.fields)) {
          if (k in values) fieldErrors[k as Field] = validationMessage(v, validation);
        }
        setErrors(fieldErrors);
      }
      const message =
        code === 'rate_limited'
          ? labels.errorRateLimit
          : code === 'captcha_failed'
            ? labels.errorCaptcha
            : code === 'service_unavailable'
              ? labels.errorUnavailable
              : labels.errorGeneric;
      setStatus({ kind: 'error', message });
    } catch {
      setStatus({ kind: 'error', message: labels.errorGeneric });
    } finally {
      if (widgetId.current) {
        window.turnstile?.reset(widgetId.current);
        setToken('');
      }
    }
  };

  const sending = status.kind === 'sending';

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      className="space-y-5"
      aria-busy={sending}
      data-testid="contact-form"
    >
      {status.kind === 'success' && <FormAlert tone="success">{labels.success}</FormAlert>}
      {status.kind === 'error' && <FormAlert tone="error">{status.message}</FormAlert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="name"
          label={labels.name}
          autoComplete="name"
          required
          maxLength={100}
          value={values.name}
          error={errors.name}
          onChange={(e) => onChange('name', e.target.value)}
        />
        <TextField
          name="email"
          type="email"
          label={labels.email}
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          required
          maxLength={254}
          value={values.email}
          error={errors.email}
          onChange={(e) => onChange('email', e.target.value)}
        />
      </div>
      <TextField
        name="subject"
        label={labels.subject}
        required
        maxLength={150}
        value={values.subject}
        error={errors.subject}
        onChange={(e) => onChange('subject', e.target.value)}
      />
      <TextareaField
        name="message"
        label={labels.message}
        required
        rows={6}
        maxLength={5000}
        value={values.message}
        error={errors.message}
        onChange={(e) => onChange('message', e.target.value)}
      />

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {turnstileSiteKey && (
        <div ref={widgetRef} role="group" aria-label={labels.captchaLabel} className="min-h-[65px]" />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-fg-muted" dangerouslySetInnerHTML={{ __html: privacyNoteHtml }} />
        <button type="submit" disabled={sending} className={buttonClass('primary', 'lg', 'shrink-0')}>
          {sending && (
            <span
              className="size-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent"
              aria-hidden="true"
            />
          )}
          {sending ? labels.sending : labels.submit}
        </button>
      </div>
    </form>
  );
}
