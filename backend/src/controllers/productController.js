const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  softDeleteProduct,
  restockProduct,
} = require('../models/Product');
const { writeAuditLog } = require('../models/StockAuditLog');

// ── Validation ─────────────────────────────────────────────────────────────────

const productValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Product name must be 200 characters or fewer'),
  body('price')
    .isFloat({ gt: 0 })
    .withMessage('Price must be a positive number'),
  body('sku')
    .trim()
    .notEmpty().withMessage('SKU is required')
    .isLength({ max: 100 }).withMessage('SKU must be 100 characters or fewer')
    .matches(/^[A-Za-z0-9_\-]+$/)
    .withMessage('SKU may only contain letters, digits, hyphens, and underscores'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low-stock threshold must be a non-negative integer'),
];

const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Product name cannot be blank')
    .isLength({ max: 200 }).withMessage('Product name must be 200 characters or fewer'),
  body('price')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Price must be a positive number'),
  body('low_stock_threshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low-stock threshold must be a non-negative integer'),
];

// ── Controllers ────────────────────────────────────────────────────────────────

const getAll = async (req, res) => {
  try {
    const { search, category_id, min_price, max_price, low_stock, sort_by, sort_order, page, limit } = req.query;
    const result = await getAllProducts({
      search,
      category_id,
      min_price,
      max_price,
      low_stock: low_stock === 'true' || low_stock === '1',
      sort_by,
      sort_order,
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    res.json(result); // { products, total, page, limit, totalPages }
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
    if (err.code === '23505') return res.status(409).json({ message: `SKU "${req.body.sku}" already exists` });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  // Prevent any attempt to change SKU after creation (immutable identifier)
  if (req.body.sku !== undefined) {
    return res.status(400).json({ message: 'SKU cannot be changed after product creation' });
  }

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
    res.json({ message: `Product "${product.name}" has been archived (soft-deleted)`, product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const restock = async (req, res) => {
  const quantity = parseInt(req.body.quantity, 10);
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be a positive integer' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const before = await getProductById(req.params.id);
    if (!before) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Product not found' });
    }

    const updated = await restockProduct(req.params.id, quantity);

    await writeAuditLog(client, {
      product_id: before.id,
      changed_by: req.user.id,
      quantity_before: before.stock_quantity,
      quantity_after: updated.stock_quantity,
      reason: 'manual_restock',
    });

    await client.query('COMMIT');
    res.json({
      message: `Stock updated: +${quantity} units added to "${before.name}"`,
      product: updated,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  restock,
  productValidation,
  updateProductValidation,
};

