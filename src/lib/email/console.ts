import type { EmailMessage, EmailProvider } from './types';

/** Development-only adapter: logs the message instead of sending it. Never used in production. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  async send(message: EmailMessage): Promise<void> {
    console.info('[email:dev] Would send email:', { ...message, text: message.text.slice(0, 500) });
  }
}
