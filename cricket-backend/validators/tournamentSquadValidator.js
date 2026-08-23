const { body, param } = require('express-validator');

const squadParamValidator = [param('id').isMongoId().withMessage('Invalid team ID')];

const addToSquadValidator = [
  param('id').isMongoId().withMessage('Invalid team ID'),
  body('playerId').isMongoId().withMessage('playerId must be a valid player ID'),
];

const removeFromSquadValidator = [
  param('id').isMongoId().withMessage('Invalid team ID'),
  param('playerId').isMongoId().withMessage('Invalid player ID'),
];

module.exports = { squadParamValidator, addToSquadValidator, removeFromSquadValidator };