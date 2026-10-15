/**
 * Express application factory.
 *
 * Kept separate from `index.js` (which starts the listener) so the app can be
 * imported directly in tests or serverless adapters.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'node:path';

import { config } from './config.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import tmdbRoutes from './routes/tmdb.routes.js';
import aiRoutes from './routes/ai.routes.js';

export function createApp() {
  const app = express();

  // Behind a reverse proxy (Render/Vercel/Nginx) so rate limiting sees real IPs.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Security headers -----------------------------------------------------
  // CSP is set to allow the third-party embeds the player needs (Phase 2) while
  // still blocking obvious injection vectors. Adjust frame-src as providers change.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'img-src': [
            "'self'",
            'data:',
            'https://image.tmdb.org',
            'https://images.unsplash.com',
          ],
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
          // googlesyndication is included ONLY so the client-side ad-blocker
          // probe can distinguish "blocked by an extension" (a real ad blocker)
          // from "blocked by our own CSP" (a false positive).
          'connect-src': [
            "'self'",
            'https://text.pollinations.ai',
            'https://pagead2.googlesyndication.com',
          ],
          'frame-src': [
            "'self'",
            'https://cinesrc.st',
            'https://www.youtube.com',
            'https://www.youtube-nocookie.com',
          ],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // --- CORS -----------------------------------------------------------------
  // Same-origin by default; widen via ALLOWED_ORIGINS when needed.
  const origins = config.cors.allowedOrigins;
  app.use(
    cors({
      origin: origins.length ? origins : true,
      credentials: true,
    })
  );

  // --- Parsing & logging ----------------------------------------------------
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (!config.isProd) app.use(morgan('dev'));

  // --- API ------------------------------------------------------------------
  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/tmdb', tmdbRoutes);
  app.use('/api/ai', aiRoutes);

  // Lightweight health check for uptime monitors / load balancers.
  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      env: config.env,
      tmdbConfigured: Boolean(config.tmdb.apiKey || config.tmdb.accessToken),
      time: new Date().toISOString(),
    });
  });

  // --- Static frontend ------------------------------------------------------
  app.use(
    express.static(config.publicDir, {
      extensions: ['html'],
      maxAge: config.isProd ? '1h' : 0,
    })
  );

  // --- Fallbacks ------------------------------------------------------------
  app.use('/api', notFound); // unknown API route -> JSON 404
  // SPA-style fallback: serve index.html for any other GET.
  app.get('*', (req, res) => {
    res.sendFile(path.join(config.publicDir, 'index.html'));
  });
  app.use(errorHandler);

  return app;
}
