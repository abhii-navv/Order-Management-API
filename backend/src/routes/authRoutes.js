const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  register, registerValidation,
  login, loginValidation,
  getMe
} = require('../controllers/authController');

router.post('/register', registerValidation, register);
router.post('/login',    loginValidation,    login);
router.get('/me',        authenticate,       getMe);

module.exports = router;
