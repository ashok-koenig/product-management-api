import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  createBulkProducts,
  updateProduct,
  deleteProduct,
  restoreProduct,
} from '../controllers/productController.js';
import {
  validateCreate,
  validateBulk,
  validateUpdate,
  validateFilters,
} from '../validators/productValidator.js';

const router = Router();

router.get('/', validateFilters, getProducts);
router.get('/:id', getProductById);
router.post('/', validateCreate, createProduct);
router.post('/bulk', validateBulk, createBulkProducts);
router.patch('/:id', validateUpdate, updateProduct);
router.delete('/:id/restore', restoreProduct);
router.delete('/:id', deleteProduct);

export default router;
