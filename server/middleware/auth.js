/**
 * Authentication middleware.
 *
 * Extracts a JWT from the httpOnly cookie (preferred) or an
 * `Authorization: Bearer <token>` header, verifies it, and attaches the decoded
 * user to `req.user`.
 */
import { config } from '../config.js';
import { verifyToken } from '../utils/jwt.js';
import { HttpError } from './errorHandler.js';

function extractToken(req) {
  // 1. httpOnly cookie (set at login).
  if (req.cookies?.[config.jwt.cookieName]) {
    return req.cookies[config.jwt.cookieName];
  }
  // 2. Bearer header (for API/native clients).
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return null;
}

/** Hard guard: rejects the request when no valid session exists. */
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return next(new HttpError(401, 'Authentication required. Please sign in.'));
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    username: payload.username,
  };
  next();
}

/** Soft guard: attaches `req.user` when present but never rejects. */
export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (payload) {
    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
  next();
}
