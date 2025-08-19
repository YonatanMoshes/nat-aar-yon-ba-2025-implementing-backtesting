const mongoose = require('mongoose');

// Schema for binary predictions - timestamp as string
const binarySchema = new mongoose.Schema({
  timestamp: String,
  prediction_threshold_0: Number,
  prediction_threshold_1: Number,
  prediction_threshold_2: Number,
  prediction_threshold_3: Number,
  prediction_threshold_4: Number,
  prediction_threshold_5: Number,
  prediction_threshold_6: Number,
  prediction_threshold_7: Number,
  prediction_threshold_8: Number
});

// Get model with dynamic collection name
function getBinaryModel(collectionName) {
  return mongoose.models[collectionName] || mongoose.model(collectionName, binarySchema, collectionName);
}

module.exports = { binarySchema, getBinaryModel }; 