const { Locality } = require('../models');

// In-memory cache for localities to eliminate MongoDB Atlas network round-trips on every request
const localityCache = new Map();
let cachedDefault = null;
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

async function refreshLocalityCacheIfNeeded() {
  const now = Date.now();
  if (localityCache.size > 0 && now - lastCacheRefresh < CACHE_TTL_MS) {
    return;
  }
  try {
    const list = await Locality.find({ isActive: true }).lean();
    localityCache.clear();
    cachedDefault = null;
    for (const loc of list) {
      localityCache.set(loc._id.toString(), loc);
      if (loc.slug) localityCache.set(loc.slug.toLowerCase(), loc);
      if (loc.isDefault && !cachedDefault) cachedDefault = loc;
    }
    if (!cachedDefault && list.length > 0) {
      cachedDefault = list[0];
    }
    lastCacheRefresh = now;
  } catch {
    // If DB read fails, keep existing cache
  }
}

function invalidateLocalityCache() {
  localityCache.clear();
  cachedDefault = null;
  lastCacheRefresh = 0;
}

/**
 * Resolves the active locality / village for the request in ~0ms using in-memory cache:
 * 1. Checks 'x-locality-id' or 'x-locality-slug' HTTP header
 * 2. Checks '?locality=...' query param
 * 3. Checks authenticated req.user.locality
 * 4. Falls back to default locality ('Kudei Village')
 */
async function resolveLocality(req, res, next) {
  try {
    await refreshLocalityCacheIfNeeded();

    const rawId =
      req.headers['x-locality-id'] ||
      req.headers['x-locality-slug'] ||
      req.headers['x-locality'] ||
      req.query.locality;

    const identifier = typeof rawId === 'string' ? rawId.trim() : null;

    if (identifier && identifier !== 'all') {
      const loc = localityCache.get(identifier) || localityCache.get(identifier.toLowerCase());
      if (loc) {
        req.locality = loc;
        req.localityId = loc._id;
      }
    } else if (req.user && req.user.locality) {
      const userLocId = req.user.locality.toString();
      const loc = localityCache.get(userLocId);
      if (loc) {
        req.locality = loc;
        req.localityId = loc._id;
      } else {
        req.localityId = req.user.locality;
      }
    }

    // Default fallback if none matched
    if (!req.localityId && identifier !== 'all' && cachedDefault) {
      req.locality = cachedDefault;
      req.localityId = cachedDefault._id;
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveLocality, invalidateLocalityCache };
