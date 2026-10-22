import { describe, expect, it } from 'vitest';
import {
  contactSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  validate,
  validationMessage,
} from '@/lib/validation/schemas';
import { en } from '@/i18n/en';
import { ar } from '@/i18n/ar';

const validContact = {
  name: 'Aya',
  email: 'aya@example.com',
  subject: 'Question about N5',
  message: 'Hello, I would like to know more about the N5 course.',
  locale: 'en',
};

describe('contact schema', () => {
  it('accepts a valid message', () => {
    expect(validate(contactSchema, validContact).success).toBe(true);
  });
  it('returns one error code per invalid field', () => {
    const result = validate(contactSchema, { name: ' ', email: 'nope', subject: 'Hi', message: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toMatchObject({
        name: 'required',
        email: 'email',
        subject: 'min:3',
        message: 'min:10',
      });
    }
  });
  it('flags the honeypot', () => {
    const result = validate(contactSchema, { ...validContact, website: 'http://spam' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.website).toBe('spam');
  });
  it('rejects oversized messages', () => {
    const result = validate(contactSchema, { ...validContact, message: 'x'.repeat(5001) });
    expect(result.success).toBe(false);
  });
});

describe('auth schemas', () => {
  const validRegister = {
    fullName: 'Youssef A.',
    email: 'y@example.com',
    password: 'sakura2026',
    confirmPassword: 'sakura2026',
    preferredLanguage: 'ar',
    japaneseLevel: 'unknown',
  };
  it('accepts a valid registration (incl. "I don\'t know" level)', () => {
    expect(validate(registerSchema, validRegister).success).toBe(true);
  });
  it('requires matching, reasonably strong passwords', () => {
    const weak = validate(registerSchema, {
      ...validRegister,
      password: 'abcdefgh',
      confirmPassword: 'abcdefgh',
    });
    expect(!weak.success && weak.errors.password).toBe('passwordStrength');
    const mismatch = validate(registerSchema, { ...validRegister, confirmPassword: 'other1234' });
    expect(!mismatch.success && mismatch.errors.confirmPassword).toBe('passwordMatch');
  });
  it('requires a language and a level', () => {
    const result = validate(registerSchema, { ...validRegister, preferredLanguage: '', japaneseLevel: 'n6' });
    expect(!result.success && result.errors).toMatchObject({
      preferredLanguage: 'selectOption',
      japaneseLevel: 'selectOption',
    });
  });
  it('validates login and forgot-password', () => {
    expect(validate(loginSchema, { email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(validate(loginSchema, { email: '', password: '' }).success).toBe(false);
    expect(validate(forgotPasswordSchema, { email: 'bad' }).success).toBe(false);
  });
});

describe('validationMessage()', () => {
  it('translates codes in both languages', () => {
    expect(validationMessage('min:10', en.validation)).toBe('Must be at least 10 characters.');
    expect(validationMessage('email', ar.validation)).toBe('أدخل بريدًا إلكترونيًا صالحًا.');
    expect(validationMessage('max:100', en.validation)).toBe('Must be at most 100 characters.');
  });
});
