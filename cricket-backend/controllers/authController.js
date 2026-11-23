const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  expiresInToDate,
} = require('../utils/jwt');
const { jwt: jwtConfig } = require('../config/env');

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  // Only an authenticated admin may assign a non-viewer role at registration time.
  // Public self-registration always defaults to 'viewer'.
  const isAdminCreating = req.user && req.user.role === 'admin';
  const assignedRole = isAdminCreating && role ? role : 'viewer';

  const user = await User.create({ name, email, password, role: assignedRole });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: expiresInToDate(jwtConfig.refreshExpires),
    userAgent: req.headers['user-agent'] || 'unknown',
  });
  await user.save();

  res.status(201).json({
    success: true,
    data: { user: user.toSafeObject(), accessToken, refreshToken },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password, localityId } = req.body;

  const user = await User.findOne({ email }).select('+password').populate('locality');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  if (localityId) {
    if (user.locality) {
      const userLocId = String(user.locality._id || user.locality);
      if (userLocId !== String(localityId)) {
        const userLocName = user.locality.name ? `"${user.locality.name}"` : 'another village';
        throw ApiError.forbidden(`This account belongs to ${userLocName}. Please choose your own village to log in.`);
      }
    } else {
      user.locality = localityId;
      await user.save();
    }
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: expiresInToDate(jwtConfig.refreshExpires),
    userAgent: req.headers['user-agent'] || 'unknown',
  });
  user.lastLogin = new Date();
  await user.save();

  res.json({
    success: true,
    data: { user: user.toSafeObject(), accessToken, refreshToken },
  });
});

// POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+password');
  if (!user) throw ApiError.unauthorized('User no longer exists');

  const storedToken = user.refreshTokens.find((rt) => rt.token === refreshToken);
  if (!storedToken) throw ApiError.unauthorized('Refresh token has been revoked');
  if (storedToken.expiresAt < new Date()) {
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
    await user.save();
    throw ApiError.unauthorized('Refresh token expired');
  }

  // Rotate: invalidate the used refresh token and issue a new pair.
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  user.refreshTokens.push({
    token: newRefreshToken,
    expiresAt: expiresInToDate(jwtConfig.refreshExpires),
    userAgent: req.headers['user-agent'] || 'unknown',
  });
  await user.save();

  res.json({
    success: true,
    data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
  });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await User.updateOne({ _id: req.user._id }, { $pull: { refreshTokens: { token: refreshToken } } });
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('locality');
  res.json({ success: true, data: { user: (user || req.user).toSafeObject() } });
});

module.exports = { register, login, refresh, logout, getMe };
