const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  register, registerValidation,
  login, loginValidation,
  logout,
  changePassword, changePasswordValidation,
  getMe
} = require('../controllers/authController');

router.post('/register',         registerValidation,       register);
router.post('/login',            loginValidation,          login);
router.post('/logout',           authenticate,             logout);
router.post('/change-password',  authenticate, changePasswordValidation, changePassword);
router.get('/me',                authenticate,             getMe);

module.exports = router;

