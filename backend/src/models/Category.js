const pool = require('../config/db');

const getAllCategories = async () => {
  const result = await pool.query(
    `SELECT * FROM categories ORDER BY name ASC`
  );
  return result.rows;
};

const getCategoryById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM categories WHERE id = $1`, [id]
  );
  return result.rows[0];
};

const createCategory = async ({ name, description }) => {
  const result = await pool.query(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2) RETURNING *`,
    [name, description]
  );
  return result.rows[0];
};

const updateCategory = async (id, { name, description }) => {
  const result = await pool.query(
    `UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description)
     WHERE id = $3 RETURNING *`,
    [name, description, id]
  );
  return result.rows[0];
};

const deleteCategory = async (id) => {
  const result = await pool.query(
    `DELETE FROM categories WHERE id = $1 RETURNING *`, [id]
  );
  return result.rows[0];
};

module.exports = { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
