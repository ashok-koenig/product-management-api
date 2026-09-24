/**
 * Request handlers for the /products routes; wraps src/models/product.js
 * with HTTP concerns (status codes, the { success, data, error } envelope).
 */
import * as Product from "../models/product.js";
import { ApiError } from "../models/product.js";
import { catchAsync } from "../middleware/catchAsync.js";

/**
 * Lists active products, optionally filtered by query params.
 * @param {import("express").Request} req - Query params: category, status, minPrice, maxPrice, inStock, search.
 * @param {import("express").Response} res - Sends 200 with the array of matching products.
 * @param {import("express").NextFunction} next - Not used directly; errors are forwarded by catchAsync.
 * @returns {Promise<void>}
 * Status codes: 200 (success).
 */
export const listProducts = catchAsync(async (req, res) => {
  const { category, status, minPrice, maxPrice, inStock, search } = req.query;
  const products = Product.findAll({
    category,
    status,
    minPrice,
    maxPrice,
    inStock: inStock === undefined ? undefined : inStock === "true",
    search,
  });
  res.json({ success: true, data: products, error: null });
});

/**
 * Fetches a single active product by id.
 * @param {import("express").Request} req - req.params.id must be a valid UUID.
 * @param {import("express").Response} res - Sends 200 with the matching product.
 * @param {import("express").NextFunction} next - Not used directly; errors are forwarded by catchAsync.
 * @returns {Promise<void>}
 * Status codes: 200 (success), 400 (id is not a valid UUID), 404 (no active product with that id).
 */
export const getProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const product = Product.findById(id);
  if (!product) {
    throw new ApiError(404, `Product with id "${id}" not found`);
  }

  res.json({ success: true, data: product, error: null });
});

/**
 * Creates a new product.
 * @param {import("express").Request} req - req.body holds the product fields (name, sku, category, price, stock, description?, status?).
 * @param {import("express").Response} res - Sends 201 with the created product.
 * @param {import("express").NextFunction} next - Not used directly; errors are forwarded by catchAsync.
 * @returns {Promise<void>}
 * Status codes: 201 (created), 422 (validation failure), 409 (sku already exists).
 */
export const createProduct = catchAsync(async (req, res) => {
  const { name, sku, description, category, price, stock, status } =
    req.body ?? {};
  const product = Product.create({
    name,
    sku,
    description,
    category,
    price,
    stock,
    status,
  });
  res.status(201).json({ success: true, data: product, error: null });
});

/**
 * Applies a partial update to an active product.
 * @param {import("express").Request} req - req.params.id must be a valid UUID; req.body holds the fields to patch.
 * @param {import("express").Response} res - Sends 200 with the updated product.
 * @param {import("express").NextFunction} next - Not used directly; errors are forwarded by catchAsync.
 * @returns {Promise<void>}
 * Status codes: 200 (success), 400 (id is not a valid UUID), 404 (no active product with that id), 422 (validation failure), 409 (new sku already exists).
 */
export const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, sku, description, category, price, stock, status } =
    req.body ?? {};
  const product = Product.update(id, {
    name,
    sku,
    description,
    category,
    price,
    stock,
    status,
  });
  res.json({ success: true, data: product, error: null });
});

/**
 * Applies a status change to a batch of active products atomically.
 * @param {import("express").Request} req - req.body holds { ids: string[], status }.
 * @param {import("express").Response} res - Sends 200 with the array of updated products.
 * @param {import("express").NextFunction} next - Not used directly; errors are forwarded by catchAsync.
 * @returns {Promise<void>}
 * Status codes: 200 (success), 422 (validation failure), 404 (an id does not match an active product).
 */
export const bulkUpdateStatus = catchAsync(async (req, res) => {
  const { ids, status } = req.body ?? {};
  const products = Product.updateManyStatus(ids, status);
  res.json({ success: true, data: products, error: null });
});

/**
 * Soft-archives an active product.
 * @param {import("express").Request} req - req.params.id must be a valid UUID.
 * @param {import("express").Response} res - Sends 204 with no body.
 * @param {import("express").NextFunction} next - Not used directly; errors are forwarded by catchAsync.
 * @returns {Promise<void>}
 * Status codes: 204 (archived, no content), 400 (id is not a valid UUID), 404 (no active product with that id).
 */
export const deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  Product.delete(id);
  res.status(204).send();
});

/**
 * Restores a previously soft-archived product.
 * @param {import("express").Request} req - req.params.id must be a valid UUID.
 * @param {import("express").Response} res - Sends 200 with the restored product.
 * @param {import("express").NextFunction} next - Not used directly; errors are forwarded by catchAsync.
 * @returns {Promise<void>}
 * Status codes: 200 (success), 400 (id is not a valid UUID), 404 (no archived product with that id).
 */
export const restoreProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const product = Product.restore(id);
  res.json({ success: true, data: product, error: null });
});
