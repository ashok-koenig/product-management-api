import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { resetStore, isUuid } from '../src/models/product.js';

const app = createApp();

const productA = {
  name: 'Wireless Mouse',
  sku: 'SKU-001',
  description: 'A wireless mouse',
  category: 'electronics',
  price: 19.99,
  stock: 10,
};

const productB = {
  name: 'Programming Book',
  sku: 'SKU-002',
  description: 'Learn JS',
  category: 'books',
  price: 29.99,
  stock: 0,
};

let seeded;

beforeEach(async () => {
  resetStore();
  const resA = await request(app).post('/products').send(productA);
  const resB = await request(app).post('/products').send(productB);
  seeded = { a: resA.body.data, b: resB.body.data };
});

describe('GET /products', () => {
  it('returns 200 and an array', async () => {
    const res = await request(app).get('/products');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it('returns only non-archived products', async () => {
    await request(app).delete(`/products/${seeded.a.id}`);

    const res = await request(app).get('/products');
    const ids = res.body.data.map((product) => product.id);

    assert.ok(!ids.includes(seeded.a.id));
    assert.ok(ids.includes(seeded.b.id));
  });

  it('?category=electronics returns only matching products', async () => {
    const res = await request(app).get('/products').query({ category: 'electronics' });

    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, seeded.a.id);
  });

  it('?minPrice and ?maxPrice filter correctly', async () => {
    const res = await request(app).get('/products').query({ minPrice: 25, maxPrice: 35 });

    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, seeded.b.id);
  });

  it('?inStock=true returns products with stock > 0', async () => {
    const res = await request(app).get('/products').query({ inStock: 'true' });

    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, seeded.a.id);
  });

  it('?search=<term> matches on name and description', async () => {
    const res = await request(app).get('/products').query({ search: 'learn' });

    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, seeded.b.id);
  });

  it('?minPrice=abc (non-numeric) returns 422', async () => {
    const res = await request(app).get('/products').query({ minPrice: 'abc' });

    assert.equal(res.status, 422);
  });

  it('?category=unknown returns 422', async () => {
    const res = await request(app).get('/products').query({ category: 'unknown' });

    assert.equal(res.status, 422);
  });

  it('?status=unknown returns 422', async () => {
    const res = await request(app).get('/products').query({ status: 'unknown' });

    assert.equal(res.status, 422);
  });

  it('?maxPrice=abc (non-numeric) returns 422', async () => {
    const res = await request(app).get('/products').query({ maxPrice: 'abc' });

    assert.equal(res.status, 422);
  });

  it('?inStock=maybe (invalid value) returns 422', async () => {
    const res = await request(app).get('/products').query({ inStock: 'maybe' });

    assert.equal(res.status, 422);
  });
});

describe('unmatched routes', () => {
  it('returns 404 with "Route not found" for a route outside /products', async () => {
    const res = await request(app).get('/unknown-route');

    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Route not found');
  });
});

describe('GET /products/:id', () => {
  it('returns 200 with the correct product', async () => {
    const res = await request(app).get(`/products/${seeded.a.id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, seeded.a.id);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/products/00000000-0000-0000-0000-000000000000');

    assert.equal(res.status, 404);
  });

  it('returns 400 for a malformed (non-uuid) id', async () => {
    const res = await request(app).get('/products/not-a-uuid');

    assert.equal(res.status, 400);
  });

  it('returns 404 for an archived product id', async () => {
    await request(app).delete(`/products/${seeded.a.id}`);

    const res = await request(app).get(`/products/${seeded.a.id}`);

    assert.equal(res.status, 404);
  });
});

describe('POST /products', () => {
  it('returns 201 with the created product including id and createdAt', async () => {
    const res = await request(app).post('/products').send({
      name: 'Keyboard',
      sku: 'SKU-003',
      category: 'electronics',
      price: 49.99,
      stock: 5,
    });

    assert.equal(res.status, 201);
    assert.ok(isUuid(res.body.data.id));
    assert.ok(res.body.data.createdAt);
  });

  it('returns 422 when name is missing', async () => {
    const res = await request(app).post('/products').send({
      sku: 'SKU-003',
      category: 'electronics',
      price: 49.99,
      stock: 5,
    });

    assert.equal(res.status, 422);
  });

  it('returns 422 when price is negative', async () => {
    const res = await request(app).post('/products').send({
      name: 'Keyboard',
      sku: 'SKU-003',
      category: 'electronics',
      price: -10,
      stock: 5,
    });

    assert.equal(res.status, 422);
  });

  it('returns 409 when sku already exists', async () => {
    const res = await request(app).post('/products').send({
      name: 'Duplicate Mouse',
      sku: seeded.a.sku,
      category: 'electronics',
      price: 9.99,
      stock: 1,
    });

    assert.equal(res.status, 409);
  });

  it('returns 422 when price is 0', async () => {
    const res = await request(app).post('/products').send({
      name: 'Keyboard',
      sku: 'SKU-003',
      category: 'electronics',
      price: 0,
      stock: 5,
    });

    assert.equal(res.status, 422);
  });

  it('accepts stock = 0 (out of stock is valid)', async () => {
    const res = await request(app).post('/products').send({
      name: 'Keyboard',
      sku: 'SKU-003',
      category: 'electronics',
      price: 49.99,
      stock: 0,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.stock, 0);
  });

  it('returns 422 when sku is missing', async () => {
    const res = await request(app).post('/products').send({
      name: 'Keyboard',
      category: 'electronics',
      price: 49.99,
      stock: 5,
    });

    assert.equal(res.status, 422);
  });

  it('returns 422 when description has the wrong type', async () => {
    const res = await request(app).post('/products').send({
      name: 'Keyboard',
      sku: 'SKU-003',
      description: 12345,
      category: 'electronics',
      price: 49.99,
      stock: 5,
    });

    assert.equal(res.status, 422);
  });

  it('returns 422 when category is invalid', async () => {
    const res = await request(app).post('/products').send({
      name: 'Keyboard',
      sku: 'SKU-003',
      category: 'not-a-category',
      price: 49.99,
      stock: 5,
    });

    assert.equal(res.status, 422);
  });

  it('returns 422 when stock is not an integer', async () => {
    const res = await request(app).post('/products').send({
      name: 'Keyboard',
      sku: 'SKU-003',
      category: 'electronics',
      price: 49.99,
      stock: 1.5,
    });

    assert.equal(res.status, 422);
  });

  it('returns 422 when stock is negative', async () => {
    const res = await request(app).post('/products').send({
      name: 'Keyboard',
      sku: 'SKU-003',
      category: 'electronics',
      price: 49.99,
      stock: -1,
    });

    assert.equal(res.status, 422);
  });

  it('returns 422 when status is invalid', async () => {
    const res = await request(app).post('/products').send({
      name: 'Keyboard',
      sku: 'SKU-003',
      category: 'electronics',
      price: 49.99,
      stock: 5,
      status: 'bogus',
    });

    assert.equal(res.status, 422);
  });

  it('only one of two concurrent POSTs with the same sku succeeds', async () => {
    const payload = (name) => ({
      name,
      sku: 'SKU-RACE',
      category: 'electronics',
      price: 9.99,
      stock: 1,
    });

    const [res1, res2] = await Promise.all([
      request(app).post('/products').send(payload('First')),
      request(app).post('/products').send(payload('Second')),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [201, 409]);
  });
});

describe('PATCH /products/:id', () => {
  it('returns 200 with only the patched fields changed', async () => {
    const res = await request(app).patch(`/products/${seeded.a.id}`).send({ price: 25.5 });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.price, 25.5);
    assert.equal(res.body.data.name, seeded.a.name);
    assert.equal(res.body.data.sku, seeded.a.sku);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .patch('/products/00000000-0000-0000-0000-000000000000')
      .send({ price: 25.5 });

    assert.equal(res.status, 404);
  });

  it('returns 400 for a malformed (non-uuid) id', async () => {
    const res = await request(app).patch('/products/not-a-uuid').send({ price: 25.5 });

    assert.equal(res.status, 400);
  });

  it('returns 200 and leaves the product unchanged when the body is empty', async () => {
    const res = await request(app).patch(`/products/${seeded.a.id}`).send({});

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, seeded.a);
  });

  it('does not allow updating id', async () => {
    const res = await request(app)
      .patch(`/products/${seeded.a.id}`)
      .send({ id: 'fake-id', price: 30 });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, seeded.a.id);
    assert.equal(res.body.data.price, 30);
  });

  it('allows updating sku to a new unused value', async () => {
    const res = await request(app)
      .patch(`/products/${seeded.a.id}`)
      .send({ sku: 'SKU-NEW' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.sku, 'SKU-NEW');
  });

  it('strips unknown fields', async () => {
    const res = await request(app)
      .patch(`/products/${seeded.a.id}`)
      .send({ price: 12, foo: 'bar' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.price, 12);
    assert.equal(res.body.data.foo, undefined);
  });

  it('returns 404 when patching an archived product', async () => {
    await request(app).delete(`/products/${seeded.a.id}`);

    const res = await request(app).patch(`/products/${seeded.a.id}`).send({ price: 1 });

    assert.equal(res.status, 404);
  });

  it('returns 422 when name is an empty string', async () => {
    const res = await request(app).patch(`/products/${seeded.a.id}`).send({ name: '' });

    assert.equal(res.status, 422);
  });

  it('returns 422 when sku is an empty string', async () => {
    const res = await request(app).patch(`/products/${seeded.a.id}`).send({ sku: '' });

    assert.equal(res.status, 422);
  });

  it('returns 422 when description has the wrong type', async () => {
    const res = await request(app).patch(`/products/${seeded.a.id}`).send({ description: 123 });

    assert.equal(res.status, 422);
  });

  it('returns 422 when category is invalid', async () => {
    const res = await request(app)
      .patch(`/products/${seeded.a.id}`)
      .send({ category: 'not-a-category' });

    assert.equal(res.status, 422);
  });

  it('returns 422 when price is invalid', async () => {
    const res = await request(app).patch(`/products/${seeded.a.id}`).send({ price: -5 });

    assert.equal(res.status, 422);
  });

  it('returns 422 when stock is invalid', async () => {
    const res = await request(app).patch(`/products/${seeded.a.id}`).send({ stock: -1 });

    assert.equal(res.status, 422);
  });

  it('returns 422 when status is invalid', async () => {
    const res = await request(app).patch(`/products/${seeded.a.id}`).send({ status: 'bogus' });

    assert.equal(res.status, 422);
  });

  it('returns 409 when patching sku to a value used by another product', async () => {
    const res = await request(app)
      .patch(`/products/${seeded.a.id}`)
      .send({ sku: seeded.b.sku });

    assert.equal(res.status, 409);
  });
});

describe('DELETE /products/:id', () => {
  it('returns 204', async () => {
    const res = await request(app).delete(`/products/${seeded.a.id}`);

    assert.equal(res.status, 204);
  });

  it('subsequent GET /products/:id returns 404', async () => {
    await request(app).delete(`/products/${seeded.a.id}`);

    const res = await request(app).get(`/products/${seeded.a.id}`);

    assert.equal(res.status, 404);
  });

  it('returns 400 for a malformed (non-uuid) id', async () => {
    const res = await request(app).delete('/products/not-a-uuid');

    assert.equal(res.status, 400);
  });
});

describe('DELETE /products/:id/restore', () => {
  it('returns 200 and product reappears in GET /products', async () => {
    await request(app).delete(`/products/${seeded.a.id}`);

    const restoreRes = await request(app).delete(`/products/${seeded.a.id}/restore`);
    assert.equal(restoreRes.status, 200);

    const listRes = await request(app).get('/products');
    const ids = listRes.body.data.map((product) => product.id);
    assert.ok(ids.includes(seeded.a.id));
  });

  it('returns 404 restoring a product that was never archived', async () => {
    const res = await request(app).delete(`/products/${seeded.b.id}/restore`);

    assert.equal(res.status, 404);
  });

  it('returns 400 for a malformed (non-uuid) id', async () => {
    const res = await request(app).delete('/products/not-a-uuid/restore');

    assert.equal(res.status, 400);
  });
});
