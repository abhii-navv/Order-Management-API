const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const { getAll, getOne, create, update, remove, categoryValidation } = require('../controllers/categoryController');

router.get('/',     getAll);
router.get('/:id',  getOne);
router.post('/',    authenticate, authorizeRoles('admin'), categoryValidation, create);
router.put('/:id',  authenticate, authorizeRoles('admin'), update);
router.delete('/:id', authenticate, authorizeRoles('admin'), remove);

module.exports = router;

