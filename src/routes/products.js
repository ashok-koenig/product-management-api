import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  createBulkProducts,
  updateProduct,
  bulkUpdateStatus,
  deleteProduct,
  restoreProduct,
} from '../controllers/productController.js';
import {
  validateCreate,
  validateBulk,
  validateUpdate,
  validateBulkStatus,
  validateFilters,
} from '../validators/productValidator.js';

const router = Router();

router.post('/bulk', validateBulk, createBulkProducts);
router.patch('/bulk-status', validateBulkStatus, bulkUpdateStatus);
router.get('/', validateFilters, getProducts);
router.get('/:id', getProductById);
router.post('/', validateCreate, createProduct);
router.patch('/:id', validateUpdate, updateProduct);
router.delete('/:id/restore', restoreProduct);
router.delete('/:id', deleteProduct);

export default router;
