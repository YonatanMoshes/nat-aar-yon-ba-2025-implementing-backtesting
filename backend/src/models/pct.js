const mongoose = require('mongoose');

// Schema for percentage predictions - timestamp as string
const pctSchema = new mongoose.Schema({
  timestamp: String,
  prediction: Number
});

// Get model with dynamic collection name
function getPCTModel(collectionName) {
  return mongoose.models[collectionName] || mongoose.model(collectionName, pctSchema, collectionName);
}

module.exports = { pctSchema, getPCTModel }; 