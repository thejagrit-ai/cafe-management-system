import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import productRoutes from './routes/product';
import categoryRoutes from './routes/category';
import ingredientRoutes from './routes/ingredient';
import recipeRoutes from './routes/recipe';
import orderRoutes from './routes/order';
import paymentRoutes from './routes/payment';
import employeeRoutes from './routes/employee';
import supplierRoutes from './routes/supplier';
import settingsRoutes from './routes/settings';
import customerRoutes from './routes/customer';
import reportRoutes from './routes/report';
import dashboardRoutes from './routes/dashboard';
import eventRoutes from './routes/events';
import loyaltyRoutes from './routes/loyalty';

const app = express();

// ---------------------------------------------------------------------------
// Detect whether the client has been built and is available to serve.
// In production single-service deploys (e.g. Render) the client build output
// lives at `../client/dist` relative to the server root.
// ---------------------------------------------------------------------------
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
const CLIENT_INDEX = path.join(CLIENT_DIST, 'index.html');
const hasClientBuild = fs.existsSync(CLIENT_INDEX);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // When serving the SPA we need inline scripts/styles from Vite's build to
  // work. In a two-service setup these headers don't matter for the API.
  contentSecurityPolicy: false,
}));

// gzip every JSON response. Menu, order and report payloads are highly
// repetitive text and shrink by roughly 80%, which is the difference between a
// snappy and a sluggish list on a phone connection.
app.use(compression({
  filter: (req, res) => {
    // Server-Sent Events must not be buffered: compressing the stream would
    // hold each event back until the buffer filled, stalling live order
    // notifications for kitchen and admin screens.
    if (req.path.startsWith('/api/events')) return false;
    if (res.getHeader('Content-Type') === 'text/event-stream') return false;
    return compression.filter(req, res);
  },
}));
const allowedOrigins = new Set([
  config.clientUrl,
  'https://cafe-management-systemm.onrender.com',
  'https://client-psi-six-59.vercel.app',
].filter(Boolean));

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { success: false, message: 'Too many requests, please try again later' },
  skip: () => config.nodeEnv !== 'production',
});
app.use('/api/', limiter);

// ── API routes ──────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is healthy', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// ── 404 for unknown API routes ──────────────────────────────────────────────
// This must come BEFORE the static-file / SPA fallback so that genuine API
// misses get a JSON 404 instead of the HTML index page.
app.all('/api/*', notFoundHandler);

// ── Static files + SPA fallback ─────────────────────────────────────────────
// When the client build is present (single-service deploy), serve its assets
// and fall back to index.html for any non-API route so React Router can
// handle client-side paths like /menu?table=1, /cart, /admin, etc.
if (hasClientBuild) {
  app.use(express.static(CLIENT_DIST, { maxAge: '1y', immutable: true }));

  // SPA fallback: every GET that didn't match an API route or a static file
  // receives the React shell so the client router can take over.
  app.get('*', (_req, res) => {
    res.sendFile(CLIENT_INDEX);
  });
} else {
  // Two-service / local-dev mode: the frontend is served separately.
  app.get('/', (_req, res) => {
    res.json({
      status: 'online',
      message: 'The Coffee Bean Cafe API is running live ☕',
      version: '1.0.0',
      health: '/api/health',
      timestamp: new Date().toISOString()
    });
  });

  app.use(notFoundHandler);
}

app.use(errorHandler);

export default app;