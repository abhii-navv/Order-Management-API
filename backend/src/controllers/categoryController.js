const { body, validationResult } = require('express-validator');
const { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory } = require('../models/Category');

const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
];

const getAll = async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const category = await getCategoryById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const category = await createCategory(req.body);
    res.status(201).json({ category });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Category name already exists' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const category = await updateCategory(req.params.id, req.body);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const category = await deleteCategory(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted', category });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove, categoryValidation };
