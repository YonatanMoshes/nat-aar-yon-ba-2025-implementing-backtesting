const express = require('express');
const router = express.Router();

const tokenController = require('../controllers/token');

router.route('/')
    .post(tokenController.authenticateUser);
    
router.route('/verify')
    .get(tokenController.authenticateToken);

module.exports = router;