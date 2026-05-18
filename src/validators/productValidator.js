import { body, query, validationResult } from 'express-validator';

const VALID_CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'other'];
const VALID_STATUSES = ['active', 'inactive', 'discontinued'];

const collectErrors = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const err = new Error(result.array().map(e => e.msg).join('; '));
    err.status = 400;
    return next(err);
  }
  next();
};

const nameRule = (required) =>
  required
    ? body('name').notEmpty().withMessage('name is required')
    : body('name').optional().notEmpty().withMessage('name is required');

const skuRule = (required) =>
  required
    ? body('sku').notEmpty().withMessage('sku is required')
    : body('sku').optional().notEmpty().withMessage('sku is required');

const sharedBodyRules = [
  body('description').optional().isString(),
  body('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
  body('price')
    .optional()
    .custom(val => {
      if (typeof val !== 'number' || val <= 0 || Math.round(val * 100) / 100 !== val) {
        throw new Error('price must be a positive number with up to 2 decimal places');
      }
      return true;
    }),
  body('stock')
    .optional()
    .custom(val => {
      if (!Number.isInteger(val) || val < 0) {
        throw new Error('stock must be a non-negative integer');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
];

export const validateCreate = [
  nameRule(true),
  skuRule(true),
  ...sharedBodyRules,
  collectErrors,
];

export const validateUpdate = [
  nameRule(false),
  skuRule(false),
  ...sharedBodyRules,
  collectErrors,
];

export const validateFilters = [
  query('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
  query('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
  query('minPrice')
    .optional()
    .custom(val => {
      if (isNaN(Number(val))) throw new Error('minPrice must be a number');
      return true;
    }),
  query('maxPrice')
    .optional()
    .custom(val => {
      if (isNaN(Number(val))) throw new Error('maxPrice must be a number');
      return true;
    }),
  query('inStock')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('inStock must be true or false'),
  collectErrors,
];
