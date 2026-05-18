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

// Single-pass O(n) scan — avoids allocating intermediate arrays for each filter.
// Conditions are checked in cheapest-first order so later (costlier) checks
// are only reached when all earlier ones pass.
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

// O(1) — direct Map lookup
const findById = (id) => {
  const p = byId.get(id);
  return p && p.archivedAt === null ? p : null;
};

// O(1) — direct Map lookup
const findBySku = (sku) => bySku.get(sku) ?? null;

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

const deleteById = (id) => {
  const product = byId.get(id);
  if (!product || product.archivedAt !== null) return null;
  product.archivedAt = new Date();
  return product;
};

const restore = (id) => {
  const product = byId.get(id);
  if (!product) return null;
  product.archivedAt = null;
  return product;
};

export default { findAll, findById, findBySku, create, update, delete: deleteById, restore };
