const userService = require('../services/user');
const pricesService = require('../services/prices');

const presentUser = async (user) => {
    try {
        // --- CALCULATE THE VALUE OF STOCKS ---
        let stockPortfolioValue = 0;
        // Use Promise.all to fetch all prices concurrently for performance
        const stockSymbols = Array.from(user.stockInvested.keys());

        const pricePromises = stockSymbols.map(symbol => pricesService.getLatestPrice(symbol));
        const latestPrices = await Promise.all(pricePromises);

        stockSymbols.forEach((symbol, index) => {
            const unitsOwned = user.stockInvested.get(symbol);
            const currentPrice = latestPrices[index];
            stockPortfolioValue += unitsOwned * currentPrice;
        });

        // --- CALCULATE THE totalBalance ---
        const calculatedTotalBalance = user.liquidBalance + stockPortfolioValue;

        return {
            username: user.username,
            email: user.email,
            phone: user.phone,
            location: user.location,
            isAdmin: user.isAdmin,

            // --- FINANCIAL FIELDS ---
            initialBalance: user.initialBalance,
            totalBalance: calculatedTotalBalance,
            liquidBalance: user.liquidBalance,
            stockInvested: user.stockInvested,
            hasInvested: user.hasInvested
        }
    } catch (err) {
        res.status(500).json({ error: 'Error displaying movie' });
    }
}

const createUser = async (req, res) => {
    try {
        // Check if a user already exists with the same userName
        const existingUserName = await userService.getUserByName(req.body.username);

        if (existingUserName) {
            return res.status(400).json({ error: "A user with this username already exists" });
        }

        // Create a new user
        const newUser = await userService.createUser(req.body);
        res.status(201).set('Location', `/api/users/${newUser._id}`).end();
    } catch (err) {
        res.status(err.statusCode).json({ error: err.message });
    }
};

const getUser = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);

        res.json(await presentUser(user));
    } catch (err) {
        res.status(err.statusCode).json({ error: err.message });
    }
}

const updateUser = async (req, res) => {
    try {
        const updatedUser = await userService.updateUser(req.params.id, req.body);

        res.json(await presentUser(updatedUser));
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
}

const handleTrade = async (req, res) => {
    try {
        const updatedUser = await userService.executeTrade(req.params.id, req.body);
        res.json(await presentUser(updatedUser));
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
};

const handleSetupPortfolio = async (req, res) => {
    try {
        const updatedUser = await userService.setupPortfolio(req.params.id, req.body);
        res.json(await presentUser(updatedUser));
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
};

module.exports = { createUser, getUser, presentUser, updateUser, handleTrade, handleSetupPortfolio };