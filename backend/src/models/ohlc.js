const mongoose = require('mongoose');

// Schema for OHLC data - timestamp as string
const ohlcSchema = new mongoose.Schema({
  timestamp: String,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number
});

// Get model with dynamic collection name
function getOHLCModel(collectionName) {
  return mongoose.models[collectionName] || mongoose.model(collectionName, ohlcSchema, collectionName);
}

module.exports = { ohlcSchema, getOHLCModel }; 