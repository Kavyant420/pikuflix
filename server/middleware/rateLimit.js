/**
 * Rate limiters.
 *
 * A generous global limiter plus a strict limiter for credential endpoints to
 * blunt brute-force / credential-stuffing attempts.
 */
import rateLimit from 'express-rate-limit';

const jsonHandler = (message) => (req, res) => {
  res.status(429).json({ error: message });
};

/** Global limiter applied to the whole API surface. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many requests. Please slow down.'),
});

/** Stricter limiter for login/signup. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler(
    'Too many authentication attempts. Please try again later.'
  ),
});
