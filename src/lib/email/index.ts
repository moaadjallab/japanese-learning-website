/**
 * Pick the email provider from configuration.
 * - RESEND_API_KEY set → Resend
 * - otherwise, in development → console logger
 * - otherwise → null (the API answers 503 instead of pretending to send)
 * To use another provider (e.g. MailChannels, Amazon SES), add an adapter implementing EmailProvider.
 */
import { ConsoleEmailProvider } from './console';
import { ResendEmailProvider } from './resend';
import type { EmailProvider } from './types';

export * from './types';

export const getEmailProvider = (config: { resendApiKey?: string; isDev: boolean }): EmailProvider | null => {
  if (config.resendApiKey) return new ResendEmailProvider(config.resendApiKey);
  if (config.isDev) return new ConsoleEmailProvider();
  return null;
};

/** Escape user input before placing it in HTML email bodies. */
export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
