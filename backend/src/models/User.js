const pool = require('../config/db');

const createUser = async ({ name, email, password, role = 'user' }) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
    [name, email, password, role]
  );
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  // Return full row (including hashed password) for authentication purposes
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`, [email]
  );
  return result.rows[0];
};

const findUserById = async (id) => {
  // Exclude password from general profile lookups
  const result = await pool.query(
    `SELECT id, name, email, role, created_at FROM users WHERE id = $1`, [id]
  );
  return result.rows[0];
};

/**
 * Update a user's hashed password.
 * Called after change-password validation — assumes newHashedPassword is already bcrypt-hashed.
 
 */
const updateUserPassword = async (id, newHashedPassword) => {
  const result = await pool.query(
    `UPDATE users SET password = $1 WHERE id = $2 RETURNING id, name, email, role, created_at`,
    [newHashedPassword, id]
  );
  return result.rows[0];
};

module.exports = { createUser, findUserByEmail, findUserById, updateUserPassword };
