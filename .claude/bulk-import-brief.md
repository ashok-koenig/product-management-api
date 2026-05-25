# Bulk Import Feature Brief

## Endpoint specification
POST /products/bulk

Request body:
{
  "products": [  // array of 1 to 100 product objects
    {
      "name":        string  required
      "sku":         string  required  format: /^[A-Z0-9-]{3,20}$/
      "category":    enum    required  electronics|clothing|food|books|other
      "price":       number  required  positive
      "stock":       number  required  non-negative integer
      "description": string  optional
      "status":      enum    optional  active|inactive|discontinued
    }
  ]
}

## Behaviour rules
- Atomicity: if ANY product fails validation, reject the ENTIRE batch (no partial saves)
- SKU uniqueness: if any SKU in the batch already exists in the store, reject the batch
- Duplicate SKUs within the batch itself must also be rejected
- Success response: HTTP 201 with { success: true, data: { created: N, products: [...] } }
- Failure response: HTTP 422 with { success: false, error: 'message', details: [...] }
- Maximum batch size: 100 products; reject with HTTP 400 if exceeded

## Files to touch
- src/models/product.js          -- add bulkCreate(products) method
- src/validators/productValidator.js -- add validateBulk validator
- src/controllers/productController.js -- add bulkCreate handler
- src/routes/products.js         -- add POST /bulk route
- tests/products.api.test.js     -- add integration tests for /bulk
