const jwt = require('jsonwebtoken')
const JWT_screte = 'Mywebsite'
function fetchuser(req, res, next) {
    const token = req.header('auth-token');
    if (!token) {
        return res.status(400).json({ error: 'Invalid token' });
    }
    try {
        const data = jwt.verify(token, JWT_screte);
        req.user = data.user;
        next();
    } catch(error) {
        res.status(400).json({ error: 'Invalid token' });
    }
}
module.exports = fetchuser;
