const pool = require('../config/db');
const { getLowStockProducts } = require('../models/Product');
const { getAuditLog } = require('../models/StockAuditLog');

const lowStock = async (req, res) => {
  try {
    const products = await getLowStockProducts();
    res.json({ count: products.length, products });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const salesSummary = async (req, res) => {
  const { period = 'month' } = req.query;
  const trunc = ['day', 'week', 'month', 'year'].includes(period) ? period : 'month';

  try {
    const result = await pool.query(
      `SELECT
         DATE_TRUNC($1, o.created_at) AS period,
         COUNT(o.id)::int AS total_orders,
         SUM(o.total_amount)::numeric AS total_revenue,
         COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::int AS delivered_orders,
         COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END)::int AS cancelled_orders
       FROM orders o
       GROUP BY 1
       ORDER BY 1 DESC
       LIMIT 12`,
      [trunc]
    );
    res.json({ period: trunc, summary: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const auditLog = async (req, res) => {
  try {
    const { product_id, page, limit } = req.query;
    const logs = await getAuditLog({ product_id, page, limit });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const topProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.id, p.name, p.sku,
         SUM(oi.quantity)::int AS total_sold,
         SUM(oi.quantity * oi.unit_price)::numeric AS total_revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status != 'cancelled'
       GROUP BY p.id, p.name, p.sku
       ORDER BY total_sold DESC
       LIMIT 10`
    );
    res.json({ products: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { lowStock, salesSummary, auditLog, topProducts };
