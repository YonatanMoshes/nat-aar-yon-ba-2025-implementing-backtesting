const jwt = require('jsonwebtoken');

const key = process.env.SECRET;

const tokenValidation = (adminActionBool) => {
    return (req, res, next) => {
        if (!req.headers['authorization']) {
            return res.status(401).json({ error: 'Token is missing' });
        }

        const token = req.headers['authorization'].split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token is missing' });
        }

        try {
            const decodedToken = jwt.verify(token, key);
            
            if (adminActionBool && !decodedToken.isAdmin) {
                return res.status(401).json({ error: 'Access denied: Admins only' });
            }

            req.token = decodedToken.userId;

            next();
        } catch (error) {
            return res.status(401).json({ error: 'Token is invalid' });
        }
    };
};

module.exports = { tokenValidation };