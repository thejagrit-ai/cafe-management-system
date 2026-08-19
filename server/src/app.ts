import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
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

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
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
app.use(cors({
  origin: true,
  credentials: true,
}));
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

app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    message: 'The Coffee Bean Cafe API is running live ☕',
    version: '1.0.0',
    health: '/api/health',
    timestamp: new Date().toISOString()
  });
});

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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;