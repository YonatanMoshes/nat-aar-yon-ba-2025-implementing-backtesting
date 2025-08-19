const tokenService = require('../services/token');

const authenticateUser = async (req, res, next) => {
    try {
        // Look for the token in the Authorization header
        const decoded = await tokenService.authenticateToken(req);

        // Attach the user payload to the request object
        req.user = decoded.user;

        // Pass control to the next middleware or the route handler
        next();

    } catch (err) {
        // If the token is not valid (e.g., expired, wrong signature)
        res.status(401).json({ message: 'Token is not valid.' });
    }
};

module.exports = { authenticateUser };