import { body, query, validationResult } from 'express-validator';
import { ApiError, isValidPrice, CATEGORIES, STATUSES } from '../models/product.js';

const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, errors.array({ onlyFirstError: true })[0].msg));
  }
  return next();
};

export const validateCreate = [
  body('name').custom((value) => {
    if (!value || typeof value !== 'string') {
      throw new Error('name is required and must be a string');
    }
    return true;
  }),
  body('sku').custom((value) => {
    if (!value || typeof value !== 'string') {
      throw new Error('sku is required and must be a string');
    }
    return true;
  }),
  body('description').custom((value) => {
    if (value !== undefined && typeof value !== 'string') {
      throw new Error('description must be a string');
    }
    return true;
  }),
  body('category').custom((value) => {
    if (!value || !CATEGORIES.includes(value)) {
      throw new Error(`category is required and must be one of: ${CATEGORIES.join(', ')}`);
    }
    return true;
  }),
  body('price').custom((value) => {
    if (!isValidPrice(value)) {
      throw new Error('price is required, must be a positive number with up to 2 decimal places');
    }
    return true;
  }),
  body('stock').custom((value) => {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('stock is required and must be a non-negative integer');
    }
    return true;
  }),
  body('status').custom((value) => {
    if (value !== undefined && !STATUSES.includes(value)) {
      throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
    }
    return true;
  }),
  checkValidation,
];

export const validateUpdate = [
  body('name').custom((value) => {
    if (value !== undefined && (!value || typeof value !== 'string')) {
      throw new Error('name must be a non-empty string');
    }
    return true;
  }),
  body('sku').custom((value) => {
    if (value !== undefined && (!value || typeof value !== 'string')) {
      throw new Error('sku must be a non-empty string');
    }
    return true;
  }),
  body('description').custom((value) => {
    if (value !== undefined && typeof value !== 'string') {
      throw new Error('description must be a string');
    }
    return true;
  }),
  body('category').custom((value) => {
    if (value !== undefined && !CATEGORIES.includes(value)) {
      throw new Error(`category must be one of: ${CATEGORIES.join(', ')}`);
    }
    return true;
  }),
  body('price').custom((value) => {
    if (value !== undefined && !isValidPrice(value)) {
      throw new Error('price must be a positive number with up to 2 decimal places');
    }
    return true;
  }),
  body('stock').custom((value) => {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      throw new Error('stock must be a non-negative integer');
    }
    return true;
  }),
  body('status').custom((value) => {
    if (value !== undefined && !STATUSES.includes(value)) {
      throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
    }
    return true;
  }),
  checkValidation,
];

export const validateFilters = [
  query('category').custom((value) => {
    if (value !== undefined && !CATEGORIES.includes(value)) {
      throw new Error(`category must be one of: ${CATEGORIES.join(', ')}`);
    }
    return true;
  }),
  query('status').custom((value) => {
    if (value !== undefined && !STATUSES.includes(value)) {
      throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
    }
    return true;
  }),
  query('minPrice')
    .optional()
    .custom((value) => {
      if (Number.isNaN(Number(value))) {
        throw new Error('minPrice must be a number');
      }
      return true;
    })
    .toFloat(),
  query('maxPrice')
    .optional()
    .custom((value) => {
      if (Number.isNaN(Number(value))) {
        throw new Error('maxPrice must be a number');
      }
      return true;
    })
    .toFloat(),
  query('inStock')
    .optional()
    .custom((value) => {
      if (value !== 'true' && value !== 'false') {
        throw new Error('inStock must be "true" or "false"');
      }
      return true;
    })
    .customSanitizer((value) => value === 'true'),
  query('search').optional(),
  checkValidation,
];
