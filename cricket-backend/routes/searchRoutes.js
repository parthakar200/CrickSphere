const express = require('express');
const router = express.Router();

const searchController = require('../controllers/searchController');
const { optionalAuthenticate } = require('../middleware/auth');

router.get('/', optionalAuthenticate, searchController.search);

module.exports = router;
