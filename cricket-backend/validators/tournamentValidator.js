const { body, param } = require('express-validator');
const { TOURNAMENT_FORMATS, TOURNAMENT_STATUS } = require('../models/Tournament');

const createTournamentValidator = [
  body('name').trim().notEmpty().withMessage('Tournament name is required').isLength({ max: 150 }),
  body('startDate').isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').isISO8601().withMessage('endDate must be a valid date'),
  body('venue').optional().isString(),
  body('organizer').optional().isString(),
  body('format').optional().isIn(TOURNAMENT_FORMATS),
  body('matchType').optional().isIn(['T20', 'ODI', 'Test', 'Custom']),
  body('oversPerMatch').optional().isInt({ min: 1 }),
];

const updateTournamentValidator = [
  param('id').isMongoId().withMessage('Invalid tournament ID'),
  body('status').optional().isIn(TOURNAMENT_STATUS),
];

const idParamValidator = [param('id').isMongoId().withMessage('Invalid ID')];

module.exports = { createTournamentValidator, updateTournamentValidator, idParamValidator };
