const pool = require('../config/db');

const STATUS_FLOW = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];

const getAllOrders = async ({ status, user_id, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];

  if (status) { values.push(status); conditions.push(`o.status = $${values.length}`); }
  if (user_id) { values.push(user_id); conditions.push(`o.user_id = $${values.length}`); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  values.push(limit, offset);

  const result = await pool.query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email
     FROM orders o
     JOIN users u ON o.user_id = u.id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return result.rows;
};

const getOrderById = async (id) => {
  const orderResult = await pool.query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email
     FROM orders o JOIN users u ON o.user_id = u.id
     WHERE o.id = $1`, [id]
  );
  if (!orderResult.rows[0]) return null;

  const itemsResult = await pool.query(
    `SELECT oi.*, p.name AS product_name, p.sku
     FROM order_items oi JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1`, [id]
  );

  return { ...orderResult.rows[0], items: itemsResult.rows };
};

const createOrder = async (client, { user_id, items, notes }) => {
  let total = 0;
  for (const item of items) {
    total += item.unit_price * item.quantity;
  }

  const orderResult = await client.query(
    `INSERT INTO orders (user_id, total_amount, notes) VALUES ($1,$2,$3) RETURNING *`,
    [user_id, total, notes]
  );
  const order = orderResult.rows[0];

  for (const item of items) {
    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES ($1,$2,$3,$4)`,
      [order.id, item.product_id, item.quantity, item.unit_price]
    );
  }

  return order;
};

const updateOrderStatus = async (id, newStatus) => {
  const result = await pool.query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [newStatus, id]
  );
  return result.rows[0];
};

const isValidTransition = (current, next) => {
  if (next === 'cancelled') return ['pending', 'confirmed'].includes(current);
  const ci = STATUS_FLOW.indexOf(current);
  const ni = STATUS_FLOW.indexOf(next);
  return ni === ci + 1;
};

module.exports = { getAllOrders, getOrderById, createOrder, updateOrderStatus, isValidTransition };
