const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Run after a chain of express-validator checks to surface errors uniformly.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
  next(ApiError.badRequest('Validation failed', details));
}

module.exports = validate;
