import Product from '../models/product.js';
import catchAsync from '../middleware/catchAsync.js';

const PATCH_ALLOWED = new Set(['name', 'description', 'category', 'price', 'stock', 'status']);

/**
 * Returns all non-archived products that match the query-string filters.
 *
 * All query parameters are optional; omitting them returns every active product.
 * `minPrice` and `maxPrice` are coerced to floats; `inStock` is coerced to a
 * boolean (`'true'` → `true`, anything else → `false`). Unrecognised query
 * parameters are silently ignored.
 *
 * @param {import("express").Request}  req                   - Express request object.
 * @param {string} [req.query.category]  - Filter by product category (exact match).
 * @param {string} [req.query.status]    - Filter by lifecycle status (exact match).
 * @param {string} [req.query.minPrice]  - Inclusive lower price bound (coerced to float).
 * @param {string} [req.query.maxPrice]  - Inclusive upper price bound (coerced to float).
 * @param {string} [req.query.inStock]   - `'true'` to require stock > 0; any other value to require stock === 0.
 * @param {string} [req.query.search]    - Case-insensitive substring search on name and description.
 * @param {import("express").Response}  res  - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function (unused; included for handler signature consistency).
 *
 * @returns {void} Responds with `200 OK` and `{ success: true, data: Product[], error: null }`.
 */
export const getProducts = catchAsync((req, res) => {
  const { category, status, minPrice, maxPrice, inStock, search } = req.query;
  const filters = { category, status, search };
  if (minPrice !== undefined) filters.minPrice = parseFloat(minPrice);
  if (maxPrice !== undefined) filters.maxPrice = parseFloat(maxPrice);
  if (inStock !== undefined) filters.inStock = inStock === 'true';
  const data = Product.findAll(filters);
  res.json({ success: true, data, error: null });
});

/**
 * Returns a single product by its UUID route parameter.
 *
 * Archived products are treated as absent — the model's `findById` returns
 * `null` for both unknown and soft-deleted IDs, so both cases surface as 404.
 *
 * @param {import("express").Request}  req          - Express request object.
 * @param {string} req.params.id                    - UUID of the product to fetch.
 * @param {import("express").Response}  res         - Express response object.
 * @param {import("express").NextFunction} next      - Express next middleware function.
 *
 * @returns {void} Responds with:
 *   - `200 OK`       — `{ success: true, data: Product, error: null }`
 *   - `404 Not Found` — product does not exist or has been archived; forwarded via `next(err)`.
 */
export const getProductById = catchAsync((req, res, next) => {
  const product = Product.findById(req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data: product, error: null });
});

/**
 * Creates a new product from the request body and returns it.
 *
 * Validation and SKU-uniqueness enforcement are handled by the model layer.
 * Errors thrown there carry a `.status` property and are forwarded to the
 * global error handler by `catchAsync`.
 *
 * @param {import("express").Request}  req          - Express request object.
 * @param {object} req.body                         - Raw product fields; see `Product.create` for accepted keys.
 * @param {import("express").Response}  res         - Express response object.
 * @param {import("express").NextFunction} next      - Express next middleware function (errors forwarded by `catchAsync`).
 *
 * @returns {void} Responds with:
 *   - `201 Created`   — `{ success: true, data: Product, error: null }`
 *   - `400 Bad Request` — missing required fields or invalid field values.
 *   - `409 Conflict`    — `sku` is already registered (including archived products).
 */
export const createProduct = catchAsync((req, res) => {
  const product = Product.create(req.body);
  res.status(201).json({ success: true, data: product, error: null });
});

export const createBulkProducts = catchAsync((req, res) => {
  const products = Product.createBulk(req.body);
  res.status(201).json({ success: true, data: products, error: null });
});

/**
 * Partially updates an existing, non-archived product (PATCH semantics).
 *
 * Only the keys present in `PATCH_ALLOWED` (`name`, `description`, `category`,
 * `price`, `stock`, `status`) are forwarded to the model — all other body keys
 * are silently discarded, including `id` and `sku`. To change a SKU, use a
 * dedicated endpoint or include `sku` in the allowed set.
 *
 * @param {import("express").Request}  req          - Express request object.
 * @param {string} req.params.id                    - UUID of the product to update.
 * @param {object} req.body                         - Fields to apply; unrecognised keys are stripped before reaching the model.
 * @param {import("express").Response}  res         - Express response object.
 * @param {import("express").NextFunction} next      - Express next middleware function.
 *
 * @returns {void} Responds with:
 *   - `200 OK`          — `{ success: true, data: Product, error: null }`
 *   - `400 Bad Request`  — one or more allowed fields failed validation.
 *   - `404 Not Found`    — product does not exist or is archived; forwarded via `next(err)`.
 *   - `409 Conflict`     — `sku` change conflicts with an existing SKU (if `sku` were ever added to `PATCH_ALLOWED`).
 */
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

/**
 * Soft-archives a product by stamping its `archivedAt` timestamp.
 *
 * The record is retained in memory; its SKU remains permanently reserved so
 * no future product can reuse it. Archived products are invisible to
 * `getProducts` and `getProductById`. Archiving an already-archived product
 * is treated as "not found" by the model and surfaces as 404 here.
 *
 * @param {import("express").Request}  req          - Express request object.
 * @param {string} req.params.id                    - UUID of the product to archive.
 * @param {import("express").Response}  res         - Express response object.
 * @param {import("express").NextFunction} next      - Express next middleware function.
 *
 * @returns {void} Responds with:
 *   - `204 No Content`  — product successfully archived; body is empty.
 *   - `404 Not Found`   — product does not exist or is already archived; forwarded via `next(err)`.
 */
export const deleteProduct = catchAsync((req, res, next) => {
  const product = Product.delete(req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.status(204).send();
});

/**
 * Restores a soft-archived product by clearing its `archivedAt` timestamp.
 *
 * After a successful restore the product becomes visible again to `getProducts`
 * and `getProductById`. The model returns `null` for both unknown IDs and
 * products that are currently active (not archived), so both cases surface
 * as 404 here.
 *
 * @param {import("express").Request}  req          - Express request object.
 * @param {string} req.params.id                    - UUID of the archived product to restore.
 * @param {import("express").Response}  res         - Express response object.
 * @param {import("express").NextFunction} next      - Express next middleware function.
 *
 * @returns {void} Responds with:
 *   - `200 OK`          — `{ success: true, data: Product, error: null }`
 *   - `404 Not Found`   — product does not exist or is not currently archived; forwarded via `next(err)`.
 */
export const restoreProduct = catchAsync((req, res, next) => {
  const product = Product.restore(req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    return next(err);
  }
  res.json({ success: true, data: product, error: null });
});
