const pool = require('../config/db');

const getAllProducts = async ({ search, category_id, page = 1, limit = 10 }) => {
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

  const where = conditions.join(' AND ');
  values.push(limit, offset);

  const result = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE ${where}
     ORDER BY p.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return result.rows;
};

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

const createProduct = async ({ category_id, name, description, price, stock_quantity, low_stock_threshold, sku }) => {
  const result = await pool.query(
    `INSERT INTO products (category_id, name, description, price, stock_quantity, low_stock_threshold, sku)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [category_id, name, description, price, stock_quantity || 0, low_stock_threshold || 10, sku]
  );
  return result.rows[0];
};

const updateProduct = async (id, fields) => {
  const { category_id, name, description, price, low_stock_threshold } = fields;
  const result = await pool.query(
    `UPDATE products
     SET category_id = COALESCE($1, category_id),
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         price = COALESCE($4, price),
         low_stock_threshold = COALESCE($5, low_stock_threshold),
         updated_at = NOW()
     WHERE id = $6 AND deleted_at IS NULL RETURNING *`,
    [category_id, name, description, price, low_stock_threshold, id]
  );
  return result.rows[0];
};

const softDeleteProduct = async (id) => {
  const result = await pool.query(
    `UPDATE products SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`, [id]
  );
  return result.rows[0];
};

const restockProduct = async (id, quantity) => {
  const result = await pool.query(
    `UPDATE products
     SET stock_quantity = stock_quantity + $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
    [quantity, id]
  );
  return result.rows[0];
};

const getLowStockProducts = async () => {
  const result = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.deleted_at IS NULL AND p.stock_quantity <= p.low_stock_threshold
     ORDER BY p.stock_quantity ASC`
  );
  return result.rows;
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, softDeleteProduct, restockProduct, getLowStockProducts };
