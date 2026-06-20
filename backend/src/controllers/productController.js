const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { getAllProducts, getProductById, createProduct, updateProduct, softDeleteProduct, restockProduct } = require('../models/Product');
const { writeAuditLog } = require('../models/StockAuditLog');

const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
];

const getAll = async (req, res) => {
  try {
    const { search, category_id, page, limit } = req.query;
    const products = await getAllProducts({ search, category_id, page, limit });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const product = await createProduct(req.body);
    res.status(201).json({ product });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'SKU already exists' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const product = await softDeleteProduct(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted (soft)', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const restock = async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) return res.status(400).json({ message: 'Quantity must be a positive number' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const before = await getProductById(req.params.id);
    if (!before) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Product not found' }); }

    const updated = await restockProduct(req.params.id, quantity);

    await writeAuditLog(client, {
      product_id: before.id,
      changed_by: req.user.id,
      quantity_before: before.stock_quantity,
      quantity_after: updated.stock_quantity,
      reason: 'manual_restock',
    });

    await client.query('COMMIT');
    res.json({ message: 'Stock updated', product: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getAll, getOne, create, update, remove, restock, productValidation };
