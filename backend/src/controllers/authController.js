const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { createUser, findUserByEmail, findUserById, updateUserPassword } = require('../models/User');
const { blacklistToken } = require('../middleware/auth');

/**
 * Generate a signed JWT with a unique `jti` (JWT ID) so tokens can be
 * individually revoked without invalidating the entire secret.
 */
const generateToken = (user) => {
  const jti = crypto.randomUUID(); // unique token ID for blacklisting
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, jti },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  return { token, jti };
};

// ── Validation chains ──────────────────────────────────────────────────────────

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one number'),
];

// ── Controllers ────────────────────────────────────────────────────────────────

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role } = req.body;

  try {
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    // Use cost factor 12 for strong bcrypt hashing
    const hashed = await bcrypt.hash(password, 12);
    const user = await createUser({ name, email, password: hashed, role });
    const { token } = generateToken(user);

    const { password: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email);
    // Use a constant-time comparison path to prevent user-enumeration timing attacks
    if (!user) {
      await bcrypt.compare(password, '$2a$12$dummyhashtopreventtimingattacksXXXXXXXXXXXXXXXXXXXXXX');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const { token } = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Logout — blacklists the current JWT so it cannot be reused even before expiry.
 * This solves the classic "JWT logout" problem without needing a database per request.
 */
const logout = (req, res) => {
  const { jti, exp } = req.user;
  blacklistToken(jti, exp);
  res.json({ message: 'Logged out successfully. Token has been revoked.' });
};

/**
 * Change password — invalidates the old token and issues a new one,
 * forcing re-authentication on all other sessions.
 */
const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { currentPassword, newPassword } = req.body;

  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must differ from current password' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await updateUserPassword(user.id, hashed);

    // Revoke old token — all existing sessions are invalidated
    blacklistToken(req.user.jti, req.user.exp);

    // Issue a fresh token
    const { token } = generateToken({ ...user, password: hashed });
    res.json({ message: 'Password changed successfully. Please use the new token.', token });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  register, registerValidation,
  login, loginValidation,
  logout,
  changePassword, changePasswordValidation,
  getMe,
};
