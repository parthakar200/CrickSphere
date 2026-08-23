const { body, param } = require('express-validator');

const createTeamValidator = [
  body('name').trim().notEmpty().withMessage('Team name is required').isLength({ max: 100 }),
  body('shortName').trim().notEmpty().withMessage('Short name is required').isLength({ max: 6 }),
  body('logo').optional().isString(),
  body('homeGround').optional().isString(),
  body('coach').optional().isString(),
  body('tournament').optional().isMongoId().withMessage('Invalid tournament ID'),
];

const updateTeamValidator = [
  param('id').isMongoId().withMessage('Invalid team ID'),
  body('name').optional().trim().isLength({ max: 100 }),
  body('shortName').optional().trim().isLength({ max: 6 }),
  body('captain').optional().isMongoId(),
];

const idParamValidator = [param('id').isMongoId().withMessage('Invalid ID')];

module.exports = { createTeamValidator, updateTeamValidator, idParamValidator };
