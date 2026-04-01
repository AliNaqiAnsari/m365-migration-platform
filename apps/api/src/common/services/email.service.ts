import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly fromAddress: string;
  private readonly frontendUrl: string;
  private readonly sendgridApiKey?: string;

  constructor(private config: ConfigService) {
    this.fromAddress = this.config.get('email.from') ?? 'noreply@m365migrate.com';
    this.frontendUrl = this.config.get('frontendUrl') ?? 'http://localhost:3000';
    this.sendgridApiKey = this.config.get('email.sendgridApiKey');
  }

  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password/${resetToken}`;
    await this.send({
      to: email,
      subject: 'Reset your password — M365 Migration Platform',
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `,
      text: `Password Reset\n\nVisit this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });
  }

  async sendInvitation(email: string, inviteToken: string, organizationName: string, inviterName: string): Promise<void> {
    const inviteUrl = `${this.frontendUrl}/invite/${inviteToken}`;
    await this.send({
      to: email,
      subject: `You've been invited to ${organizationName} — M365 Migration Platform`,
      html: `
        <h2>You're Invited</h2>
        <p>${inviterName} has invited you to join <strong>${organizationName}</strong> on the M365 Migration Platform.</p>
        <p><a href="${inviteUrl}">Accept Invitation</a></p>
        <p>This invitation expires in 7 days.</p>
      `,
      text: `${inviterName} invited you to join ${organizationName}.\n\nAccept here: ${inviteUrl}\n\nExpires in 7 days.`,
    });
  }

  private async send(options: EmailOptions): Promise<void> {
    if (this.sendgridApiKey) {
      await this.sendViaSendGrid(options);
    } else {
      // Console fallback — logs the email for dev/staging
      console.log(`[EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      console.log(`[EMAIL] Body: ${options.text ?? options.html.replace(/<[^>]*>/g, '')}`);
    }
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: this.fromAddress },
        subject: options.subject,
        content: [
          { type: 'text/plain', value: options.text ?? options.html.replace(/<[^>]*>/g, '') },
          { type: 'text/html', value: options.html },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[EMAIL] SendGrid error: ${response.status} ${body}`);
      throw new Error(`Failed to send email: ${response.status}`);
    }
  }
}
