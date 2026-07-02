const jwt = require('jsonwebtoken');

/**
 * In-memory token blacklist for invalidated JWTs (logout / password-change).
 * In production this should be replaced with a Redis SET for distributed deployments.
 * Entries are keyed by JWT `jti` (JWT ID) and expire automatically after the token's TTL.
 */
const blacklistedJtis = new Map(); // jti -> expiry (unix seconds)

/**
 * Purge expired entries from the blacklist every 5 minutes to prevent memory leaks.
 */
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, exp] of blacklistedJtis.entries()) {
    if (exp < now) blacklistedJtis.delete(jti);
  }
}, 5 * 60 * 1000);

/**
 * Add a token to the blacklist so it is rejected on future requests.
 * @param {string} jti  - JWT ID claim
 * @param {number} exp  - Token expiry as unix timestamp (seconds)
 */
const blacklistToken = (jti, exp) => {
  if (jti && exp) blacklistedJtis.set(jti, exp);
};

/**
 * Authentication middleware.
 * Validates the Bearer JWT, checks the blacklist, and attaches `req.user`.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Reject tokens that have been explicitly invalidated (logout / password change)
    if (decoded.jti && blacklistedJtis.has(decoded.jti)) {
      return res.status(401).json({ message: 'Token has been revoked. Please log in again.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token has expired. Please log in again.'
        : 'Invalid or malformed token.';
    return res.status(401).json({ message });
  }
};

module.exports = { authenticate, blacklistToken };
