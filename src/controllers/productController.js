import * as Product from '../models/product.js';
import { ApiError, isUuid } from '../models/product.js';
import { catchAsync } from '../middleware/catchAsync.js';

export const listProducts = catchAsync(async (req, res) => {
  const { category, status, minPrice, maxPrice, inStock, search } = req.query;
  const products = Product.findAll({ category, status, minPrice, maxPrice, inStock, search });
  res.json({ success: true, data: products, error: null });
});

export const getProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) {
    throw new ApiError(400, `"${id}" is not a valid product id`);
  }

  const product = Product.findById(id);
  if (!product) {
    throw new ApiError(404, `Product with id "${id}" not found`);
  }

  res.json({ success: true, data: product, error: null });
});

export const createProduct = catchAsync(async (req, res) => {
  const product = Product.create(req.body ?? {});
  res.status(201).json({ success: true, data: product, error: null });
});

export const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) {
    throw new ApiError(400, `"${id}" is not a valid product id`);
  }

  const product = Product.update(id, req.body ?? {});
  res.json({ success: true, data: product, error: null });
});

export const deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) {
    throw new ApiError(400, `"${id}" is not a valid product id`);
  }

  Product.delete(id);
  res.status(204).send();
});

export const restoreProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) {
    throw new ApiError(400, `"${id}" is not a valid product id`);
  }

  const product = Product.restore(id);
  res.json({ success: true, data: product, error: null });
});
