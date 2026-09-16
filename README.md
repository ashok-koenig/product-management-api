# Product Management API

A lightweight Express.js REST API for managing a product catalogue. It supports creating, listing, filtering, searching, updating, and soft-archiving products, with SKU-uniqueness enforcement and restore support for archived items. Data is held in an in-memory store, making it well suited for prototyping, testing, and learning purposes.

A machine-readable API contract is available at [`docs/openapi.yaml`](docs/openapi.yaml) (OpenAPI 3.1). View it locally with:

```bash
npx @redocly/cli preview-docs docs/openapi.yaml
```

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm v10 or later

## Installation

```bash
git clone <repository-url>
cd product-management-api
npm install
```

## Running the Server

```bash
npm start
```

The server listens on port `3000` by default. Once running, the API is available at `http://localhost:3000/products`.

## Running Tests

Run the test suite:

```bash
npm test
```

Run the test suite with a coverage report:

```bash
npm run test:coverage
```

## API Endpoints

| Method | Path | Description | Example curl |
|---|---|---|---|
| GET | `/products` | List active products, optionally filtered by query parameters | `curl "http://localhost:3000/products?category=electronics&inStock=true"` |
| GET | `/products/:id` | Get a single active product by id | `curl http://localhost:3000/products/3fa85f64-5717-4562-b3fc-2c963f66afa6` |
| POST | `/products` | Create a new product | `curl -X POST http://localhost:3000/products -H "Content-Type: application/json" -d '{"name":"Wireless Mouse","sku":"WM-1001","category":"electronics","price":19.99,"stock":50}'` |
| PATCH | `/products/:id` | Partially update an existing product | `curl -X PATCH http://localhost:3000/products/3fa85f64-5717-4562-b3fc-2c963f66afa6 -H "Content-Type: application/json" -d '{"price":24.99,"stock":40}'` |
| DELETE | `/products/:id` | Soft-archive a product | `curl -X DELETE http://localhost:3000/products/3fa85f64-5717-4562-b3fc-2c963f66afa6` |
| DELETE | `/products/:id/restore` | Restore a previously soft-archived product | `curl -X DELETE http://localhost:3000/products/3fa85f64-5717-4562-b3fc-2c963f66afa6/restore` |

## Quick Start

Create a product, fetch it, update it, then soft-archive and restore it:

```bash
# 1. Create
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Wireless Mouse","sku":"WM-1001","category":"electronics","price":19.99,"stock":50}'
# -> 201 { "success": true, "data": { "id": "...", "sku": "WM-1001", ... }, "error": null }

# 2. Fetch (replace :id with the id returned above)
curl http://localhost:3000/products/:id

# 3. Update
curl -X PATCH http://localhost:3000/products/:id \
  -H "Content-Type: application/json" \
  -d '{"price":24.99,"stock":40}'

# 4. Soft-archive
curl -X DELETE http://localhost:3000/products/:id
# -> 204, product is excluded from GET /products and GET /products/:id

# 5. Restore
curl -X DELETE http://localhost:3000/products/:id/restore
```

## Response Format

Every JSON response is wrapped in the same envelope:

```json
{ "success": true, "data": { /* result or array of results */ }, "error": null }
```

On failure, `success` is `false`, `data` is `null`, and `error` is a human-readable message:

```json
{ "success": false, "data": null, "error": "sku is required and must be a string" }
```

`DELETE /products/:id` is the only endpoint that returns no body (`204 No Content`).

### Status Codes by Endpoint

| Endpoint | Success | Possible Errors |
|---|---|---|
| `GET /products` | `200` | `422` invalid query parameter |
| `GET /products/:id` | `200` | `400` invalid id format · `404` not found |
| `POST /products` | `201` | `422` validation failure · `409` sku already exists |
| `PATCH /products/:id` | `200` | `400` invalid id format · `404` not found · `422` validation failure · `409` sku already exists |
| `DELETE /products/:id` | `204` | `400` invalid id format · `404` not found |
| `DELETE /products/:id/restore` | `200` | `400` invalid id format · `404` not archived/not found |

Full request/response schemas for every status code are defined in [`docs/openapi.yaml`](docs/openapi.yaml).

## Query Parameters for `GET /products`

| Parameter | Type | Description | Example |
|---|---|---|---|
| `category` | string | Filter by exact category (one of `electronics`, `clothing`, `food`, `books`, `other`) | `?category=electronics` |
| `status` | string | Filter by exact status (one of `active`, `inactive`, `discontinued`) | `?status=active` |
| `minPrice` | number | Minimum price, inclusive | `?minPrice=10.50` |
| `maxPrice` | number | Maximum price, inclusive | `?maxPrice=99.99` |
| `inStock` | string (`"true"` \| `"false"`) | Sent as a query-string literal; `"true"` matches products with stock > 0, `"false"` matches out-of-stock products | `?inStock=true` |
| `search` | string | Case-insensitive substring match against name or description | `?search=wireless` |

## Product Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string (UUID) | Auto-generated | Unique product identifier, assigned on creation |
| `name` | string | Yes | Product name |
| `sku` | string | Yes | Stock keeping unit; must be unique across all products, including archived ones |
| `description` | string | No | Free-text product description |
| `category` | string | Yes | One of `electronics`, `clothing`, `food`, `books`, `other` |
| `price` | number | Yes | Positive number with up to 2 decimal places |
| `stock` | number | Yes | Non-negative integer |
| `status` | string | No (defaults to `active`) | One of `active`, `inactive`, `discontinued` |
| `createdAt` | string (ISO date) | Auto-generated | Timestamp set when the product is created |
| `archivedAt` | string (ISO date) or `null` | Auto-generated | Set when the product is soft-archived; `null` while active |

## Project Structure

```
product-management-api/
├── src/
│   ├── controllers/
│   │   └── productController.js   # Express request handlers
│   ├── middleware/
│   │   ├── catchAsync.js          # Wraps async handlers for error forwarding
│   │   └── errorHandler.js        # Centralized error-response formatting
│   ├── models/
│   │   └── product.js             # In-memory data store and business logic
│   ├── routes/
│   │   └── products.js            # /products route definitions
│   ├── validators/
│   │   └── productValidator.js    # express-validator request validation chains
│   ├── app.js                     # Express app factory
│   └── index.js                   # Server entry point
├── tests/
│   ├── errorHandler.test.js
│   ├── product.model.test.js
│   └── products.api.test.js
├── docs/
│   └── openapi.yaml               # OpenAPI 3.1 API contract
├── package.json
├── LICENSE
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port the server listens on | `3000` |
| `NODE_ENV` | Standard Node.js environment name (e.g. `development`, `test`, `production`) | `development` |

```bash
PORT=4000 npm start
```

> **Note:** `NODE_ENV` is a Node.js convention and is not currently read by any application logic in this codebase.

## Contributing

Contributions are welcome — please open an issue to discuss significant changes before submitting a pull request, keep changes focused and covered by tests, and ensure `npm test` passes before requesting review.

## License

This project is licensed under the [MIT License](LICENSE).
