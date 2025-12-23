const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

/**
 * Auth middleware
 * - Requires a valid JWT
 * - Attaches decoded token to req.user
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { accountId, email, isAdmin }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Admin middleware
 * - Must be authenticated
 * - Must have isAdmin === true
 */
const adminMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

module.exports = {
  authMiddleware,
  adminMiddleware
};
