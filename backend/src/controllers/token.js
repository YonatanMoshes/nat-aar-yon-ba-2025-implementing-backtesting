const tokenService = require('../services/token');

const authenticateUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Call the service to authenticate the user
        const tokenId = await tokenService.authenticateUser(username, password);
        
        if (!tokenId) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Respond with the token
        res.json({ tokenId });
    } catch (err) {
        res.status(500).json({ error: "Error authenticating user" });
    }
};

const authenticateToken = async (req, res) => {
    try {
        console.log('Authenticating token...');
        // Look for the token in the Authorization header
        const decoded = await tokenService.authenticateToken(req);

        res.json({ message: "successfully authenticated" });
    } catch (err) {
        // If the token is not valid (e.g., expired, wrong signature)
        res.status(401).json({ error: 'Token is not valid.' });
    }
};

module.exports = { authenticateUser, authenticateToken};