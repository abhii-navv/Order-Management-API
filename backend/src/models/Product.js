const pool = require('../config/db');

/**
 * Retrieve all non-deleted products with filtering, search, sorting, and pagination.
 * Returns { products, total, page, limit, totalPages } for rich pagination UIs.
 *
 * @param {object} opts
 * @param {string}  [opts.search]      - Full-text search against name and SKU (case-insensitive)
 * @param {number}  [opts.category_id] - Filter to a specific category
 * @param {number}  [opts.min_price]   - Minimum price filter (inclusive)
 * @param {number}  [opts.max_price]   - Maximum price filter (inclusive)
 * @param {boolean} [opts.low_stock]   - If truthy, return only low-stock items
 * @param {string}  [opts.sort_by]     - Column to sort by: 'price', 'stock_quantity', 'name', 'created_at'
 * @param {string}  [opts.sort_order]  - 'ASC' or 'DESC' (default DESC)
 * @param {number}  [opts.page=1]
 * @param {number}  [opts.limit=10]
 */
const getAllProducts = async ({
  search,
  category_id,
  min_price,
  max_price,
  low_stock,
  sort_by = 'created_at',
  sort_order = 'DESC',
  page = 1,
  limit = 10,
}) => {
  const offset = (page - 1) * limit;
  const conditions = [`p.deleted_at IS NULL`];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${values.length} OR p.sku ILIKE $${values.length})`);
  }
  if (category_id) {
    values.push(category_id);
    conditions.push(`p.category_id = $${values.length}`);
  }
  if (min_price !== undefined && min_price !== '') {
    values.push(Number(min_price));
    conditions.push(`p.price >= $${values.length}`);
  }
  if (max_price !== undefined && max_price !== '') {
    values.push(Number(max_price));
    conditions.push(`p.price <= $${values.length}`);
  }
  if (low_stock) {
    conditions.push(`p.stock_quantity <= p.low_stock_threshold`);
  }

  const where = conditions.join(' AND ');

  // Whitelist sort columns to prevent SQL injection via sort_by param
  const ALLOWED_SORT = ['name', 'price', 'stock_quantity', 'created_at', 'updated_at'];
  const safeSort = ALLOWED_SORT.includes(sort_by) ? sort_by : 'created_at';
  const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countValues = [...values];
  values.push(limit, offset);

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${where}
       ORDER BY p.${safeSort} ${safeOrder}
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${where}`,
      countValues
    ),
  ]);

  return {
    products: dataResult.rows,
    total: countResult.rows[0]?.total ?? 0,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil((countResult.rows[0]?.total ?? 0) / limit),
  };
};

/**
 * Get a single non-deleted product by ID, including its category name.
 */
const getProductById = async (id) => {
  const result = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0];
};

/**
 * Create a new product. The caller is responsible for ensuring SKU uniqueness
 * (unique constraint on DB will throw error code '23505' on collision).
 */
const createProduct = async ({ category_id, name, description, price, stock_quantity, low_stock_threshold, sku }) => {
  const result = await pool.query(
    `INSERT INTO products (category_id, name, description, price, stock_quantity, low_stock_threshold, sku)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [category_id || null, name, description || null, price, stock_quantity || 0, low_stock_threshold || 10, sku]
  );
  return result.rows[0];
};

/**
 * Partial update of a product's editable fields.
 * Uses COALESCE so unspecified fields retain their current values.
 */
const updateProduct = async (id, fields) => {
  const { category_id, name, description, price, low_stock_threshold } = fields;
  const result = await pool.query(
    `UPDATE products
     SET category_id          = COALESCE($1, category_id),
         name                 = COALESCE($2, name),
         description          = COALESCE($3, description),
         price                = COALESCE($4, price),
         low_stock_threshold  = COALESCE($5, low_stock_threshold),
         updated_at           = NOW()
     WHERE id = $6 AND deleted_at IS NULL RETURNING *`,
    [category_id, name, description, price, low_stock_threshold, id]
  );
  return result.rows[0];
};

/**
 * Soft-delete a product by setting deleted_at.
 * All references (order_items, audit_log) are preserved for historical accuracy.
 */
const softDeleteProduct = async (id) => {
  const result = await pool.query(
    `UPDATE products SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`, [id]
  );
  return result.rows[0];
};

/**
 * Add stock to a product (manual restock). Recorded in audit log by the controller.
 */
const restockProduct = async (id, quantity) => {
  const result = await pool.query(
    `UPDATE products
     SET stock_quantity = stock_quantity + $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
    [quantity, id]
  );
  return result.rows[0];
};

/**
 * Return all products whose stock_quantity is at or below their low_stock_threshold.
 * Used by the low-stock report.
 */
const getLowStockProducts = async () => {
  const result = await pool.query(
    `SELECT p.*, c.name AS category_name,
            (p.low_stock_threshold - p.stock_quantity) AS units_needed
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.deleted_at IS NULL AND p.stock_quantity <= p.low_stock_threshold
     ORDER BY p.stock_quantity ASC`
  );
  return result.rows;
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  softDeleteProduct,
  restockProduct,
  getLowStockProducts,
};

