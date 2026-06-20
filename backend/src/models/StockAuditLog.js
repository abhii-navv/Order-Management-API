const pool = require('../config/db');

const writeAuditLog = async (client, { product_id, changed_by, quantity_before, quantity_after, reason }) => {
  await client.query(
    `INSERT INTO stock_audit_log (product_id, changed_by, quantity_before, quantity_after, reason)
     VALUES ($1,$2,$3,$4,$5)`,
    [product_id, changed_by, quantity_before, quantity_after, reason]
  );
};

const getAuditLog = async ({ product_id, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];

  if (product_id) {
    values.push(product_id);
    conditions.push(`sal.product_id = $${values.length}`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  values.push(limit, offset);

  const result = await pool.query(
    `SELECT sal.*, p.name AS product_name, p.sku, u.name AS changed_by_name
     FROM stock_audit_log sal
     JOIN products p ON sal.product_id = p.id
     LEFT JOIN users u ON sal.changed_by = u.id
     ${where}
     ORDER BY sal.changed_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return result.rows;
};

module.exports = { writeAuditLog, getAuditLog };
