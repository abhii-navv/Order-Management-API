const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const { lowStock, salesSummary, auditLog, topProducts } = require('../controllers/reportController');

router.get('/low-stock',      authenticate, authorizeRoles('admin'), lowStock);
router.get('/sales-summary',  authenticate, authorizeRoles('admin'), salesSummary);
router.get('/audit-log',      authenticate, authorizeRoles('admin'), auditLog);
router.get('/top-products',   authenticate, authorizeRoles('admin'), topProducts);

module.exports = router;
