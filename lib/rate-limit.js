const buckets = new Map();
let operations = 0;

function consumeRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const safeLimit = Math.max(1, Number(limit) || 1);
  const safeWindow = Math.max(1000, Number(windowMs) || 60000);
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + safeWindow };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  operations += 1;
  if (operations % 200 === 0) cleanupExpired(now);

  return {
    allowed: bucket.count <= safeLimit,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

function cleanupExpired(now = Date.now()) {
  for (const [key, bucket] of buckets.entries()) {
    if (!bucket || bucket.resetAt <= now) buckets.delete(key);
  }
}

function getClientIp(req) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const realIp = String(req?.headers?.['x-real-ip'] || '').trim();
  return forwarded || realIp || String(req?.socket?.remoteAddress || 'unknown');
}

function applyRateLimitHeaders(res, state) {
  if (!state) return;
  res.setHeader('RateLimit-Limit', String(state.limit));
  res.setHeader('RateLimit-Remaining', String(state.remaining));
  res.setHeader('RateLimit-Reset', String(Math.ceil(state.resetAt / 1000)));
  if (!state.allowed) res.setHeader('Retry-After', String(state.retryAfterSeconds));
}

module.exports = { consumeRateLimit, getClientIp, applyRateLimitHeaders };
