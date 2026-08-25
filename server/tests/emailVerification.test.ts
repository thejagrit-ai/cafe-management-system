import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/config/prisma';
import { mailer } from '../src/utils/mailer';
import { api, auth, createUsers, tokenFor, CREDENTIALS } from './helpers';

/**
 * `users.emailVerified` existed from the first migration but nothing ever set
 * it: anyone could register with an address belonging to someone else and the
 * column sat at `false` forever. These cover the flow that now backs it.
 */
describe('email verification', () => {
  const NEW_ACCOUNT = {
    email: 'newcomer@test.local',
    password: 'newcomer12345',
    firstName: 'Nina',
    lastName: 'Newcomer',
  };

  /** The token only exists in the email body, so it is read back from there. */
  function tokenFromLastEmail(): string {
    const message = mailer.outbox[mailer.outbox.length - 1];
    const match = message?.text.match(/verify-email\?token=([\w-]+)/);
    if (!match) throw new Error('no verification link in the last email');
    return match[1];
  }

  beforeEach(async () => {
    await createUsers();
    mailer.outbox.length = 0;
  });

  describe('on registration', () => {
    it('creates the account unverified and emails a link', async () => {
      const res = await api().post('/api/auth/register').send(NEW_ACCOUNT);

      expect(res.status).toBe(201);
      expect(res.body.data.user.emailVerified).toBe(false);

      expect(mailer.outbox).toHaveLength(1);
      expect(mailer.outbox[0].to).toBe(NEW_ACCOUNT.email);
      expect(mailer.outbox[0].text).toContain('/verify-email?token=');
    });

    it('stores only a hash of the token, never the token itself', async () => {
      await api().post('/api/auth/register').send(NEW_ACCOUNT);
      const token = tokenFromLastEmail();

      const stored = await prisma.emailVerificationToken.findFirstOrThrow({});
      expect(stored.tokenHash).not.toBe(token);
      expect(stored.tokenHash).toHaveLength(64); // sha256 hex
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('marks the address verified when the link is followed', async () => {
      await api().post('/api/auth/register').send(NEW_ACCOUNT);
      const token = tokenFromLastEmail();

      const res = await api().post('/api/auth/verify-email').send({ token });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(NEW_ACCOUNT.email);

      const user = await prisma.user.findUniqueOrThrow({
        where: { email: NEW_ACCOUNT.email },
      });
      expect(user.emailVerified).toBe(true);
    });

    it('refuses a token that has already been used', async () => {
      await api().post('/api/auth/register').send(NEW_ACCOUNT);
      const token = tokenFromLastEmail();

      const first = await api().post('/api/auth/verify-email').send({ token });
      expect(first.status).toBe(200);

      const second = await api().post('/api/auth/verify-email').send({ token });
      expect(second.status).toBe(400);
    });

    it('refuses a token that has expired', async () => {
      await api().post('/api/auth/register').send(NEW_ACCOUNT);
      const token = tokenFromLastEmail();

      await prisma.emailVerificationToken.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const res = await api().post('/api/auth/verify-email').send({ token });

      expect(res.status).toBe(400);
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: NEW_ACCOUNT.email },
      });
      expect(user.emailVerified).toBe(false);
    });

    it('refuses a token nobody issued', async () => {
      const res = await api()
        .post('/api/auth/verify-email')
        .send({ token: 'a-token-that-was-never-issued' });

      expect(res.status).toBe(400);
    });

    it('rejects an empty token with 400', async () => {
      const res = await api().post('/api/auth/verify-email').send({ token: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    /** Bypasses the resend cooldown by ageing the outstanding token. */
    async function ageOutstandingToken() {
      await prisma.emailVerificationToken.updateMany({
        where: { usedAt: null },
        data: { createdAt: new Date(Date.now() - 10 * 60 * 1000) },
      });
    }

    it('sends a fresh link and retires the previous one', async () => {
      const registration = await api().post('/api/auth/register').send(NEW_ACCOUNT);
      const firstToken = tokenFromLastEmail();
      const token = registration.body.data.tokens.accessToken;

      await ageOutstandingToken();

      const res = await api().post('/api/auth/resend-verification').set(auth(token));
      expect(res.status).toBe(200);

      const secondToken = tokenFromLastEmail();
      expect(secondToken).not.toBe(firstToken);

      // The superseded link must no longer work.
      const stale = await api().post('/api/auth/verify-email').send({ token: firstToken });
      expect(stale.status).toBe(400);

      const fresh = await api().post('/api/auth/verify-email').send({ token: secondToken });
      expect(fresh.status).toBe(200);
    });

    it('refuses a second request inside the cooldown', async () => {
      const registration = await api().post('/api/auth/register').send(NEW_ACCOUNT);
      const token = registration.body.data.tokens.accessToken;

      const res = await api().post('/api/auth/resend-verification').set(auth(token));

      expect(res.status).toBe(400);
    });

    it('refuses once the address is already verified', async () => {
      const registration = await api().post('/api/auth/register').send(NEW_ACCOUNT);
      const accessToken = registration.body.data.tokens.accessToken;
      await api().post('/api/auth/verify-email').send({ token: tokenFromLastEmail() });

      await ageOutstandingToken();

      const res = await api().post('/api/auth/resend-verification').set(auth(accessToken));

      expect(res.status).toBe(400);
    });

    it('refuses an anonymous caller with 401', async () => {
      const res = await api().post('/api/auth/resend-verification');

      expect(res.status).toBe(401);
    });
  });

  it('leaves an existing verified account alone', async () => {
    // The seeded users are created directly, so they hold no tokens and the
    // verification flow must not touch them.
    const token = await tokenFor('admin');
    const res = await api().get('/api/auth/me').set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(CREDENTIALS.admin.email);
    expect(await prisma.emailVerificationToken.count()).toBe(0);
  });
});
