// Tiny in-memory rate limiter: at most `max` requests per IP every `windowMs`.
// Good enough for one server in development. Protects the paid AI endpoint from spam.
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 10000) hits.clear(); // keep memory bounded

    const entry = hits.get(req.ip);
    if (!entry || now - entry.start > windowMs) {
      hits.set(req.ip, { start: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.start + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message: `${message} Try again in ${retryAfter} seconds.` });
    }
    next();
  };
}
