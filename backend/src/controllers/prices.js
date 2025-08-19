const pricesService = require('../services/prices');

const fetchPricesAndPredictions = async (req, res) => {
  try {
    let { startDate, endDate, stock } = req.body || {};
    let end = endDate;
    let start = startDate;
    let stockSymbol = stock || 'BTC';

    const result = await pricesService.fetchPrices(start, end, stockSymbol);

    res.json(result);
  } catch (e) {
    console.error('Route error:', e);
    if (e.name === 'CastError') {
      res.status(400).json({ error: `Invalid date format: ${e.message}` });
    } else {
      res.status(500).json({ error: `Unexpected error: ${e.message}` });
    }
  }
};

const fetchMinMaxDates = async (req, res) => {
  try {
    let { stock } = req.body || {};
    let stockSymbol = stock || 'BTC';

    const result = await pricesService.fetchMinMaxDates(stockSymbol);

    res.json(result);
  } catch (e) {
    console.error('Route error:', e);
    if (e.name === 'CastError') {
      res.status(400).json({ error: `Invalid date format: ${e.message}` });
    } else {
      res.status(500).json({ error: `Unexpected error: ${e.message}` });
    }
  }
};

module.exports = { fetchPricesAndPredictions, fetchMinMaxDates };