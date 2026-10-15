/**
 * AI assistant proxy (Pollinations).
 *
 * The floating assistant widget talks to this route instead of calling
 * text.pollinations.ai directly. Benefits: a single place to add a system
 * prompt, rate limiting, and future provider swaps — and it keeps the browser
 * free of third-party CORS surprises.
 */
import { Router } from 'express';
import { config } from '../config.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireString } from '../utils/validate.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

const SYSTEM_PROMPT = `You are "Piku", the friendly assistant for PikuFlix, a movie
and TV streaming site. Help users discover titles, give short spoiler-free
recommendations, explain genres, and answer general questions. Keep answers
concise (2-4 sentences), warm, and practical. When recommending, suggest 2-3
titles with the year. Never invent streaming links.`;

router.post('/chat', optionalAuth, async (req, res, next) => {
  try {
    const message = requireString(req.body?.message, 'message', {
      min: 1,
      max: 2000,
    });

    // Build a compact conversation. `history` is optional: [{role, content}].
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const trimmedHistory = history
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string'
      )
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...trimmedHistory,
      { role: 'user', content: message },
    ];

    const url = `${config.ai.baseUrl}/openai`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let reply;
    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai', messages }),
        signal: controller.signal,
      });

      if (!upstream.ok) {
        throw new HttpError(502, `AI provider error (${upstream.status}).`);
      }

      const contentType = upstream.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await upstream.json();
        reply =
          data?.choices?.[0]?.message?.content ??
          data?.content ??
          (typeof data === 'string' ? data : '');
      } else {
        reply = await upstream.text();
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!reply || !reply.trim()) {
      throw new HttpError(502, 'The assistant returned an empty response.');
    }

    res.json({ reply: reply.trim() });
  } catch (err) {
    if (err.name === 'AbortError') {
      return next(new HttpError(504, 'The assistant timed out. Try again.'));
    }
    next(err);
  }
});

export default router;
