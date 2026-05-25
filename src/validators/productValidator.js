import { body, query, validationResult } from "express-validator";

const VALID_CATEGORIES = ["electronics", "clothing", "food", "books", "other"];
const VALID_STATUSES = ["active", "inactive", "discontinued"];

const collectErrors = (status) => (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const err = new Error(
      result
        .array()
        .map((e) => e.msg)
        .join("; "),
    );
    err.status = status;
    return next(err);
  }
  next();
};

const nameRule = (required) =>
  required
    ? body("name").notEmpty().withMessage("name is required")
    : body("name").optional().notEmpty().withMessage("name is required");

const skuRule = (required) =>
  required
    ? body("sku")
        .notEmpty()
        .withMessage("sku is required")
        .matches(/^[A-Za-z0-9-]+$/)
        .withMessage("sku must contain only letters, numbers, and hyphens")
    : body("sku").optional().notEmpty().withMessage("sku is required");

const sharedBodyRules = [
  body("description").optional().isString(),
  body("category")
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_CATEGORIES.join(", ")}`),
  body("price")
    .optional()
    .custom((val) => {
      if (
        typeof val !== "number" ||
        val <= 0 ||
        Math.round(val * 100) / 100 !== val
      ) {
        throw new Error(
          "price must be a positive number with up to 2 decimal places",
        );
      }
      return true;
    }),
  body("stock")
    .optional()
    .custom((val) => {
      if (!Number.isInteger(val) || val < 0) {
        throw new Error("stock must be a non-negative integer");
      }
      return true;
    }),
  body("status")
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(", ")}`),
];

const requireNonEmptyBody = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    const err = new Error("Request body must not be empty");
    err.status = 400;
    return next(err);
  }
  next();
};

export const validateCreate = [
  nameRule(true),
  skuRule(true),
  ...sharedBodyRules,
  collectErrors(422),
];

export const validateUpdate = [
  requireNonEmptyBody,
  nameRule(false),
  skuRule(false),
  ...sharedBodyRules,
  collectErrors(400),
];

export const validateBulk = [
  body().isArray({ min: 1 }).withMessage("body must be a non-empty array"),
  body("*.name").notEmpty().withMessage("name is required"),
  body("*.sku")
    .notEmpty()
    .withMessage("sku is required")
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("sku must contain only letters, numbers, and hyphens"),
  body("*.description").optional().isString(),
  body("*.category")
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_CATEGORIES.join(", ")}`),
  body("*.price")
    .optional()
    .custom((val) => {
      if (
        typeof val !== "number" ||
        val <= 0 ||
        Math.round(val * 100) / 100 !== val
      ) {
        throw new Error(
          "price must be a positive number with up to 2 decimal places",
        );
      }
      return true;
    }),
  body("*.stock")
    .optional()
    .custom((val) => {
      if (!Number.isInteger(val) || val < 0) {
        throw new Error("stock must be a non-negative integer");
      }
      return true;
    }),
  body("*.status")
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(", ")}`),
  collectErrors(422),
];

export const validateBulkStatus = [
  requireNonEmptyBody,
  body("ids").isArray({ min: 1 }).withMessage("ids must be a non-empty array"),
  body("ids.*").isUUID().withMessage("each id must be a valid UUID"),
  body("status")
    .notEmpty()
    .withMessage("status is required")
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(", ")}`),
  collectErrors(400),
];

export const validateFilters = [
  query("category")
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_CATEGORIES.join(", ")}`),
  query("status")
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(", ")}`),
  query("minPrice")
    .optional()
    .custom((val) => {
      if (isNaN(Number(val))) throw new Error("minPrice must be a number");
      return true;
    }),
  query("maxPrice")
    .optional()
    .custom((val) => {
      if (isNaN(Number(val))) throw new Error("maxPrice must be a number");
      return true;
    }),
  query("inStock")
    .optional()
    .isIn(["true", "false"])
    .withMessage("inStock must be true or false"),
  collectErrors(422),
];
