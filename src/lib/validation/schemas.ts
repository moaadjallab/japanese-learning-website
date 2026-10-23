/**
 * Validation schemas shared by the browser (React islands) and the server (API routes).
 * Error messages are *codes* (e.g. "required", "min:2") translated with `validationMessage()`,
 * so the same schema serves both locales.
 */
import { z } from 'zod';
import { LEVEL_IDS } from '@/lib/domain/types';

export const REGISTER_LEVEL_IDS = [...LEVEL_IDS, 'unknown'] as const;

const requiredString = (min: number, max: number) =>
  z
    .string({ required_error: 'required', invalid_type_error: 'required' })
    .trim()
    .min(1, 'required')
    .min(min, `min:${min}`)
    .max(max, `max:${max}`);

const email = z
  .string({ required_error: 'required' })
  .trim()
  .min(1, 'required')
  .max(254, 'max:254')
  .email('email');

/** At least 8 chars with one letter and one digit (V1 policy; see AUTH_PLAN.md). */
const strongPassword = z
  .string({ required_error: 'required' })
  .min(1, 'required')
  .min(8, 'passwordStrength')
  .max(128, 'max:128')
  .refine((v) => /\p{L}/u.test(v) && /\d/.test(v), 'passwordStrength');

export const contactSchema = z.object({
  name: requiredString(2, 100),
  email,
  subject: requiredString(3, 150),
  message: requiredString(10, 5000),
  locale: z.enum(['en', 'ar']).default('en'),
  /** Cloudflare Turnstile response token (verified server-side). */
  turnstileToken: z.string().max(4096).optional(),
  /** Honeypot: real users never fill this hidden field. */
  website: z.string().max(0, 'spam').optional().default(''),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'required' }).min(1, 'required').max(128, 'max:128'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: requiredString(2, 100),
    email,
    password: strongPassword,
    confirmPassword: z.string({ required_error: 'required' }).min(1, 'required'),
    preferredLanguage: z.enum(['ar', 'en'], { errorMap: () => ({ message: 'selectOption' }) }),
    japaneseLevel: z.enum(REGISTER_LEVEL_IDS, { errorMap: () => ({ message: 'selectOption' }) }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'passwordMatch',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, 'required').max(200, 'required'),
    password: strongPassword,
    confirmPassword: z.string({ required_error: 'required' }).min(1, 'required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'passwordMatch',
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** One-time token sent by email (verification, password reset). */
export const tokenSchema = z.object({ token: z.string().min(20).max(200) });

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

/** Validate `data` and return either the parsed value or the first error code per field. */
export const validate = <S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
): { success: true; data: z.infer<S> } | { success: false; errors: FieldErrors<z.input<S>> } => {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { success: false, errors: errors as FieldErrors<z.input<S>> };
};

export interface ValidationMessages {
  required: string;
  email: string;
  minLength: string;
  maxLength: string;
  passwordStrength: string;
  passwordMatch: string;
  selectOption: string;
}

/** Translate an error code into a localized message. */
export const validationMessage = (code: string, messages: ValidationMessages): string => {
  const [kind, arg] = code.split(':');
  switch (kind) {
    case 'required':
      return messages.required;
    case 'email':
      return messages.email;
    case 'min':
      return messages.minLength.replace('{min}', arg ?? '');
    case 'max':
      return messages.maxLength.replace('{max}', arg ?? '');
    case 'passwordStrength':
      return messages.passwordStrength;
    case 'passwordMatch':
      return messages.passwordMatch;
    case 'selectOption':
      return messages.selectOption;
    default:
      return messages.required;
  }
};
