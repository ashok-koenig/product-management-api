# Product Management API

A lightweight REST API built with **Express 5** and **Node.js** for managing a product catalogue. Products are held in an in-memory store and support full CRUD operations, catalogue search and filtering, and a soft-archive / restore lifecycle so deleted products can be recovered without data loss. SKUs are globally unique and remain reserved even after a product is archived, preventing accidental reuse. The project uses Node's built-in test runner — no extra test framework is required.

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 20.x |
| npm | 10.x |

---

## Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd product-api

# 2. Install dependencies
npm install
```

---

## Running the Server

```bash
# Production / standard start
npm start

# Development (auto-restarts on file changes)
npm run dev
```

The server listens on **port 3000** (hardcoded in `src/index.js`):

```
Server running on http://localhost:3000
```

---

## Running Tests

```bash
# Run the full test suite
npm test

# Run with coverage report
npm run test:coverage
```

Tests are split into two files:

- `tests/product.model.test.js` — unit tests for the model layer
- `tests/products.api.test.js` — integration tests against the full Express app

---

## API Endpoints

All endpoints are mounted under `/products`. Request and response bodies use `Content-Type: application/json`. Successful responses follow the envelope `{ "success": true, "data": ..., "error": null }`; error responses follow `{ "success": false, "data": null, "error": "<message>" }`.

> Full machine-readable specification: [`docs/openapi.yaml`](docs/openapi.yaml) (OpenAPI 3.1)

| Method | Path | Description | Status codes |
|--------|------|-------------|-------------|
| `GET` | `/products` | List all non-archived products; supports filters (see [Query Parameters](#query-parameters)) | 200, 422 |
| `GET` | `/products/{id}` | Fetch a single product by UUID | 200, 404 |
| `POST` | `/products` | Create a new product | 201, 409, 422 |
| `PATCH` | `/products/{id}` | Partially update an existing product | 200, 400, 404 |
| `DELETE` | `/products/{id}` | Soft-archive a product (recoverable) | 204, 404 |
| `DELETE` | `/products/{id}/restore` | Restore a soft-archived product | 200, 404 |

### Example curl commands

**List all active electronics products**
```bash
curl "http://localhost:3000/products?category=electronics&status=active"
```

**Get a product by ID**
```bash
curl http://localhost:3000/products/d290f1ee-6c54-4b01-90e6-d701748f0851
```

**Create a product**
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Keyboard",
    "sku": "WKB-2024-BLK",
    "description": "Compact tenkeyless mechanical keyboard",
    "category": "electronics",
    "price": 79.99,
    "stock": 150,
    "status": "active"
  }'
```

**Partially update a product**
```bash
curl -X PATCH http://localhost:3000/products/d290f1ee-6c54-4b01-90e6-d701748f0851 \
  -H "Content-Type: application/json" \
  -d '{"price": 69.99, "stock": 120}'
```

**Soft-archive a product**
```bash
curl -X DELETE http://localhost:3000/products/d290f1ee-6c54-4b01-90e6-d701748f0851
```

**Restore an archived product**
```bash
curl -X DELETE http://localhost:3000/products/d290f1ee-6c54-4b01-90e6-d701748f0851/restore
```

---

## Query Parameters

Applies to `GET /products`.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | `string` | Exact match on category. One of: `electronics`, `clothing`, `food`, `books`, `other`. | `?category=books` |
| `status` | `string` | Exact match on lifecycle status. One of: `active`, `inactive`, `discontinued`. | `?status=active` |
| `minPrice` | `number` | Inclusive lower bound on price. Products with no price set are excluded. | `?minPrice=10` |
| `maxPrice` | `number` | Inclusive upper bound on price. Products with no price set are excluded. | `?maxPrice=99.99` |
| `inStock` | `string` (`"true"` \| `"false"`) | `"true"` returns products with `stock > 0`; `"false"` returns products with `stock === 0`. HTTP query parameters carry no boolean type, so this must be passed as the literal string `"true"` or `"false"`. | `?inStock=true` |
| `search` | `string` | Case-insensitive substring match against `name` and `description`. | `?search=keyboard` |

Parameters can be combined freely:

```bash
curl "http://localhost:3000/products?category=electronics&inStock=true&minPrice=20&maxPrice=100&search=keyboard"
```

---

## Product Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` (UUID) | Auto-generated | Unique identifier assigned on creation. Read-only. |
| `name` | `string` | Yes | Human-readable product name. |
| `sku` | `string` | Yes | Stock-keeping unit. Must be unique across all products (including archived). Accepts letters, numbers, and hyphens only. |
| `description` | `string \| null` | No | Optional long-form product description. Defaults to `null`. |
| `category` | `string \| null` | No | Product category. Must be one of: `electronics`, `clothing`, `food`, `books`, `other`. Defaults to `null`. |
| `price` | `number \| null` | No | Unit price. Must be a positive number with at most 2 decimal places. Defaults to `null`. |
| `stock` | `integer` | No | Available unit count. Must be a non-negative integer. Defaults to `0`. |
| `status` | `string` | No | Lifecycle status. One of: `active`, `inactive`, `discontinued`. Defaults to `active`. |
| `createdAt` | `string` (ISO 8601) | Auto-generated | Timestamp set on creation. Read-only. |
| `archivedAt` | `string \| null` (ISO 8601) | Auto-managed | Set to the archive timestamp on soft-delete; `null` when the product is active. Read-only. |

---

## Project Structure

```
product-api/
├── src/
│   ├── app.js                        # Express app factory (middleware + routes wired up)
│   ├── index.js                      # Entry point — starts the HTTP server
│   ├── controllers/
│   │   └── productController.js      # Request handlers for all product endpoints
│   ├── middleware/
│   │   ├── catchAsync.js             # Wraps async handlers and forwards errors to next()
│   │   └── errorHandler.js           # Global error handler — formats error responses
│   ├── models/
│   │   └── product.js                # In-memory data store and all business logic
│   ├── routes/
│   │   └── products.js               # Route definitions and validator middleware binding
│   └── validators/
│       └── productValidator.js       # express-validator rule sets for create/update/filters
└── tests/
    ├── product.model.test.js         # Unit tests for the model layer
    └── products.api.test.js          # Integration tests using supertest
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | TCP port the HTTP server binds to. Currently hardcoded in `src/index.js`; update that constant to change the port. |
| `NODE_ENV` | _(unset)_ | Set to `production` to enable production-mode behaviour in Express (tighter error output, performance optimisations). Set to `test` when running tests to suppress server logs. |

---

## Contributing

Fork the repository and create a feature branch from `main`. Keep each pull request focused on a single change, and make sure `npm test` passes with no failures before opening a PR. Describe the problem your change solves in the PR description rather than restating what the diff shows. All contributions are subject to code review before merging.

---

## License

[MIT](https://opensource.org/licenses/MIT)
