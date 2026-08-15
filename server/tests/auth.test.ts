import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/config/prisma';
import { api, auth, createUsers, tokenFor, CREDENTIALS } from './helpers';

describe('authentication', () => {
  beforeEach(async () => {
    await createUsers();
  });

  describe('login', () => {
    it('returns tokens and the user for valid credentials', async () => {
      const res = await api().post('/api/auth/login').send(CREDENTIALS.admin);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe(CREDENTIALS.admin.email);
      expect(res.body.data.user.role).toBe('ADMIN');
    });

    it('never exposes the password hash', async () => {
      const res = await api().post('/api/auth/login').send(CREDENTIALS.admin);

      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('rejects a wrong password with 401', async () => {
      const res = await api()
        .post('/api/auth/login')
        .send({ email: CREDENTIALS.admin.email, password: 'not-the-password' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects an unknown email with 401', async () => {
      const res = await api()
        .post('/api/auth/login')
        .send({ email: 'nobody@test.local', password: 'whatever123' });

      expect(res.status).toBe(401);
    });

    it('rejects a malformed email with 400', async () => {
      const res = await api()
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'whatever123' });

      expect(res.status).toBe(400);
    });

    it('refuses a deactivated account', async () => {
      await prisma.user.update({
        where: { email: CREDENTIALS.customer.email },
        data: { isActive: false },
      });

      const res = await api().post('/api/auth/login').send(CREDENTIALS.customer);

      expect(res.status).toBe(401);
    });

    it('records a LOGIN audit entry', async () => {
      await api().post('/api/auth/login').send(CREDENTIALS.admin);

      const logs = await prisma.auditLog.findMany({ where: { action: 'LOGIN' } });
      expect(logs).toHaveLength(1);
      expect(logs[0].entity).toBe('User');
    });
  });

  describe('registration', () => {
    it('creates a CUSTOMER account with a linked customer profile', async () => {
      const res = await api().post('/api/auth/register').send({
        email: 'new.person@test.local',
        password: 'strongpassword1',
        firstName: 'New',
        lastName: 'Person',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('CUSTOMER');

      const created = await prisma.user.findUnique({
        where: { email: 'new.person@test.local' },
        include: { customer: true },
      });
      expect(created?.customer?.firstName).toBe('New');
    });

    it('stores the password hashed, not in plain text', async () => {
      await api().post('/api/auth/register').send({
        email: 'hash.check@test.local',
        password: 'strongpassword1',
        firstName: 'Hash',
        lastName: 'Check',
      });

      const created = await prisma.user.findUniqueOrThrow({
        where: { email: 'hash.check@test.local' },
      });
      expect(created.passwordHash).not.toBe('strongpassword1');
      expect(created.passwordHash.startsWith('$2')).toBe(true);
    });

    it('rejects a duplicate email with 409', async () => {
      const res = await api().post('/api/auth/register').send({
        email: CREDENTIALS.customer.email,
        password: 'strongpassword1',
        firstName: 'Dupe',
        lastName: 'User',
      });

      expect(res.status).toBe(409);
    });

    it('rejects a short password with 400', async () => {
      const res = await api().post('/api/auth/register').send({
        email: 'short.pw@test.local',
        password: 'abc',
        firstName: 'Short',
        lastName: 'Pw',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('authorization', () => {
    it('rejects an unauthenticated request to a protected route with 401', async () => {
      const res = await api().get('/api/orders/pending');
      expect(res.status).toBe(401);
    });

    it('rejects a garbage token with 401', async () => {
      const res = await api().get('/api/orders/pending').set(auth('not-a-real-token'));
      expect(res.status).toBe(401);
    });

    it('allows STAFF onto staff-only routes', async () => {
      const token = await tokenFor('staff');
      const res = await api().get('/api/orders/pending').set(auth(token));
      expect(res.status).toBe(200);
    });

    it('allows ADMIN onto staff-only routes', async () => {
      const token = await tokenFor('admin');
      const res = await api().get('/api/orders/pending').set(auth(token));
      expect(res.status).toBe(200);
    });

    it('forbids CUSTOMER from staff-only routes with 403', async () => {
      const token = await tokenFor('customer');
      const res = await api().get('/api/orders/pending').set(auth(token));
      expect(res.status).toBe(403);
    });

    it('forbids CUSTOMER from creating products with 403', async () => {
      const token = await tokenFor('customer');
      const res = await api()
        .post('/api/products')
        .set(auth(token))
        .send({ name: 'Sneaky', price: 1, categoryId: 'x' });

      expect(res.status).toBe(403);
    });
  });
});
