/**
 * Authentication routes.
 *
 *   POST /api/auth/signup  — create an account, start a session
 *   POST /api/auth/login   — verify credentials, start a session
 *   POST /api/auth/logout  — clear the session cookie
 *   GET  /api/auth/me      — return the current user (or 401)
 *   PATCH /api/auth/prefs  — update UI preferences (e.g. ad-block banner seen)
 *
 * Sessions are delivered as an httpOnly cookie. A Bearer token is also returned
 * in the JSON body so non-browser clients can use the API.
 */
import { Router } from 'express';
import { userStore } from '../services/userStore.js';
import { signToken, cookieOptions } from '../utils/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  requireEmail,
  requireUsername,
  requirePassword,
} from '../utils/validate.js';
import { config } from '../config.js';

const router = Router();

/** Attach the session cookie and shape the JSON response. */
function startSession(res, user) {
  const token = signToken(user);
  res.cookie(config.jwt.cookieName, token, cookieOptions());
  return { user, token };
}

router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const email = requireEmail(req.body?.email);
    const username = requireUsername(req.body?.username);
    const password = requirePassword(req.body?.password);

    const user = await userStore.createUser({ email, username, password });
    const { token } = startSession(res, user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === 'EMAIL_TAKEN') {
      return next(new HttpError(409, 'That email is already registered.'));
    }
    if (err.code === 'USERNAME_TAKEN') {
      return next(new HttpError(409, 'That username is already taken.'));
    }
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = requireEmail(req.body?.email);
    const password = requirePassword(req.body?.password);

    const user = await userStore.verifyCredentials(email, password);
    if (!user) {
      // Deliberately generic to avoid leaking which field was wrong.
      throw new HttpError(401, 'Incorrect email or password.');
    }
    const { token } = startSession(res, user);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(config.jwt.cookieName, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await userStore.findById(req.user.id);
    if (!user) throw new HttpError(401, 'Session no longer valid.');
    res.json({ user: userStore.toPublic(user) });
  } catch (err) {
    next(err);
  }
});

router.patch('/prefs', requireAuth, async (req, res, next) => {
  try {
    const allowed = ['adBlockNoticeSeen', 'theme'];
    const patch = {};
    for (const key of allowed) {
      if (key in (req.body || {})) patch[key] = req.body[key];
    }
    const user = await userStore.updatePrefs(req.user.id, patch);
    if (!user) throw new HttpError(404, 'User not found.');
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
