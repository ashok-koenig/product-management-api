import { v4 as uuidv4 } from 'uuid';

const VALID_CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
const VALID_STATUSES = ['active', 'inactive', 'discontinued'];

// Primary index: id → product object
const byId = new Map();
// Secondary index: sku → product object (includes archived — SKUs stay reserved)
const bySku = new Map();

const validate = (data, requireAll = true) => {
  const errors = [];

  if (requireAll || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string') errors.push('name is required');
  }
  if (requireAll || data.sku !== undefined) {
    if (!data.sku || typeof data.sku !== 'string') errors.push('sku is required');
  }
  if (data.category !== undefined && !VALID_CATEGORIES.includes(data.category)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (data.price !== undefined) {
    const rounded = Math.round(data.price * 100) / 100;
    if (typeof data.price !== 'number' || data.price <= 0 || rounded !== data.price) {
      errors.push('price must be a positive number with up to 2 decimal places');
    }
  }
  if (data.stock !== undefined) {
    if (!Number.isInteger(data.stock) || data.stock < 0) {
      errors.push('stock must be a non-negative integer');
    }
  }
  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  return errors;
};

/**
 * Returns all non-archived products that match the supplied filters.
 *
 * Products whose `archivedAt` timestamp is non-null are always excluded, so
 * soft-deleted entries are invisible to callers of this function.
 * All string comparisons are case-insensitive. Price bounds are inclusive.
 * Single-pass O(n) scan — conditions evaluated cheapest-first.
 *
 * @param {object} [filters={}] - Optional filter criteria; omit to return all active products.
 * @param {string}  [filters.search]   - Substring matched against `name` and `description`.
 * @param {string}  [filters.category] - Exact match against `category` (one of the valid category values).
 * @param {string}  [filters.status]   - Exact match against `status` (active | inactive | discontinued).
 * @param {number}  [filters.minPrice] - Inclusive lower bound on `price`; products with null price are excluded.
 * @param {number}  [filters.maxPrice] - Inclusive upper bound on `price`; products with null price are excluded.
 * @param {boolean} [filters.inStock]  - `true` keeps products with stock > 0; `false` keeps products with stock === 0.
 * @returns {object[]} Array of matching product objects (may be empty).
 */
const findAll = (filters = {}) => {
  const q = filters.search ? filters.search.toLowerCase() : null;
  const results = [];

  for (const p of byId.values()) {
    if (p.archivedAt !== null) continue;
    if (filters.category && p.category !== filters.category) continue;
    if (filters.status && p.status !== filters.status) continue;
    if (filters.minPrice != null && (p.price == null || p.price < filters.minPrice)) continue;
    if (filters.maxPrice != null && (p.price == null || p.price > filters.maxPrice)) continue;
    if (filters.inStock != null && (filters.inStock ? p.stock <= 0 : p.stock !== 0)) continue;
    if (q && !p.name.toLowerCase().includes(q) && !(p.description ?? '').toLowerCase().includes(q)) continue;
    results.push(p);
  }

  return results;
};

/**
 * Retrieves a single non-archived product by its UUID.
 *
 * Returns `null` for both unknown IDs and IDs that belong to soft-archived
 * products, so callers cannot distinguish the two cases intentionally — the
 * archived product is treated as gone from the public surface.
 *
 * @param {string} id - UUID of the product to retrieve.
 * @returns {object|null} The matching product object, or `null` if not found or archived.
 */
const findById = (id) => {
  const p = byId.get(id);
  return p && p.archivedAt === null ? p : null;
};

/**
 * Retrieves a product by its SKU, including soft-archived products.
 *
 * Unlike `findById`, this function intentionally returns archived products
 * because SKUs remain reserved after archival — the SKU index (`bySku`) is
 * never pruned. This allows callers to detect SKU conflicts before creating a
 * new product.
 *
 * @param {string} sku - The stock-keeping unit string to look up.
 * @returns {object|null} The matching product object (active or archived), or `null` if the SKU is unknown.
 */
const findBySku = (sku) => bySku.get(sku) ?? null;

/**
 * Creates and stores a new product, returning the persisted object.
 *
 * SKU uniqueness is enforced globally and permanently: a SKU belonging to a
 * soft-archived product is still considered taken and will trigger a 409.
 * `id` and `createdAt` are generated internally and must not be supplied.
 * Fields omitted from `data` receive the following defaults:
 *   - `description`: `null`
 *   - `category`:    `null`
 *   - `price`:       `null`
 *   - `stock`:       `0`
 *   - `status`:      `'active'`
 *
 * @param {object} data               - Product fields to persist.
 * @param {string} data.name          - Human-readable product name (required).
 * @param {string} data.sku           - Unique stock-keeping unit identifier (required).
 * @param {string} [data.description] - Optional long-form description.
 * @param {string} [data.category]    - Product category; must be one of the valid category values.
 * @param {number} [data.price]       - Unit price; must be a positive number with at most 2 decimal places.
 * @param {number} [data.stock]       - Non-negative integer unit count; defaults to `0`.
 * @param {string} [data.status]      - Lifecycle status (active | inactive | discontinued); defaults to `'active'`.
 * @returns {object} The newly created product object with generated `id` and `createdAt`.
 * @throws {Error} 400 — if any required field is missing or any field fails validation.
 * @throws {Error} 409 — if `data.sku` is already registered (including SKUs of archived products).
 */
const create = (data) => {
  const errors = validate(data, true);
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.status = 400;
    throw err;
  }

  if (bySku.has(data.sku)) {
    const err = new Error(`SKU '${data.sku}' already exists`);
    err.status = 409;
    throw err;
  }

  const product = {
    id: uuidv4(),
    name: data.name,
    sku: data.sku,
    description: data.description ?? null,
    category: data.category ?? null,
    price: data.price ?? null,
    stock: data.stock ?? 0,
    status: data.status ?? 'active',
    createdAt: new Date(),
    archivedAt: null,
  };

  byId.set(product.id, product);
  bySku.set(product.sku, product);
  return product;
};

/**
 * Applies a partial update (patch) to an existing, non-archived product.
 *
 * Only the fields present in `patch` are changed; omitted fields are left as-is.
 * `id` and `createdAt` are silently stripped from `patch` and cannot be changed.
 * When `patch.sku` differs from the current SKU, the secondary index (`bySku`)
 * is remapped atomically before the product object is mutated.
 * SKU uniqueness rules are identical to `create`: a SKU held by an archived
 * product still blocks reassignment.
 *
 * @param {string} id            - UUID of the product to update.
 * @param {object} patch         - Partial set of product fields to apply.
 * @param {string} [patch.name]        - Replacement name.
 * @param {string} [patch.sku]         - Replacement SKU; triggers uniqueness check if different from current.
 * @param {string} [patch.description] - Replacement description.
 * @param {string} [patch.category]    - Replacement category; must be a valid category value.
 * @param {number} [patch.price]       - Replacement price; must be positive with at most 2 decimal places.
 * @param {number} [patch.stock]       - Replacement stock; must be a non-negative integer.
 * @param {string} [patch.status]      - Replacement status (active | inactive | discontinued).
 * @returns {object|null} The mutated product object, or `null` if the product does not exist or is archived.
 * @throws {Error} 400 — if any supplied field fails validation.
 * @throws {Error} 409 — if `patch.sku` is already registered to a different product (including archived).
 */
const update = (id, patch) => {
  const product = byId.get(id);
  if (!product || product.archivedAt !== null) return null;

  const errors = validate(patch, false);
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.status = 400;
    throw err;
  }

  if (patch.sku && patch.sku !== product.sku) {
    if (bySku.has(patch.sku)) {
      const err = new Error(`SKU '${patch.sku}' already exists`);
      err.status = 409;
      throw err;
    }
    // Remap secondary index before mutating the object
    bySku.delete(product.sku);
    bySku.set(patch.sku, product);
  }

  const { id: _id, createdAt: _createdAt, ...allowed } = patch;
  Object.assign(product, allowed);
  return product;
};

/**
 * Soft-archives a product by stamping its `archivedAt` timestamp.
 *
 * The product record is **not** removed from memory. After archival:
 *   - `findAll` and `findById` will no longer return it.
 *   - `findBySku` still resolves the SKU, keeping it permanently reserved.
 * Calling this function on an already-archived product is a no-op that returns `null`.
 *
 * @param {string} id - UUID of the product to archive.
 * @returns {object|null} The updated product object (with `archivedAt` set), or `null` if not found or already archived.
 */
const deleteById = (id) => {
  const product = byId.get(id);
  if (!product || product.archivedAt !== null) return null;
  product.archivedAt = new Date();
  return product;
};

/**
 * Reverses a soft-archive by clearing the product's `archivedAt` timestamp.
 *
 * After restoration the product becomes visible to `findAll` and `findById`
 * again. If the product has never been archived (i.e., `archivedAt` is already
 * `null`), the function returns `null` without making any changes.
 *
 * @param {string} id - UUID of the product to restore.
 * @returns {object|null} The updated product object (with `archivedAt` reset to `null`), or `null` if not found or not currently archived.
 */
const restore = (id) => {
  const product = byId.get(id);
  if (!product || product.archivedAt === null) return null;
  product.archivedAt = null;
  return product;
};

/**
 * Clears all in-memory product data, resetting both the primary and SKU indexes.
 *
 * Intended exclusively for use in test suites to guarantee a clean slate
 * between test cases. Must not be called in production code.
 *
 * @returns {void}
 */
const _reset = () => { byId.clear(); bySku.clear(); };

export default { findAll, findById, findBySku, create, update, delete: deleteById, restore, _reset };