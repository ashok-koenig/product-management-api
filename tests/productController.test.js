import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createProduct, updateProduct } from '../src/controllers/productController.js';
import { create, resetStore } from '../src/models/product.js';

const createRes = () => ({
  statusCode: undefined,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

beforeEach(() => {
  resetStore();
});

describe('createProduct with no request body', () => {
  it('falls back to an empty object instead of throwing on missing req.body', async () => {
    const req = { body: undefined };
    const res = createRes();
    let forwardedError;

    await createProduct(req, res, (err) => {
      forwardedError = err;
    });

    assert.equal(forwardedError?.status, 422);
    assert.equal(res.statusCode, undefined);
  });
});

describe('updateProduct with no request body', () => {
  it('falls back to an empty object and leaves the product unchanged', async () => {
    const product = create({
      name: 'Wireless Mouse',
      sku: 'SKU-001',
      category: 'electronics',
      price: 19.99,
      stock: 10,
    });

    const req = { params: { id: product.id }, body: undefined };
    const res = createRes();

    await updateProduct(req, res, () => {});

    assert.equal(res.statusCode, undefined);
    assert.equal(res.body.data.price, 19.99);
  });
});
