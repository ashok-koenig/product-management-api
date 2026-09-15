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

const isValidPrice = (price) => {
  if (typeof price !== 'number' || Number.isNaN(price) || price <= 0) return false;
  return Math.round(price * 100) === price * 100;
};

const validateCreate = (data) => {
  const { name, sku, description, category, price, stock, status } = data;

  if (!name || typeof name !== 'string') {
    throw new ApiError(400, 'name is required and must be a string');
  }
  if (!sku || typeof sku !== 'string') {
    throw new ApiError(400, 'sku is required and must be a string');
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new ApiError(400, 'description must be a string');
  }
  if (!category || !CATEGORIES.includes(category)) {
    throw new ApiError(400, `category is required and must be one of: ${CATEGORIES.join(', ')}`);
  }
  if (!isValidPrice(price)) {
    throw new ApiError(400, 'price is required, must be a positive number with up to 2 decimal places');
  }
  if (!Number.isInteger(stock) || stock < 0) {
    throw new ApiError(400, 'stock is required and must be a non-negative integer');
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${STATUSES.join(', ')}`);
  }
};

const validatePatch = (patch) => {
  const { name, sku, description, category, price, stock, status } = patch;

  if (name !== undefined && (!name || typeof name !== 'string')) {
    throw new ApiError(400, 'name must be a non-empty string');
  }
  if (sku !== undefined && (!sku || typeof sku !== 'string')) {
    throw new ApiError(400, 'sku must be a non-empty string');
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new ApiError(400, 'description must be a string');
  }
  if (category !== undefined && !CATEGORIES.includes(category)) {
    throw new ApiError(400, `category must be one of: ${CATEGORIES.join(', ')}`);
  }
  if (price !== undefined && !isValidPrice(price)) {
    throw new ApiError(400, 'price must be a positive number with up to 2 decimal places');
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    throw new ApiError(400, 'stock must be a non-negative integer');
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${STATUSES.join(', ')}`);
  }
};

export const findAll = (filters = {}) => {
  const { category, status } = filters;
  return products.filter((product) => {
    if (category && product.category !== category) return false;
    if (status && product.status !== status) return false;
    return true;
  });
};

export const findById = (id) => products.find((product) => product.id === id);

export const findBySku = (sku) => products.find((product) => product.sku === sku);

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
  };

  products.push(product);
  return product;
};

export const update = (id, patch) => {
  const product = findById(id);
  if (!product) {
    throw new ApiError(404, `Product with id "${id}" not found`);
  }

  validatePatch(patch);

  if (patch.sku !== undefined && patch.sku !== product.sku && findBySku(patch.sku)) {
    throw new ApiError(409, `A product with sku "${patch.sku}" already exists`);
  }

  Object.assign(product, patch);
  return product;
};

export const remove = (id) => {
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) {
    throw new ApiError(404, `Product with id "${id}" not found`);
  }
  return products.splice(index, 1)[0];
};

export { remove as delete, ApiError, isUuid, CATEGORIES, STATUSES };
