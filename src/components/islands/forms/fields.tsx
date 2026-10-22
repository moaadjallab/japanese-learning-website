/**
 * React form primitives for islands. Same visuals as the Astro FormField/Input/Select.
 * Every control is linked to its label (htmlFor/id) and to hint + error (aria-describedby).
 */
import {
  useId,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from '@/components/icons/Icon';
import { errorClass, hintClass, inputClass, labelClass } from '@/components/ui/styles';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export const describedBy = (id: string, hint?: string, error?: string) =>
  [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;

export function FieldShell({ id, label, hint, error, required, children }: FieldShellProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && (
          <span aria-hidden="true" className="ms-0.5 text-primary">
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={errorClass}>
          <Icon name="alert" size={16} className="mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

type BaseProps = { label: string; hint?: string; error?: string; name: string };

export function TextField({
  label,
  hint,
  error,
  name,
  required,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = `${name}-${useId().replace(/:/g, '')}`;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <input
        id={id}
        name={name}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  name,
  required,
  ...rest
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = `${name}-${useId().replace(/:/g, '')}`;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        name={name}
        className={`${inputClass} min-h-36 resize-y`}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  name,
  required,
  options,
  placeholder,
  ...rest
}: BaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string }[];
    placeholder?: string;
  }) {
  const id = `${name}-${useId().replace(/:/g, '')}`;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        <select
          id={id}
          name={name}
          className={`${inputClass} appearance-none pe-11`}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={18}
          className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-fg-muted"
        />
      </div>
    </FieldShell>
  );
}

/** Password input with an accessible show/hide toggle. */
export function PasswordField({
  label,
  hint,
  error,
  name,
  required,
  showLabel,
  hideLabel,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement> & { showLabel: string; hideLabel: string }) {
  const id = `${name}-${useId().replace(/:/g, '')}`;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          className={`${inputClass} pe-12`}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute end-1.5 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:bg-stone-100 hover:text-fg"
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={20} />
        </button>
      </div>
    </FieldShell>
  );
}

/** Form-level status message (success / error / info), announced to assistive tech. */
export function FormAlert({
  tone,
  title,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    error: 'bg-sakura-soft text-vermilion-dark ring-sakura',
    success: 'bg-[#eef6f0] text-success ring-[#cfe5d6]',
    info: 'bg-stone-50 text-fg ring-line',
  }[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-xl p-4 text-sm ring-1 ${styles}`}
    >
      <Icon
        name={tone === 'success' ? 'check' : tone === 'error' ? 'alert' : 'info'}
        size={20}
        className="mt-0.5"
      />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-1' : ''}>{children}</div>
      </div>
    </div>
  );
}
