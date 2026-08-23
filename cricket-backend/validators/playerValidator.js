
const { body, param } = require('express-validator');
const { PLAYER_ROLES, BATTING_STYLES, BOWLING_STYLES } = require('../models/Player');

const createPlayerValidator = [
  body('name').trim().notEmpty().withMessage('Player name is required').isLength({ max: 100 }),
  body('role').isIn(PLAYER_ROLES).withMessage(`Role must be one of: ${PLAYER_ROLES.join(', ')}`),
  body('battingStyle').optional().isIn(BATTING_STYLES),
  body('bowlingStyle').optional().isIn(BOWLING_STYLES),
  body('jerseyNumber').optional().isInt({ min: 0, max: 999 }),
  body('photo').optional().isString(),
];

const updatePlayerValidator = [
  param('id').isMongoId().withMessage('Invalid player ID'),
  body('name').optional().trim().isLength({ max: 100 }),
  body('role').optional().isIn(PLAYER_ROLES),
  body('battingStyle').optional().isIn(BATTING_STYLES),
  body('bowlingStyle').optional().isIn(BOWLING_STYLES),
];

const idParamValidator = [param('id').isMongoId().withMessage('Invalid ID')];

module.exports = { createPlayerValidator, updatePlayerValidator, idParamValidator };