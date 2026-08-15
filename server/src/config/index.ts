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
  bcrypt: {
    // 12 rounds is the production cost. The test suite hashes many passwords
    // per run and does not need the work factor, so it is lowered there.
    rounds: process.env.NODE_ENV === 'test' ? 4 : 12,
  },
};