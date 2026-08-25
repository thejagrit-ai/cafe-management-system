import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: process.env.NODE_ENV === 'production' ? 3000 : 100000,
  },
  /**
   * Outbound email. Without a host configured the mailer prints messages to the
   * server log instead of sending them, so a development or demo deployment
   * still completes the verification flow - the link is simply read from the
   * console rather than an inbox.
   */
  mail: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.MAIL_FROM || 'The Coffee Bean <no-reply@localhost>',
  },
  emailVerification: {
    // A day is long enough for someone to find the mail without leaving a
    // usable link lying in an inbox for weeks.
    ttlMs: 24 * 60 * 60 * 1000,
    // Cheapest possible guard against someone hammering the resend endpoint.
    resendCooldownMs: 60 * 1000,
  },
  bcrypt: {
    // 12 rounds is the production cost. The test suite hashes many passwords
    // per run and does not need the work factor, so it is lowered there.
    rounds: process.env.NODE_ENV === 'test' ? 4 : 12,
  },
};