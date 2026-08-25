import { Router, Request, Response, NextFunction } from 'express';
import { eventHub } from '../utils/eventHub';
import { optionalAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * Accepts the access token as a query parameter, for this route only.
 *
 * The browser's `EventSource` cannot set request headers, so the Bearer token
 * the rest of the API is authenticated with never reaches this endpoint. That
 * left the stream falling back to the cookie — which a browser blocking
 * third-party cookies drops on a cross-origin deploy (the client is on Vercel
 * or the static site, the API on Render). The connection still opened, but
 * anonymously, so every role-targeted event was filtered out: low-stock
 * warnings and inventory refreshes silently stopped reaching admin and staff
 * screens in production while working perfectly in local development.
 */
const tokenFromQuery = (req: Request, _res: Response, next: NextFunction): void => {
  const token = typeof req.query.token === 'string' ? req.query.token : undefined;
  if (token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${token}`;
  }
  next();
};

router.get('/', tokenFromQuery, optionalAuth, (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userRole = authReq.user?.role;
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering for Nginx
  res.flushHeaders();

  // Send initial connection ACK
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

  eventHub.addClient(clientId, res, userRole);
});

export default router;
