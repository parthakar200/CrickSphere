const { body, param } = require('express-validator');
const { EXTRA_TYPES, DISMISSAL_TYPES } = require('../models/Ball');

const recordBallValidator = [
  param('matchId').isMongoId(),
  param('inningsId').isMongoId(),
  body('striker').isMongoId().withMessage('striker is required'),
  body('nonStriker').isMongoId().withMessage('nonStriker is required'),
  body('bowler').isMongoId().withMessage('bowler is required'),
  body('runsScored').optional().isInt({ min: 0, max: 6 }),
  body('extraType').optional().isIn(EXTRA_TYPES),
  body('extraRuns').optional().isInt({ min: 0 }),
  body('isWicket').optional().isBoolean(),
  body('wicket.dismissalType').optional().isIn(DISMISSAL_TYPES),
  body('wicket.playerOut').optional().isMongoId(),
  body('wicket.fielder').optional().isMongoId(),
];

module.exports = { recordBallValidator };
