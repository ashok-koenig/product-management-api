import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  bulkCreate,
} from '../controllers/productController.js';
import {
  validateCreate,
  validateUpdate,
  validateFilters,
  validateBulk,
} from '../validators/productValidator.js';

const router = Router();

router.post('/bulk', validateBulk, bulkCreate);
router.get('/', validateFilters, getProducts);
router.get('/:id', getProductById);
router.post('/', validateCreate, createProduct);
router.patch('/:id', validateUpdate, updateProduct);
router.delete('/:id/restore', restoreProduct);
router.delete('/:id', deleteProduct);

export default router;
