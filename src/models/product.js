import { v4 as uuidv4 } from 'uuid';

const VALID_CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
const VALID_STATUSES = ['active', 'inactive', 'discontinued'];

const store = [];

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

const findAll = (filters = {}) => {
  let results = [...store];
  if (filters.category) results = results.filter(p => p.category === filters.category);
  if (filters.status) results = results.filter(p => p.status === filters.status);
  if (filters.name) {
    const q = filters.name.toLowerCase();
    results = results.filter(p => p.name.toLowerCase().includes(q));
  }
  return results;
};

const findById = (id) => store.find(p => p.id === id) ?? null;

const findBySku = (sku) => store.find(p => p.sku === sku) ?? null;

const create = (data) => {
  const errors = validate(data, true);
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.status = 400;
    throw err;
  }

  if (findBySku(data.sku)) {
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
  };

  store.push(product);
  return product;
};

const update = (id, patch) => {
  const index = store.findIndex(p => p.id === id);
  if (index === -1) return null;

  const errors = validate(patch, false);
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.status = 400;
    throw err;
  }

  if (patch.sku && patch.sku !== store[index].sku) {
    const conflict = findBySku(patch.sku);
    if (conflict) {
      const err = new Error(`SKU '${patch.sku}' already exists`);
      err.status = 409;
      throw err;
    }
  }

  const { id: _id, createdAt: _createdAt, ...allowed } = patch;
  store[index] = { ...store[index], ...allowed };
  return store[index];
};

const deleteById = (id) => {
  const index = store.findIndex(p => p.id === id);
  if (index === -1) return null;
  const [deleted] = store.splice(index, 1);
  return deleted;
};

export default { findAll, findById, findBySku, create, update, delete: deleteById };
