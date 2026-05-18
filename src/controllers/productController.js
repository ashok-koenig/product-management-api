import Product from '../models/product.js';
import catchAsync from '../middleware/catchAsync.js';

const PATCH_ALLOWED = new Set(['name', 'description', 'category', 'price', 'stock', 'status']);

export const getProducts = catchAsync((req, res) => {
  const { category, status, minPrice, maxPrice, inStock, search } = req.query;
  const filters = { category, status, search };
  if (minPrice !== undefined) filters.minPrice = parseFloat(minPrice);
  if (maxPrice !== undefined) filters.maxPrice = parseFloat(maxPrice);
  if (inStock !== undefined) filters.inStock = inStock === 'true';
  const data = Product.findAll(filters);
  res.json({ success: true, data, error: null });
});

export const getProductById = catchAsync((req, res, next) => {
  const product = Product.findById(req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data: product, error: null });
});

export const createProduct = catchAsync((req, res) => {
  const product = Product.create(req.body);
  res.status(201).json({ success: true, data: product, error: null });
});

export const updateProduct = catchAsync((req, res, next) => {
  const patch = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => PATCH_ALLOWED.has(k))
  );
  const product = Product.update(req.params.id, patch);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data: product, error: null });
});

export const deleteProduct = catchAsync((req, res, next) => {
  const product = Product.delete(req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.status(204).send();
});

export const restoreProduct = catchAsync((req, res, next) => {
  const product = Product.restore(req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data: product, error: null });
});
