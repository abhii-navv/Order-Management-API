const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { getAllOrders, getOrderById, createOrder, updateOrderStatus, isValidTransition } = require('../models/Order');
const { getProductById } = require('../models/Product');
const { writeAuditLog } = require('../models/StockAuditLog');

const orderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').isInt().withMessage('Valid product_id required'),
  body('items.*.quantity').isInt({ gt: 0 }).withMessage('Quantity must be positive'),
];

const getAll = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const user_id = req.user.role === 'admin' ? null : req.user.id;
    const orders = await getAllOrders({ status, user_id, page, limit });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await getAllOrders({ user_id: req.user.id });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const placeOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const enrichedItems = [];

    for (const item of req.body.items) {
      const product = await getProductById(item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      if (product.stock_quantity < item.quantity)
        throw new Error(`Insufficient stock for "${product.name}" (available: ${product.stock_quantity})`);

      const stockResult = await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW()
         WHERE id = $2 AND stock_quantity >= $1 AND deleted_at IS NULL RETURNING *`,
        [item.quantity, item.product_id]
      );
      if (stockResult.rowCount === 0) throw new Error(`Stock conflict for product ${item.product_id}`);

      await writeAuditLog(client, {
        product_id: product.id,
        changed_by: req.user.id,
        quantity_before: product.stock_quantity,
        quantity_after: stockResult.rows[0].stock_quantity,
        reason: 'order_placed',
      });

      enrichedItems.push({ ...item, unit_price: product.price });
    }

    const order = await createOrder(client, {
      user_id: req.user.id,
      items: enrichedItems,
      notes: req.body.notes,
    });

    await client.query('COMMIT');
    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
};

const updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'Status is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const order = await getOrderById(req.params.id);
    if (!order) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Order not found' }); }

    if (!isValidTransition(order.status, status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Cannot transition from "${order.status}" to "${status}"` });
    }

    if (status === 'cancelled') {
      for (const item of order.items) {
        const product = await getProductById(item.product_id);
        const restored = await client.query(
          `UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW()
           WHERE id = $2 RETURNING *`,
          [item.quantity, item.product_id]
        );
        await writeAuditLog(client, {
          product_id: item.product_id,
          changed_by: req.user.id,
          quantity_before: product.stock_quantity,
          quantity_after: restored.rows[0].stock_quantity,
          reason: 'order_cancelled',
        });
      }
    }

    const updated = await updateOrderStatus(req.params.id, status);
    await client.query('COMMIT');
    res.json({ message: 'Order status updated', order: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getAll, getMyOrders, getOne, placeOrder, updateStatus, orderValidation };
