import Product from '../models/product.js';

export const getProducts = (req, res) => {
  const { category, status, name } = req.query;
  const data = Product.findAll({ category, status, name });
  res.json({ success: true, data, error: null });
};

export const getProductById = (req, res, next) => {
  const product = Product.findById(req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data: product, error: null });
};

export const createProduct = (req, res, next) => {
  try {
    const product = Product.create(req.body);
    res.status(201).json({ success: true, data: product, error: null });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = (req, res, next) => {
  try {
    const product = Product.update(req.params.id, req.body);
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      return next(err);
    }
    res.json({ success: true, data: product, error: null });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = (req, res, next) => {
  const product = Product.delete(req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data: product, error: null });
};
