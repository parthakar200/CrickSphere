const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { User } = require('../models');

// Verifies the JWT access token and attaches the authenticated user to req.user.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  const token = header.split(' ')[1];

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired', { code: 'TOKEN_EXPIRED' });
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User no longer exists or is deactivated');
  }

  req.user = user;
  next();
});

// Role-based access control. Usage: authorize('admin'), authorize('admin', 'scorer')
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Role '${req.user.role}' is not permitted to perform this action`));
    }
    next();
  };
}

// Optional auth: attaches req.user if a valid token is present, but does not
// reject the request if absent. Useful for public viewer-facing endpoints
// that still want to know who's asking (e.g. for personalization).
const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();

  try {
    const payload = verifyAccessToken(header.split(' ')[1]);
    const user = await User.findById(payload.sub);
    if (user && user.isActive) req.user = user;
  } catch (err) {
    // ignore invalid/expired tokens for optional auth
  }
  next();
});

module.exports = { authenticate, authorize, optionalAuthenticate };
