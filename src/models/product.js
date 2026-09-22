import { v4 as uuidv4, validate as isUuid } from 'uuid';

const CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
const STATUSES = ['active', 'inactive', 'discontinued'];

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const products = [];

/**
 * Index Maps for O(1) category/status lookups, keyed by category/status value
 * to a Set of the matching product objects.
 *
 * Indexing rule: only ACTIVE (non-archived) products are indexed. A product is
 * added to its category/status buckets on create() and restore(), and removed
 * from its buckets on remove() (soft-archive). While a product is archived it
 * is absent from both indexes entirely, which mirrors the fact that findAll()
 * always excludes archived products — the indexed sets can therefore be used
 * directly as "already archived-filtered" candidate pools.
 */
const categoryIndex = new Map();
const statusIndex = new Map();

const addToIndexBucket = (map, key, product) => {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(product);
};

const removeFromIndexBucket = (map, key, product) => {
  map.get(key)?.delete(product);
};

const addToIndexes = (product) => {
  addToIndexBucket(categoryIndex, product.category, product);
  addToIndexBucket(statusIndex, product.status, product);
};

const removeFromIndexes = (product) => {
  removeFromIndexBucket(categoryIndex, product.category, product);
  removeFromIndexBucket(statusIndex, product.status, product);
};

const isValidPrice = (price) => {
  if (typeof price !== 'number' || Number.isNaN(price) || price <= 0) return false;
  return Number(price.toFixed(2)) === price;
};

const validateCreate = (data) => {
  const { name, sku, description, category, price, stock, status } = data;

  if (!name || typeof name !== 'string') {
    throw new ApiError(422, 'name is required and must be a string');
  }
  if (!sku || typeof sku !== 'string') {
    throw new ApiError(422, 'sku is required and must be a string');
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new ApiError(422, 'description must be a string');
  }
  if (!category || !CATEGORIES.includes(category)) {
    throw new ApiError(422, `category is required and must be one of: ${CATEGORIES.join(', ')}`);
  }
  if (!isValidPrice(price)) {
    throw new ApiError(422, 'price is required, must be a positive number with up to 2 decimal places');
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new ApiError(422, 'stock is required and must be a non-negative integer');
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    throw new ApiError(422, `status must be one of: ${STATUSES.join(', ')}`);
  }
};

const validatePatch = (patch) => {
  const { name, sku, description, category, price, stock, status } = patch;

  if (name !== undefined && (!name || typeof name !== 'string')) {
    throw new ApiError(422, 'name must be a non-empty string');
  }
  if (sku !== undefined && (!sku || typeof sku !== 'string')) {
    throw new ApiError(422, 'sku must be a non-empty string');
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new ApiError(422, 'description must be a string');
  }
  if (category !== undefined && !CATEGORIES.includes(category)) {
    throw new ApiError(422, `category must be one of: ${CATEGORIES.join(', ')}`);
  }
  if (price !== undefined && !isValidPrice(price)) {
    throw new ApiError(422, 'price must be a positive number with up to 2 decimal places');
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    throw new ApiError(422, 'stock must be a non-negative integer');
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    throw new ApiError(422, `status must be one of: ${STATUSES.join(', ')}`);
  }
};

/**
 * Returns the candidate product list for a category/status filtered findAll(),
 * using the O(1) index Maps instead of scanning the full products array.
 * When both category and status are given, intersects the two indexed Sets
 * (iterating the smaller one for efficiency).
 * @param {string} [category] - Category to look up in categoryIndex.
 * @param {string} [status] - Status to look up in statusIndex.
 * @returns {Object[]} Candidate products (already archived-filtered, since
 *   only active products are indexed) still needing the remaining filters applied.
 */
const getIndexedCandidates = (category, status) => {
  if (category && status) {
    const byCategory = categoryIndex.get(category) ?? new Set();
    const byStatus = statusIndex.get(status) ?? new Set();
    const [smaller, larger] = byCategory.size <= byStatus.size ? [byCategory, byStatus] : [byStatus, byCategory];
    return [...smaller].filter((product) => larger.has(product));
  }
  if (category) return [...(categoryIndex.get(category) ?? new Set())];
  return [...(statusIndex.get(status) ?? new Set())];
};

/**
 * Returns all active (non-archived) products matching the given filters.
 * Soft-archived products (archivedAt !== null) are always excluded from results.
 * @param {Object} [filters={}] - Optional filter criteria.
 * @param {string} [filters.category] - Restrict results to this exact category.
 * @param {string} [filters.status] - Restrict results to this exact status.
 * @param {number} [filters.minPrice] - Minimum price (inclusive).
 * @param {number} [filters.maxPrice] - Maximum price (inclusive).
 * @param {boolean} [filters.inStock] - When true, only products with stock > 0; when false, only out-of-stock products.
 * @param {string} [filters.search] - Case-insensitive substring match against name or description.
 * @returns {Object[]} Array of matching product objects.
 */
export const findAll = (filters = {}) => {
  const { category, status, minPrice, maxPrice, inStock, search } = filters;
  const searchTerm = search ? search.toLowerCase() : undefined;

  const candidates = category || status ? getIndexedCandidates(category, status) : products;

  return candidates.filter((product) => {
    if (product.archivedAt !== null) return false;
    if (minPrice !== undefined && product.price < minPrice) return false;
    if (maxPrice !== undefined && product.price > maxPrice) return false;
    if (inStock !== undefined && (product.stock > 0) !== inStock) return false;
    if (searchTerm) {
      const name = product.name?.toLowerCase() ?? '';
      const description = product.description?.toLowerCase() ?? '';
      if (!name.includes(searchTerm) && !description.includes(searchTerm)) return false;
    }
    return true;
  });
};

/**
 * Finds a single active (non-archived) product by its id.
 * Soft-archived products are not returned even if the id matches.
 * @param {string} id - The product's UUID.
 * @returns {Object|undefined} The matching product, or undefined if not found or archived.
 */
export const findById = (id) =>
  products.find((product) => product.id === id && product.archivedAt === null);

/**
 * Finds a product by its SKU, regardless of archive status.
 * Used to enforce SKU uniqueness across both active and archived products.
 * @param {string} sku - The product's SKU.
 * @returns {Object|undefined} The matching product, or undefined if not found.
 */
export const findBySku = (sku) => products.find((product) => product.sku === sku);

/**
 * Validates and creates a new product.
 * SKU must be unique across all products, including archived ones.
 * @param {Object} data - The product data.
 * @param {string} data.name - Product name.
 * @param {string} data.sku - Product SKU; must be unique.
 * @param {string} [data.description] - Optional product description.
 * @param {string} data.category - Must be one of CATEGORIES.
 * @param {number} data.price - Positive number with up to 2 decimal places.
 * @param {number} data.stock - Non-negative integer.
 * @param {string} [data.status='active'] - Must be one of STATUSES; defaults to 'active'.
 * @returns {Object} The newly created product, including generated id, createdAt, and archivedAt: null.
 * @throws {ApiError} 422 if any field fails validation.
 * @throws {ApiError} 409 if a product with the given sku already exists.
 */
export const create = (data) => {
  validateCreate(data);

  if (findBySku(data.sku)) {
    throw new ApiError(409, `A product with sku "${data.sku}" already exists`);
  }

  const product = {
    id: uuidv4(),
    name: data.name,
    sku: data.sku,
    description: data.description,
    category: data.category,
    price: data.price,
    stock: data.stock,
    status: data.status ?? 'active',
    createdAt: new Date(),
    archivedAt: null,
  };

  products.push(product);
  addToIndexes(product);
  return product;
};

/**
 * Validates and applies a partial update to an active product.
 * Only defined fields in the patch are applied; a changed sku is checked for uniqueness against all other products.
 * @param {string} id - The id of the active product to update.
 * @param {Object} patch - Partial product fields to update.
 * @param {string} [patch.name] - New name; must be a non-empty string if provided.
 * @param {string} [patch.sku] - New sku; must be unique if changed.
 * @param {string} [patch.description] - New description.
 * @param {string} [patch.category] - Must be one of CATEGORIES.
 * @param {number} [patch.price] - Positive number with up to 2 decimal places.
 * @param {number} [patch.stock] - Non-negative integer.
 * @param {string} [patch.status] - Must be one of STATUSES.
 * @returns {Object} The updated product.
 * @throws {ApiError} 404 if no active product exists with the given id.
 * @throws {ApiError} 422 if any provided field fails validation.
 * @throws {ApiError} 409 if the new sku is already used by another product.
 */
export const update = (id, patch) => {
  const product = findById(id);
  if (!product) {
    throw new ApiError(404, `Product with id "${id}" not found`);
  }

  validatePatch(patch);

  if (patch.sku !== undefined && patch.sku !== product.sku && findBySku(patch.sku)) {
    throw new ApiError(409, `A product with sku "${patch.sku}" already exists`);
  }

  const { name, sku, description, category, price, stock, status } = patch;
  const allowedPatch = { name, sku, description, category, price, stock, status };
  Object.keys(allowedPatch).forEach((key) => {
    if (allowedPatch[key] === undefined) delete allowedPatch[key];
  });

  const categoryChanged = allowedPatch.category !== undefined && allowedPatch.category !== product.category;
  const statusChanged = allowedPatch.status !== undefined && allowedPatch.status !== product.status;

  // product is always active here (findById only returns non-archived products),
  // so it is currently present in both index buckets and must be moved.
  if (categoryChanged) removeFromIndexBucket(categoryIndex, product.category, product);
  if (statusChanged) removeFromIndexBucket(statusIndex, product.status, product);

  Object.assign(product, allowedPatch);

  if (categoryChanged) addToIndexBucket(categoryIndex, product.category, product);
  if (statusChanged) addToIndexBucket(statusIndex, product.status, product);

  return product;
};

/**
 * Validates and applies a status change to a batch of active products.
 * Atomic: if any id fails validation or does not match an active product,
 * no products are modified.
 * @param {string[]} ids - Ids of the active products to update; must be a non-empty array of valid UUIDs.
 * @param {string} status - The new status; must be one of STATUSES.
 * @returns {Object[]} The updated products, in the same order as ids.
 * @throws {ApiError} 422 if ids is not a non-empty array of valid UUIDs, or status is not a valid enum value.
 * @throws {ApiError} 404 if any id does not match an active product.
 */
export const updateManyStatus = (ids, status) => {
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string' && isUuid(id))) {
    throw new ApiError(422, 'ids is required and must be a non-empty array of valid UUIDs');
  }
  if (!status || !STATUSES.includes(status)) {
    throw new ApiError(422, `status is required and must be one of: ${STATUSES.join(', ')}`);
  }

  const matched = ids.map((id) => {
    const product = findById(id);
    if (!product) {
      throw new ApiError(404, `Product with id "${id}" not found`);
    }
    return product;
  });

  matched.forEach((product) => {
    if (product.status === status) return;
    removeFromIndexBucket(statusIndex, product.status, product);
    product.status = status;
    addToIndexBucket(statusIndex, product.status, product);
  });

  return matched;
};

/**
 * Soft-archives an active product by setting its archivedAt timestamp.
 * The product is not removed from the store, only excluded from findAll/findById results until restored.
 * @param {string} id - The id of the active product to archive.
 * @returns {Object} The archived product, with archivedAt set to the current date.
 * @throws {ApiError} 404 if no active product exists with the given id.
 */
export const remove = (id) => {
  const product = findById(id);
  if (!product) {
    throw new ApiError(404, `Product with id "${id}" not found`);
  }
  product.archivedAt = new Date();
  removeFromIndexes(product);
  return product;
};

/**
 * Restores a previously soft-archived product by clearing its archivedAt timestamp.
 * Only matches products that are currently archived; has no effect on already-active products.
 * @param {string} id - The id of the archived product to restore.
 * @returns {Object} The restored product, with archivedAt reset to null.
 * @throws {ApiError} 404 if no archived product exists with the given id.
 */
export const restore = (id) => {
  const product = products.find((p) => p.id === id && p.archivedAt !== null);
  if (!product) {
    throw new ApiError(404, `Product with id "${id}" not found`);
  }
  product.archivedAt = null;
  addToIndexes(product);
  return product;
};

const resetStore = () => {
  products.length = 0;
  categoryIndex.clear();
  statusIndex.clear();
};

export {
  remove as delete,
  ApiError,
  isUuid,
  isValidPrice,
  CATEGORIES,
  STATUSES,
  resetStore,
};