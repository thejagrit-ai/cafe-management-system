import crypto from 'node:crypto';
import { config } from '../config';
import { mailer } from '../utils/mailer';
import { BadRequestError, NotFoundError } from '../utils/errors';
import prisma from '../config/prisma';

/**
 * Proves a new account owns the address it registered with.
 *
 * The `emailVerified` column existed from the start but nothing ever set it:
 * anyone could sign up with an address belonging to someone else. This issues a
 * single-use link, checks it, and flips the flag.
 */
export class EmailVerificationService {
  /** Tokens are compared by hash, so only the digest is ever stored. */
  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private buildLink(token: string): string {
    return `${config.clientUrl.replace(/\/+$/, '')}/verify-email?token=${token}`;
  }

  /**
   * Issues a fresh link for a user and emails it.
   *
   * Any link issued earlier is consumed first, so a forwarded older email
   * cannot be used once a newer one has been requested.
   */
  async issue(userId: string): Promise<{ sent: boolean }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (user.emailVerified) {
      throw new BadRequestError('This address has already been verified.');
    }

    const recent = await prisma.emailVerificationToken.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (
      recent &&
      Date.now() - recent.createdAt.getTime() < config.emailVerification.resendCooldownMs
    ) {
      throw new BadRequestError(
        'A verification email was just sent. Please wait a moment before asking for another.'
      );
    }

    // 32 random bytes: long enough that guessing is not a concern, and URL-safe
    // so it survives being pasted out of an email client.
    const token = crypto.randomBytes(32).toString('base64url');

    await prisma.$transaction([
      // Retire outstanding links before minting a new one.
      prisma.emailVerificationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.emailVerificationToken.create({
        data: {
          tokenHash: this.hash(token),
          userId,
          expiresAt: new Date(Date.now() + config.emailVerification.ttlMs),
        },
      }),
    ]);

    const link = this.buildLink(token);

    await mailer.send({
      to: user.email,
      subject: 'Confirm your email address',
      text: [
        'Welcome to The Coffee Bean.',
        '',
        'Confirm your email address by opening the link below:',
        link,
        '',
        'The link is valid for 24 hours and can be used once.',
        'If you did not create this account you can ignore this message.',
      ].join('\n'),
      html: [
        '<p>Welcome to The Coffee Bean.</p>',
        '<p>Confirm your email address by opening the link below:</p>',
        `<p><a href="${link}">Confirm my email address</a></p>`,
        '<p>The link is valid for 24 hours and can be used once.</p>',
        '<p>If you did not create this account you can ignore this message.</p>',
      ].join(''),
    });

    return { sent: mailer.isConfigured };
  }

  /**
   * Issues a link without letting a failure break the caller.
   *
   * Registration must not fail because the mail server is unreachable — the
   * account is created either way and the customer can ask for another link.
   */
  async issueQuietly(userId: string): Promise<void> {
    try {
      await this.issue(userId);
    } catch (error) {
      console.error('Could not send the verification email:', error);
    }
  }

  /** Consumes a link and marks the address verified. */
  async verify(token: string): Promise<{ email: string }> {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { user: true },
    });

    // One message for every failure: a caller probing tokens learns nothing
    // about which ones exist.
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestError('This verification link is invalid or has expired.');
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
    ]);

    return { email: record.user.email };
  }
}

export const emailVerificationService = new EmailVerificationService();
