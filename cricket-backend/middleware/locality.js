const { Locality } = require('../models');

/**
 * Resolves the active locality / village for the request:
 * 1. Checks 'x-locality-id' or 'x-locality-slug' HTTP header
 * 2. Checks '?locality=...' query param
 * 3. Checks authenticated req.user.locality
 * 4. Falls back to default locality ('Kudei Village')
 */
async function resolveLocality(req, res, next) {
  try {
    const identifier =
      req.headers['x-locality-id'] ||
      req.headers['x-locality-slug'] ||
      req.headers['x-locality'] ||
      req.query.locality;

    if (identifier && identifier !== 'all') {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
      const query = isObjectId ? { _id: identifier } : { slug: identifier.toLowerCase() };
      const loc = await Locality.findOne(query);
      if (loc) {
        req.locality = loc;
        req.localityId = loc._id;
      }
    } else if (req.user && req.user.locality) {
      req.localityId = req.user.locality;
    }

    // Default fallback to Kudei Village if none provided
    if (!req.localityId && identifier !== 'all') {
      const defaultLoc = await Locality.findOne({ isDefault: true }) || await Locality.findOne({ slug: 'kudei' });
      if (defaultLoc) {
        req.locality = defaultLoc;
        req.localityId = defaultLoc._id;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveLocality };
