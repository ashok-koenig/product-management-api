import { param, query, validationResult } from 'express-validator';
import { ApiError, isUuid, CATEGORIES, STATUSES } from '../models/product.js';

const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, errors.array({ onlyFirstError: true })[0].msg));
  }
  return next();
};

const checkIdValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, errors.array({ onlyFirstError: true })[0].msg));
  }
  return next();
};

export const validateId = [
  param('id').custom((value) => {
    if (!isUuid(value)) {
      throw new Error(`"${value}" is not a valid product id`);
    }
    return true;
  }),
  checkIdValidation,
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
    }),
  checkValidation,
];
