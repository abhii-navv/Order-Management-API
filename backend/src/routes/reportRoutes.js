const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const {
  lowStock,
  salesSummary,
  auditLog,
  topProducts,
  customerAnalytics,
  dashboardKpis,
} = require('../controllers/reportController');

// All report routes require authentication and admin role
router.get('/low-stock',          authenticate, authorizeRoles('admin'), lowStock);
router.get('/sales-summary',      authenticate, authorizeRoles('admin'), salesSummary);
router.get('/audit-log',          authenticate, authorizeRoles('admin'), auditLog);
router.get('/top-products',       authenticate, authorizeRoles('admin'), topProducts);
router.get('/customer-analytics', authenticate, authorizeRoles('admin'), customerAnalytics);
router.get('/dashboard-kpis',     authenticate, authorizeRoles('admin'), dashboardKpis);

module.exports = router;
