
const { body, param } = require('express-validator');
const { MATCH_TYPES, MATCH_MODES } = require('../models/Match');

const createMatchValidator = [
  body('name').trim().notEmpty().withMessage('Match name is required').isLength({ max: 150 }),
  body('mode').isIn(MATCH_MODES).withMessage(`mode must be one of: ${MATCH_MODES.join(', ')}`),
  body('teamA').isMongoId().withMessage('teamA must be a valid team ID'),
  body('teamB').isMongoId().withMessage('teamB must be a valid team ID'),
  body('overs').isInt({ min: 1 }).withMessage('overs must be a positive integer'),
  body('matchType').optional().isIn(MATCH_TYPES),
  body('tournament')
    .if(body('mode').equals('tournament'))
    .isMongoId()
    .withMessage('tournament is required when mode is "tournament"'),
  body('venue').optional().isString(),
  body('scheduledAt').optional().isISO8601(),
];

const tossValidator = [
  param('id').isMongoId(),
  body('winner').isMongoId().withMessage('winner must be a valid team ID'),
  body('decision').isIn(['bat', 'bowl']).withMessage('decision must be "bat" or "bowl"'),
];

const playingXIValidator = [
  param('id').isMongoId(),
  body('teamAPlayingXI').isArray({ min: 1 }).withMessage('teamAPlayingXI must be a non-empty array'),
  body('teamAPlayingXI.*').isMongoId().withMessage('teamAPlayingXI must contain valid player IDs'),
  body('teamBPlayingXI').isArray({ min: 1 }).withMessage('teamBPlayingXI must be a non-empty array'),
  body('teamBPlayingXI.*').isMongoId().withMessage('teamBPlayingXI must contain valid player IDs'),
];

const idParamValidator = [param('id').isMongoId().withMessage('Invalid ID')];

module.exports = { createMatchValidator, tossValidator, playingXIValidator, idParamValidator };