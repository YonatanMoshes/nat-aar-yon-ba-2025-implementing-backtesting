const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema({
    username: {
        type: String,
        required: [true, 'Name is required']
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required']
    },
    phone: {
        type: String,
        required: [true, 'Phone is required (enter with no dashes)']
    },
    location: {
        type: String,
        required: [true, 'Location is required']
    },
    isAdmin: {
        type: Boolean,
        default: false
    },

    // ------------- Investing Data -----------

    // Balances calculate liquid_balance + stock * current_price
    initialBalance: { // Doesnt change after trades
        type: Number,
        required: false,
        default: 0
    },
    liquidBalance: { // The balance that can be used to buy stocks
        type: Number,
        required: false,
        default: 0
    },
    stockInvested: {
        type: Map,
        of: Number,
        default: { "BTC": 0, "ETH": 0, "LTC": 0 }
    },
    hasInvested: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('User', User);