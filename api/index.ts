/**
 * Vercel serverless entry point for the Express API.
 *
 * `vercel.json` rewrites every `/api/*` request here, and Vercel preserves the
 * original path on `req.url`, so the app's own `/api/...` routes match exactly
 * as they do when it runs as a long-lived server on Render.
 *
 * Note: the SPA is served by Vercel's CDN from `client/dist`, so `app.ts`
 * correctly detects no client build next to the function and behaves as an
 * API-only app here.
 */
import app from '../server/src/app';

export default app;
