const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpires }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpires,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtConfig.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, jwtConfig.refreshSecret);
}

// Converts strings like "7d", "15m" into a millisecond duration, used to set
// refresh token expiry timestamps stored on the User document.
function expiresInToDate(expr) {
  const match = /^(\d+)([smhd])$/.exec(expr);
  if (!match) return new Date(Date.now() + 15 * 60 * 1000);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return new Date(Date.now() + value * multipliers[unit]);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  expiresInToDate,
};
