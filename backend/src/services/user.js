const mongoose = require('mongoose');
const User = require('../models/user');
const errorClass = require("../ErrorHandling");
const { getLatestPrice } = require('./prices');

// const generateShortId = async () => {
//     try {
//         const maxIdUser = await User.findOne()
//             .sort({ shortId: -1 }) // Sort by shortId in descending order
//             .exec();
    
//         // Returns 1 more than the max ID, or 0 if no movies exist
//         return maxIdUser ? maxIdUser.shortId + 1 : 0;
//     } catch (err) {
//         errorClass.filterError(err);
//     }
// };

const createUser = async (userData) => {
    try {
        // if (userData.shortId) {
        //     throw {statusCode: 400, message: 'Do not enter ID'};
        // }

        const user = new User(userData);
        if (!user) {
            throw {statusCode: 400, message: 'User could not be created'};
        }

        // user.shortId = await generateShortId();

        return await user.save();
    } catch (err) {
        errorClass.filterError(err);
    }
};

const executeTrade = async (userId, tradeDetails) => {
    const { stockSymbol, action, pct } = tradeDetails;

    // --- 1. Validation ---
    if (!['BUY', 'SELL'].includes(action)) {
        throw { statusCode: 400, message: 'Invalid trade action.' };
    }
    if (pct <= 0 || pct > 100) {
        throw { statusCode: 400, message: 'Percentage must be between 0 and 100.' };
    }

    // --- 2. Get Fresh Data ---
    const user = await User.findById(userId);
    if (!user) {
        throw { statusCode: 404, message: 'User not found.' };
    }

    const currentPrice = await getLatestPrice(stockSymbol);
    const currentHolding = user.stockInvested.get(stockSymbol) || 0;

    // --- 3. Execute Trade Logic ---
    if (action === 'BUY') {
        const dollarAmountToSpend  = (pct / 100) * user.liquidBalance;

        if (user.liquidBalance < dollarAmountToSpend || user.liquidBalance == 0) {
            throw { statusCode: 400, message: 'Insufficient funds.' };
        }
        // Decrease cash balance
        user.liquidBalance  -= dollarAmountToSpend;

        // Increase stock holding
        const unitsToTrade = dollarAmountToSpend / currentPrice;
        
        user.stockInvested.set(stockSymbol, currentHolding + unitsToTrade);

    } else { // action === 'SELL'
        const unitsToTrade = (pct / 100) * currentHolding;

        if (currentHolding < unitsToTrade || currentHolding == 0) {
            throw { statusCode: 400, message: `Insufficient stock. You only have ${currentHolding.toFixed(4)} ${stockSymbol}.` };
        }

        const dollarAmountGained = unitsToTrade * currentPrice;

        // Increase cash balance
        user.liquidBalance += dollarAmountGained;
        // Decrease stock holding
        user.stockInvested.set(stockSymbol, currentHolding - unitsToTrade);
    }

    // --- 4. Save and Return ---
    // You could also create a separate Transaction record here for user history
    return await user.save();
};

const updateUser = async (id, userData) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw {statusCode: 404, message: 'User not found'};
        }

        const user = await User.findById(id);
        if (!user) {
            throw {statusCode: 404, message: 'User not found'};
        }

        console.log('Updating user with data:', userData);

        Object.keys(userData).forEach(key => {
            user[key] = userData[key];
        });
        return await user.save();
    } catch (err) {
        errorClass.filterError(err);
    }
};

const getUserById = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw {statusCode: 404, message: 'User not found'};
        }

        const user = await User.findById(id);
        if (!user) {
            throw {statusCode: 404, message: 'User not found'};
        }

        return user;
    } catch (err) {
        errorClass.filterError(err);
    }
};

const getUserByEmail = async (email) => {
    try {
        const user = await User.findOne({ email });
        return user; // Return the user directly or null if not found
    } catch (err) {
        errorClass.filterError(err);
    }
};

const getUserByName = async (username) => {
    try {
        const user = await User.findOne({ username });

        return user;
    } catch (err) {
        errorClass.filterError(err);
    }
};

const getUserByPhone = async (phone) => {
    try {
        const user = await User.findOne({ phone });
        if (!user) {
            throw {statusCode: 404, message: 'User not found'};
        }
        
        return user;
    } catch (err) {
        errorClass.filterError(err);
    }
};

const setupPortfolio = async (userId, setupData) => {
    const { liquidBalance, stockInvested } = setupData;

    const user = await User.findById(userId);
    if (!user) { throw { statusCode: 404, message: 'User not found.' }; }
    if (user.hasInvested) { throw { statusCode: 400, message: 'User has already set up their portfolio.' }; }

    // --- 1. Calculate the initial value of their stock holdings ---
    let initialStockValue = 0;
    const stockSymbols = Object.keys(stockInvested);

    if (stockSymbols.length > 0) {
        const pricePromises = stockSymbols.map(symbol => getLatestPrice(symbol));
        const latestPrices = await Promise.all(pricePromises);

        stockSymbols.forEach((symbol, index) => {
            const unitsOwned = stockInvested[symbol];
            const currentPrice = latestPrices[index];
            initialStockValue += unitsOwned * currentPrice;
        });
    }

    // --- 2. Set all the fields correctly ---
    user.liquidBalance = liquidBalance;
    user.stockInvested = new Map(Object.entries(stockInvested)); // Ensure it's a Map
    
    // --- THIS IS THE KEY LOGIC FROM YOUR REQUEST ---
    // The initial total portfolio value is the cash they have PLUS the value of stocks they start with.
    user.initialBalance = liquidBalance + initialStockValue;
    
    user.hasInvested = true;

    return await user.save();
};

module.exports = { createUser, getUserByEmail, getUserByName, getUserByPhone, getUserById, updateUser, executeTrade, setupPortfolio };