/**
 * Error handling utilities.
 *
 * `HttpError` lets route handlers throw with an explicit status code and a
 * message that is safe to show the user. `notFound` and `errorHandler` are the
 * terminal Express middlewares.
 */
import { config } from '../config.js';

export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message user-safe message
   * @param {object} [details] optional extra fields for the client
   */
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

/** 404 handler for unmatched routes. */
export function notFound(req, res) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

/** Central error handler — must be registered last. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error('[error]', req.method, req.originalUrl, '-', err.message);
    if (!config.isProd) console.error(err.stack);
  }

  res.status(status).json({
    error: isServerError ? 'Internal server error' : err.message,
    ...(err.details ? { details: err.details } : {}),
    // Only leak stack traces in development.
    ...(!config.isProd && isServerError ? { stack: err.stack } : {}),
  });
}
