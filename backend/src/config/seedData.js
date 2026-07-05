const pool = require('./db');

/**
 * Seed the database with a starter set of categories and products.
 * Runs on every server boot but is a no-op if products already exist,
 * so it never duplicates data or overwrites anything an admin has added.
 */
const seedData = async () => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM products');
    if (rows[0].count > 0) {
      console.log('ℹ️  Products already exist — skipping seed data');
      return;
    }

    console.log('🌱 Seeding sample categories and products...');

    const categories = [
      { name: 'Electronics', description: 'Gadgets, devices, and accessories' },
      { name: 'Groceries',   description: 'Everyday food and household staples' },
      { name: 'Stationery',  description: 'Office and school supplies' },
    ];

    const categoryIds = {};
    for (const cat of categories) {
      const result = await pool.query(
        `INSERT INTO categories (name, description) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, name`,
        [cat.name, cat.description]
      );
      categoryIds[cat.name] = result.rows[0].id;
    }

    const products = [
      { name: 'Wireless Mouse',        sku: 'ELEC-001', category: 'Electronics', price: 599.00,  stock_quantity: 40, low_stock_threshold: 10 },
      { name: 'USB-C Charging Cable',  sku: 'ELEC-002', category: 'Electronics', price: 299.00,  stock_quantity: 60, low_stock_threshold: 15 },
      { name: 'Bluetooth Headphones',  sku: 'ELEC-003', category: 'Electronics', price: 1999.00, stock_quantity: 8,  low_stock_threshold: 10 },
      { name: 'Basmati Rice (5kg)',    sku: 'GROC-001', category: 'Groceries',   price: 450.00,  stock_quantity: 25, low_stock_threshold: 5  },
      { name: 'Cooking Oil (1L)',      sku: 'GROC-002', category: 'Groceries',   price: 180.00,  stock_quantity: 50, low_stock_threshold: 10 },
      { name: 'A4 Notebook (200pg)',   sku: 'STAT-001', category: 'Stationery',  price: 60.00,   stock_quantity: 100,low_stock_threshold: 20 },
      { name: 'Ballpoint Pen (Pack of 10)', sku: 'STAT-002', category: 'Stationery', price: 90.00, stock_quantity: 3, low_stock_threshold: 15 },
    ];

    for (const p of products) {
      await pool.query(
        `INSERT INTO products (category_id, name, description, price, stock_quantity, low_stock_threshold, sku)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (sku) DO NOTHING`,
        [categoryIds[p.category], p.name, null, p.price, p.stock_quantity, p.low_stock_threshold, p.sku]
      );
    }

    console.log(`✅ Seeded ${categories.length} categories and ${products.length} products`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
};

module.exports = seedData;
