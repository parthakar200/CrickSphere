const mcache = new Map();

/**
 * High-performance in-memory response cache for read-only GET endpoints.
 * Automatically partitioned by locality so different villages never see each other's data.
 */
function apiCache(durationSeconds = 30) {
  return (req, res, next) => {
    // Only cache GET requests that are not live scoring, auth, or health
    if (
      req.method !== 'GET' ||
      req.originalUrl.includes('/live') ||
      req.originalUrl.includes('/auth') ||
      req.originalUrl.includes('/health') ||
      req.query?.status === 'live' ||
      req.query?.noCache === 'true'
    ) {
      return next();
    }

    const localityKey = req.localityId ? req.localityId.toString() : 'global';
    const key = `__cache__${localityKey}__${req.originalUrl}`;
    const cached = mcache.get(key);

    if (cached && Date.now() < cached.expireAt) {
      res.set('X-Cache', 'HIT');
      res.set('Vary', 'X-Locality-Id, X-Locality-Slug, Authorization, Accept-Encoding');
      res.set('Cache-Control', 'no-cache, private');
      res.set('Content-Type', 'application/json; charset=utf-8');
      return res.send(cached.body);
    }

    const sendResponse = res.send.bind(res);
    res.send = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        mcache.set(key, {
          body,
          expireAt: Date.now() + durationSeconds * 1000,
        });
        res.set('Vary', 'X-Locality-Id, X-Locality-Slug, Authorization, Accept-Encoding');
        res.set('Cache-Control', 'no-cache, private');
      }
      res.set('X-Cache', 'MISS');
      return sendResponse(body);
    };

    next();
  };
}

/**
 * Middleware that automatically invalidates the GET cache whenever
 * any mutation (POST / PUT / PATCH / DELETE) succeeds.
 */
function autoInvalidateCache(req, res, next) {
  if (req.method !== 'GET') {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        clearApiCache();
      }
    });
  }
  next();
}

/**
 * Clears the in-memory cache when any data is created, updated, or deleted.
 */
function clearApiCache() {
  mcache.clear();
}

module.exports = { apiCache, autoInvalidateCache, clearApiCache };
