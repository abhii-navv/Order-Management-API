const pool = require('./db');

const createTables = async () => {
  const query = `

    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(150) UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      role       VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id                  SERIAL PRIMARY KEY,
      category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name                VARCHAR(200) NOT NULL,
      description         TEXT,
      price               NUMERIC(10,2) NOT NULL,
      stock_quantity      INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 10,
      sku                 VARCHAR(100) UNIQUE NOT NULL,
      deleted_at          TIMESTAMP DEFAULT NULL,
      created_at          TIMESTAMP DEFAULT NOW(),
      updated_at          TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status       VARCHAR(20) DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','packed','shipped','delivered','cancelled')),
      total_amount NUMERIC(10,2) NOT NULL,
      notes        TEXT,
      created_at   TIMESTAMP DEFAULT NOW(),
      updated_at   TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id         SERIAL PRIMARY KEY,
      order_id   INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
      quantity   INTEGER NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_audit_log (
      id              SERIAL PRIMARY KEY,
      product_id      INTEGER REFERENCES products(id) ON DELETE CASCADE,
      changed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      quantity_before INTEGER NOT NULL,
      quantity_after  INTEGER NOT NULL,
      reason          VARCHAR(100) NOT NULL,
      changed_at      TIMESTAMP DEFAULT NOW()
    );

  `;

  try {
    await pool.query(query);
    console.log('✅ All tables created (or already exist)');
  } catch (err) {
    console.error('❌ Table creation failed:', err.message);
    process.exit(1);
  }
};

module.exports = createTables;
