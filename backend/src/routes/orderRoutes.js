const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const { getAll, getMyOrders, getOne, placeOrder, updateStatus, orderValidation } = require('../controllers/orderController');

router.get('/',          authenticate, authorizeRoles('admin'), getAll);
router.get('/my',        authenticate, getMyOrders);
router.get('/:id',       authenticate, getOne);
router.post('/',         authenticate, orderValidation, placeOrder);
router.patch('/:id/status', authenticate, authorizeRoles('admin'), updateStatus);

module.exports = router;
