import { Router, Request, Response } from 'express';
import { eventHub } from '../utils/eventHub';
import { optionalAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', optionalAuth, (req: Request, res: Response) => {
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
