const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const { getAll, getOne, create, update, remove, restock, productValidation } = require('../controllers/productController');

router.get('/',              getAll);
router.get('/:id',           getOne);
router.post('/',             authenticate, authorizeRoles('admin'), productValidation, create);
router.put('/:id',           authenticate, authorizeRoles('admin'), update);
router.delete('/:id',        authenticate, authorizeRoles('admin'), remove);
router.patch('/:id/restock', authenticate, authorizeRoles('admin'), restock);

module.exports = router;






