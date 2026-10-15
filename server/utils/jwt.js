/**
 * JWT helpers.
 *
 * We sign short-lived access tokens and deliver them to the browser inside an
 * httpOnly cookie (see auth.routes.js). Bearer tokens are also accepted so the
 * API can be consumed by native clients or scripts.
 */
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Sign a token for a user. Only non-sensitive claims are embedded.
 * @param {{id:string,email:string,username:string}} user
 * @returns {string}
 */
export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn, issuer: 'pikuflix' }
  );
}

/**
 * Verify a token and return its payload, or `null` when invalid/expired.
 * @param {string} token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret, { issuer: 'pikuflix' });
  } catch {
    return null;
  }
}

/** Cookie options for the auth token (secure in production). */
export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}
