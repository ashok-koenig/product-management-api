import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
} from '../controllers/productController.js';
import { validateCreate, validateUpdate, validateFilters } from '../validators/productValidator.js';

const router = Router();

router.get('/', validateFilters, listProducts);
router.get('/:id', getProduct);
router.post('/', validateCreate, createProduct);
router.patch('/:id', validateUpdate, updateProduct);
router.delete('/:id/restore', restoreProduct);
router.delete('/:id', deleteProduct);

export default router;
