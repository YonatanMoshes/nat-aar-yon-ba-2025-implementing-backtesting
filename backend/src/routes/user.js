const express = require('express');
const router = express.Router();

const userController = require('../controllers/user');

router.route('/')
    .post(userController.createUser)

router.route('/:id')
    .get(userController.getUser)
    .put(userController.updateUser)

router.route('/:id/trade')
    .post(userController.handleTrade)

router.route('/:id/setup-portfolio')
    .post(userController.handleSetupPortfolio)

module.exports = router;