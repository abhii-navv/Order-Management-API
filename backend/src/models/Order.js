const pool = require('../config/db');

/**
 * Valid linear status progression for an order.
 * Cancellation is handled separately (see isValidTransition).
 */
const STATUS_FLOW = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];

/**
 * Retrieve all orders with optional filters and cursor-based-style pagination.
 * Now returns `{ orders, total }` so callers can build pagination UIs.
 *
 * @param {object} opts
 * @param {string}  [opts.status]    - Filter by exact order status
 * @param {number}  [opts.user_id]   - Filter by user (null = admin, sees all)
 * @param {number}  [opts.page=1]    - 1-indexed page number
 * @param {number}  [opts.limit=10]  - Page size
 * @returns {{ orders: object[], total: number }}
 */
const getAllOrders = async ({ status, user_id, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];

  if (status) { values.push(status); conditions.push(`o.status = $${values.length}`); }
  if (user_id) { values.push(user_id); conditions.push(`o.user_id = $${values.length}`); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  // Run count and data queries in parallel for performance
  const countValues = [...values];
  values.push(limit, offset);

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ${where}`,
      countValues
    ),
  ]);

  return {
    orders: dataResult.rows,
    total: countResult.rows[0]?.total ?? 0,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil((countResult.rows[0]?.total ?? 0) / limit),
  };
};

/**
 * Fetch a single order by ID, including its full item list with product details.
 */
const getOrderById = async (id) => {
  const orderResult = await pool.query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email
     FROM orders o JOIN users u ON o.user_id = u.id
     WHERE o.id = $1`, [id]
  );
  if (!orderResult.rows[0]) return null;

  const itemsResult = await pool.query(
    `SELECT oi.*, p.name AS product_name, p.sku, p.description AS product_description
     FROM order_items oi JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1
     ORDER BY oi.id ASC`, [id]
  );

  return { ...orderResult.rows[0], items: itemsResult.rows };
};

/**
 * Create a new order and its line items inside an active transaction client.
 * Total is computed here to ensure server-side price integrity (not trusting client).
 */
const createOrder = async (client, { user_id, items, notes }) => {
  let total = 0;
  for (const item of items) {
    total += Number(item.unit_price) * Number(item.quantity);
  }
  // Round to 2 decimal places to avoid floating-point drift in currency values
  total = Math.round(total * 100) / 100;

  const orderResult = await client.query(
    `INSERT INTO orders (user_id, total_amount, notes) VALUES ($1,$2,$3) RETURNING *`,
    [user_id, total, notes || null]
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

/**
 * Transition an order to a new status and stamp updated_at.
 */
const updateOrderStatus = async (id, newStatus) => {
  const result = await pool.query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [newStatus, id]
  );
  return result.rows[0];
};

/**
 * Validate whether a status transition is allowed.
 * - Normal flow must advance exactly one step in STATUS_FLOW.
 * - Cancellation is only permitted from 'pending' or 'confirmed'.
 *   (Orders already packed/shipped/delivered cannot be cancelled via API.)
 */
const isValidTransition = (current, next) => {
  if (next === 'cancelled') {
    return ['pending', 'confirmed'].includes(current);
  }
  const ci = STATUS_FLOW.indexOf(current);
  const ni = STATUS_FLOW.indexOf(next);
  // Disallow jumping multiple steps or going backwards
  return ci !== -1 && ni === ci + 1;
};

module.exports = { getAllOrders, getOrderById, createOrder, updateOrderStatus, isValidTransition };
