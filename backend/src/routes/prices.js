const express = require('express');
const pricesController = require('../controllers/prices');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
      .post(authMiddleware.authenticateUser, pricesController.fetchPricesAndPredictions);

router.route('/date-range')
      .post(authMiddleware.authenticateUser, pricesController.fetchMinMaxDates);

module.exports = router;
