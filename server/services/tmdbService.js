/**
 * TMDB service.
 *
 * All TMDB calls happen server-side so the API key never reaches the browser.
 * We support both the v3 `api_key` query param and the v4 Bearer token, and we
 * add a tiny in-memory cache to reduce upstream traffic and latency.
 */
import { config } from '../config.js';
import { HttpError } from '../middleware/errorHandler.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map(); // key -> { data, expires }

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) if (now > v.expires) cache.delete(k);
  }
}

function assertConfigured() {
  if (!config.tmdb.apiKey && !config.tmdb.accessToken) {
    throw new HttpError(
      503,
      'Catalog is not configured. Set TMDB_API_KEY on the server.'
    );
  }
}

/**
 * Fetch a TMDB endpoint (e.g. "/trending/all/week").
 * @param {string} endpoint path beginning with "/"
 * @param {Record<string,string|number>} [params]
 */
export async function tmdbFetch(endpoint, params = {}) {
  assertConfigured();

  const url = new URL(config.tmdb.baseUrl + endpoint);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  url.searchParams.set('language', 'en-US');

  const headers = { Accept: 'application/json' };
  if (config.tmdb.accessToken) {
    // v4 token takes precedence and is sent as a Bearer header.
    headers.Authorization = `Bearer ${config.tmdb.accessToken}`;
  } else {
    url.searchParams.set('api_key', config.tmdb.apiKey);
  }

  const key = url.toString();
  const cached = cacheGet(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      throw new HttpError(
        res.status === 404 ? 404 : 502,
        `TMDB request failed (${res.status}).`
      );
    }
    const data = await res.json();
    cacheSet(key, data);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new HttpError(504, 'TMDB request timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/** Convenience: build a full image URL from a TMDB path. */
export function imageUrl(filePath, size = 'w500') {
  if (!filePath) return null;
  return `${config.tmdb.imageBase}/${size}${filePath}`;
}
