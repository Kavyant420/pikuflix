/**
 * TMDB proxy routes.
 *
 * The browser never sees the TMDB key. Instead it calls these endpoints, which
 * validate the requested path against an allow-list before forwarding to TMDB.
 * This prevents the proxy from being abused to hit arbitrary URLs.
 */
import { Router } from 'express';
import { tmdbFetch, imageUrl } from '../services/tmdbService.js';
import { optionalAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * Allow-list of TMDB path patterns we are willing to proxy. Anything not
 * matching is rejected with 400 — no open proxy.
 */
const ALLOWED_PATTERNS = [
  /^\/trending\/(all|movie|tv)\/(day|week)$/,
  /^\/(movie|tv)\/(popular|top_rated|upcoming|now_playing|airing_today|on_the_air)$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/search\/(multi|movie|tv)$/,
  /^\/discover\/(movie|tv)$/,
  /^\/(movie|tv)\/\d+\/(credits|videos|recommendations|similar|images)$/,
  /^\/genre\/(movie|tv)\/list$/,
  /^\/configuration$/,
];

function isAllowed(pathname) {
  return ALLOWED_PATTERNS.some((re) => re.test(pathname));
}

/** GET /api/tmdb/*  → forwards to https://api.themoviedb.org/3/* */
router.get('/*', optionalAuth, async (req, res, next) => {
  try {
    const pathname = '/' + req.params[0];
    if (!isAllowed(pathname)) {
      throw new HttpError(400, `Endpoint not allowed: ${pathname}`);
    }

    // Forward a safe subset of query params.
    const params = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') params[k] = v;
    }

    const data = await tmdbFetch(pathname, params);

    // Decorate responses that contain a `results` array with ready-to-use
    // poster/backdrop URLs so the frontend stays simple.
    if (data && Array.isArray(data.results)) {
      data.results = data.results.map(decorate);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** Add image URLs to a TMDB object without mutating the original shape. */
function decorate(item) {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    poster_url: imageUrl(item.poster_path, 'w500'),
    backdrop_url: imageUrl(item.backdrop_path, 'w1280'),
    profile_url: imageUrl(item.profile_path, 'w185'),
  };
}

export default router;
