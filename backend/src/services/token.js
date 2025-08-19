const userService = require('./user');
const jwt = require('jsonwebtoken');

const authenticateUser = async (username, password) => {
    try {
        const user = await userService.getUserByName(username);

        if (!user) {
            return null; // Return null if the user does not exist
        }
        
        if (user.password !== password) {
            return null; // Return null if the password does not match
        }

        const token = jwt.sign({ userId: user._id }, process.env.SECRET, { expiresIn: '2h' }); // Token is valid for 2 hours
        
        return { userId: user._id, token: token }; // Return the user token + id
    } catch (err) {
        throw {statusCode: 500, message: 'Failed to authenticate user'};
    }
};

const authenticateToken = async (req) => {
    try {
        // Look for the token in the Authorization header
        const authHeader = req.header('Authorization');

        // Check if the header exists and is correctly formatted
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw {statusCode: 401, message: 'No token, authorization denied.'};
        }

        // Extract the token from 'Bearer <token>'
        const token = authHeader.split(' ')[1];

        // Verify the token
        const decoded = jwt.verify(token, process.env.SECRET);

        console.log('Decoded token:', decoded);

        // Check if the user exists in the database
        const user = await userService.getUserById(decoded.userId);
        if (!user) {
            throw {statusCode: 401, message: 'User not found.'};
        }

        return { user: decoded }; // Return the decoded user information
    } catch (err) {
        // If the token is not valid (e.g., expired, wrong signature)
        throw {statusCode: 401, message: 'Token is not valid.'};
    }
};

module.exports = { authenticateUser, authenticateToken };