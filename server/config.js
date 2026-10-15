/**
 * Central configuration loader.
 *
 * Loads environment variables once, validates the critical ones, and exposes a
 * single frozen `config` object so the rest of the server never reads
 * `process.env` directly. This keeps secrets in one place and makes the app
 * easy to reason about and test.
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

/** Small helper: read a variable, optionally require it. */
function read(name, { required = false, fallback = undefined } = {}) {
  const value = process.env[name];
  if ((value === undefined || value === '') && required) {
    // Fail fast and loudly — a missing secret should never reach runtime.
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy .env.example to .env and set it.`
    );
  }
  return value === undefined || value === '' ? fallback : value;
}

export const config = Object.freeze({
  env,
  isProd,
  port: Number(read('PORT', { fallback: 3000 })),

  root: ROOT,
  publicDir: path.join(ROOT, 'public'),
  dataDir: path.join(ROOT, 'data'),

  jwt: {
    // A weak secret is a critical vulnerability. In production we refuse to boot
    // without one; in development we fall back to a clearly-marked dev value.
    secret: read('JWT_SECRET', {
      required: isProd,
      fallback: 'dev-only-insecure-secret-change-me',
    }),
    expiresIn: read('JWT_EXPIRES_IN', { fallback: '7d' }),
    cookieName: 'pikuflix_token',
  },

  tmdb: {
    apiKey: read('TMDB_API_KEY', { fallback: '' }),
    accessToken: read('TMDB_ACCESS_TOKEN', { fallback: '' }),
    baseUrl: 'https://api.themoviedb.org/3',
    imageBase: 'https://image.tmdb.org/t/p',
  },

  ai: {
    baseUrl: read('POLLINATIONS_BASE_URL', {
      fallback: 'https://text.pollinations.ai',
    }),
  },

  cinesrc: {
    baseUrl: read('CINESRC_BASE_URL', { fallback: 'https://cinesrc.st' }),
  },

  cors: {
    // Same-origin in production unless explicitly widened.
    allowedOrigins: read('ALLOWED_ORIGINS', { fallback: '' })
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
});

/** Warn (don't crash) about non-fatal misconfiguration at boot. */
export function warnAboutConfig() {
  if (!config.tmdb.apiKey && !config.tmdb.accessToken) {
    console.warn(
      '[config] TMDB_API_KEY is not set — catalog endpoints will return 503.'
    );
  }
  if (!isProd && config.jwt.secret === 'dev-only-insecure-secret-change-me') {
    console.warn(
      '[config] Using the insecure development JWT secret. Set JWT_SECRET in .env.'
    );
  }
}
