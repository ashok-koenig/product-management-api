import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

const asyncHandler = (handler) => (req, res, next) => {
  handler(req, res, next).catch(next);
};

const router = Router();

router.get('/', asyncHandler(listProducts));
router.get('/:id', asyncHandler(getProduct));
router.post('/', asyncHandler(createProduct));
router.patch('/:id', asyncHandler(updateProduct));
router.delete('/:id', asyncHandler(deleteProduct));

export default router;
