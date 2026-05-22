import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import createApp from '../src/app.js';
import Product from '../src/models/product.js';

const app = createApp();
const agent = supertest(app);

// Three products: different categories, prices, and stock levels
const seed = async () => {
  const [r1, r2, r3] = await Promise.all([
    agent.post('/products').send({
      name: 'Laptop Pro',
      sku: 'LPRO-001',
      description: 'High performance laptop for professionals',
      category: 'electronics',
      price: 999.99,
      stock: 10,
    }),
    agent.post('/products').send({
      name: 'Cotton Shirt',
      sku: 'SHRT-001',
      description: 'Comfortable everyday cotton shirt',
      category: 'clothing',
      price: 29.99,
      stock: 0,
    }),
    agent.post('/products').send({
      name: 'Wireless Headphones',
      sku: 'HEAD-001',
      description: 'Noise cancelling wireless headphones',
      category: 'electronics',
      price: 149.99,
      stock: 3,
    }),
  ]);
  return { laptop: r1.body.data, shirt: r2.body.data, headphones: r3.body.data };
};

describe('GET /products', () => {
  let laptop, shirt, headphones;

  beforeEach(async () => {
    Product._reset();
    ({ laptop, shirt, headphones } = await seed());
  });

  it('returns 200 and an array', async () => {
    const res = await agent.get('/products');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.success, true);
  });

  it('returns only non-archived products', async () => {
    await agent.delete(`/products/${laptop.id}`);
    const res = await agent.get('/products');
    assert.equal(res.status, 200);
    const ids = res.body.data.map(p => p.id);
    assert.ok(!ids.includes(laptop.id), 'archived product must not appear');
    assert.ok(ids.includes(shirt.id));
    assert.ok(ids.includes(headphones.id));
  });

  it('?category=electronics returns only matching products', async () => {
    const res = await agent.get('/products?category=electronics');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every(p => p.category === 'electronics'));
    const ids = res.body.data.map(p => p.id);
    assert.ok(ids.includes(laptop.id));
    assert.ok(ids.includes(headphones.id));
    assert.ok(!ids.includes(shirt.id));
  });

  it('?minPrice and ?maxPrice filter correctly', async () => {
    // shirt: 29.99 (below min), headphones: 149.99 (in range), laptop: 999.99 (above max)
    const res = await agent.get('/products?minPrice=50&maxPrice=500');
    assert.equal(res.status, 200);
    const ids = res.body.data.map(p => p.id);
    assert.ok(ids.includes(headphones.id));
    assert.ok(!ids.includes(laptop.id), 'laptop price 999.99 exceeds maxPrice 500');
    assert.ok(!ids.includes(shirt.id), 'shirt price 29.99 is below minPrice 50');
  });

  it('?inStock=true returns products with stock > 0', async () => {
    const res = await agent.get('/products?inStock=true');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.every(p => p.stock > 0));
    const ids = res.body.data.map(p => p.id);
    assert.ok(ids.includes(laptop.id));
    assert.ok(ids.includes(headphones.id));
    assert.ok(!ids.includes(shirt.id), 'shirt has stock 0');
  });

  it('?search=<term> matches on name', async () => {
    const res = await agent.get('/products?search=laptop');
    assert.equal(res.status, 200);
    const ids = res.body.data.map(p => p.id);
    assert.ok(ids.includes(laptop.id));
    assert.ok(!ids.includes(shirt.id));
    assert.ok(!ids.includes(headphones.id));
  });

  it('?search=<term> matches on description', async () => {
    const res = await agent.get('/products?search=noise');
    assert.equal(res.status, 200);
    const ids = res.body.data.map(p => p.id);
    assert.ok(ids.includes(headphones.id));
    assert.ok(!ids.includes(laptop.id));
    assert.ok(!ids.includes(shirt.id));
  });

  it('?minPrice=abc returns 422 for non-numeric value', async () => {
    const res = await agent.get('/products?minPrice=abc');
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('?category=unknown returns 422 for value not in enum', async () => {
    const res = await agent.get('/products?category=unknown');
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });
});

describe('GET /products/:id', () => {
  let laptop;

  beforeEach(async () => {
    Product._reset();
    ({ laptop } = await seed());
  });

  it('returns 200 with the correct product', async () => {
    const res = await agent.get(`/products/${laptop.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, laptop.id);
    assert.equal(res.body.data.name, 'Laptop Pro');
    assert.equal(res.body.data.sku, 'LPRO-001');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await agent.get('/products/00000000-0000-0000-0000-000000000000');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('returns 404 for an archived product id', async () => {
    await agent.delete(`/products/${laptop.id}`);
    const res = await agent.get(`/products/${laptop.id}`);
    assert.equal(res.status, 404);
  });
});

describe('POST /products', () => {
  beforeEach(() => Product._reset());

  it('returns 201 with the created product including id and createdAt', async () => {
    const res = await agent.post('/products').send({
      name: 'Smart Watch',
      sku: 'WTCH-001',
      category: 'electronics',
      price: 299.99,
      stock: 7,
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.id, 'response must include id');
    assert.ok(res.body.data.createdAt, 'response must include createdAt');
    assert.equal(res.body.data.name, 'Smart Watch');
    assert.equal(res.body.data.sku, 'WTCH-001');
  });

  it('returns 422 when name is missing', async () => {
    const res = await agent.post('/products').send({ sku: 'SKU-001', price: 10.00 });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('returns 422 when sku format is invalid', async () => {
    const res = await agent.post('/products').send({
      name: 'Test Product',
      sku: 'invalid sku!@#',
      price: 10.00,
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('returns 422 when price is negative', async () => {
    const res = await agent.post('/products').send({
      name: 'Test Product',
      sku: 'SKU-NEG-001',
      price: -5,
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('returns 409 when sku already exists', async () => {
    await agent.post('/products').send({ name: 'First', sku: 'DUPE-001' });
    const res = await agent.post('/products').send({ name: 'Second', sku: 'DUPE-001' });
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  it('returns 422 when price is zero', async () => {
    const res = await agent.post('/products').send({
      name: 'Free Item',
      sku: 'FREE-001',
      category: 'other',
      price: 0,
      stock: 1,
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('returns 201 when stock is zero (out of stock is valid)', async () => {
    const res = await agent.post('/products').send({
      name: 'Out Of Stock Item',
      sku: 'OOS-001',
      category: 'electronics',
      price: 49.99,
      stock: 0,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.stock, 0);
  });

  it('only one of two concurrent POSTs with the same SKU succeeds', async () => {
    const payload = { name: 'Race Widget', sku: 'RACE-001', category: 'other', price: 9.99, stock: 1 };
    const [r1, r2] = await Promise.all([
      agent.post('/products').send(payload),
      agent.post('/products').send(payload),
    ]);
    const statuses = [r1.status, r2.status].sort();
    assert.deepEqual(statuses, [201, 409]);
  });
});

describe('PATCH /products/:id', () => {
  let laptop;

  beforeEach(async () => {
    Product._reset();
    ({ laptop } = await seed());
  });

  it('returns 200 with only the patched fields changed', async () => {
    const res = await agent.patch(`/products/${laptop.id}`).send({
      name: 'Laptop Pro Max',
      price: 1199.99,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Laptop Pro Max');
    assert.equal(res.body.data.price, 1199.99);
    // unchanged fields stay the same
    assert.equal(res.body.data.sku, laptop.sku);
    assert.equal(res.body.data.category, laptop.category);
    assert.equal(res.body.data.stock, laptop.stock);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await agent.patch('/products/00000000-0000-0000-0000-000000000000').send({
      name: 'Ghost',
    });
    assert.equal(res.status, 404);
  });

  it('returns 400 when the body is empty', async () => {
    const res = await agent.patch(`/products/${laptop.id}`).send({});
    assert.equal(res.status, 400);
  });

  it('does not allow updating sku or id', async () => {
    const res = await agent.patch(`/products/${laptop.id}`).send({
      id: '00000000-0000-0000-0000-000000000000',
      sku: 'HACKED-SKU',
      name: 'Patched Name',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, laptop.id, 'id must not change');
    assert.equal(res.body.data.sku, laptop.sku, 'sku must not change');
    assert.equal(res.body.data.name, 'Patched Name');
  });

  it('strips unknown fields from the patch body', async () => {
    const res = await agent.patch(`/products/${laptop.id}`).send({
      name: 'Patched Laptop',
      unknownField: 'should be stripped',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Patched Laptop');
    assert.equal(res.body.data.unknownField, undefined);
  });

  it('returns 404 when patching an archived product', async () => {
    await agent.delete(`/products/${laptop.id}`);
    const res = await agent.patch(`/products/${laptop.id}`).send({ name: 'Ghost' });
    assert.equal(res.status, 404);
  });
});

describe('DELETE /products/:id', () => {
  let laptop, shirt;

  beforeEach(async () => {
    Product._reset();
    ({ laptop, shirt } = await seed());
  });

  it('returns 204', async () => {
    const res = await agent.delete(`/products/${laptop.id}`);
    assert.equal(res.status, 204);
  });

  it('subsequent GET /products/:id returns 404', async () => {
    await agent.delete(`/products/${laptop.id}`);
    const res = await agent.get(`/products/${laptop.id}`);
    assert.equal(res.status, 404);
  });
});

describe('DELETE /products/:id/restore', () => {
  let laptop;

  beforeEach(async () => {
    Product._reset();
    ({ laptop } = await seed());
    await agent.delete(`/products/${laptop.id}`);
  });

  it('returns 200 and product reappears in GET /products', async () => {
    const restoreRes = await agent.delete(`/products/${laptop.id}/restore`);
    assert.equal(restoreRes.status, 200);
    assert.equal(restoreRes.body.data.id, laptop.id);

    const listRes = await agent.get('/products');
    const ids = listRes.body.data.map(p => p.id);
    assert.ok(ids.includes(laptop.id), 'restored product must appear in product list');
  });

});

describe('DELETE /products/:id/restore — never-archived edge case', () => {
  let laptop;

  beforeEach(async () => {
    Product._reset();
    ({ laptop } = await seed());
    // laptop is active — intentionally NOT archived
  });

  it('returns 404 when restoring a product that was never archived', async () => {
    const res = await agent.delete(`/products/${laptop.id}/restore`);
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});

describe('POST /products/bulk', () => {
  beforeEach(() => Product._reset());

  it('creates all products and returns 201 with array', async () => {
    const res = await agent.post('/products/bulk').send([
      { name: 'Keyboard', sku: 'BULK-KB', price: 49.99, category: 'electronics', stock: 20 },
      { name: 'Mouse', sku: 'BULK-MS', price: 29.99, category: 'electronics', stock: 15 },
    ]);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 2);
    assert.ok(res.body.data[0].id);
    assert.ok(res.body.data[0].createdAt);
    assert.equal(res.body.data[0].sku, 'BULK-KB');
    assert.equal(res.body.data[1].sku, 'BULK-MS');
  });

  it('creates a single-item batch', async () => {
    const res = await agent.post('/products/bulk').send([
      { name: 'Solo Item', sku: 'SOLO-001', price: 9.99 },
    ]);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.length, 1);
  });

  it('atomicity: rejects entire batch when one item has missing name', async () => {
    const res = await agent.post('/products/bulk').send([
      { name: 'Valid Item', sku: 'BULK-V1', price: 10.00 },
      { sku: 'BULK-V2', price: 20.00 },
    ]);
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
    const list = await agent.get('/products');
    assert.equal(list.body.data.length, 0);
  });

  it('atomicity: rejects entire batch when one item has invalid price', async () => {
    const res = await agent.post('/products/bulk').send([
      { name: 'Good', sku: 'BULK-G1', price: 10.00 },
      { name: 'Bad', sku: 'BULK-G2', price: -5 },
    ]);
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
    const list = await agent.get('/products');
    assert.equal(list.body.data.length, 0);
  });

  it('atomicity: rejects entire batch when one item SKU conflicts with store', async () => {
    await agent.post('/products').send({ name: 'Existing', sku: 'EXIST-001', price: 5.00 });
    const res = await agent.post('/products/bulk').send([
      { name: 'New A', sku: 'BULK-A1', price: 10.00 },
      { name: 'Conflict', sku: 'EXIST-001', price: 20.00 },
    ]);
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    const list = await agent.get('/products');
    assert.equal(list.body.data.length, 1);
  });

  it('rejects batch with intra-batch duplicate SKUs', async () => {
    const res = await agent.post('/products/bulk').send([
      { name: 'First', sku: 'DUP-001', price: 10.00 },
      { name: 'Second', sku: 'DUP-001', price: 20.00 },
    ]);
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    const list = await agent.get('/products');
    assert.equal(list.body.data.length, 0);
  });

  it('collects errors from multiple invalid items', async () => {
    const res = await agent.post('/products/bulk').send([
      { sku: 'BULK-E1', price: 10.00 },
      { sku: 'BULK-E2', price: -1 },
    ]);
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
    assert.ok(typeof res.body.error === 'string' && res.body.error.length > 0);
  });

  it('rejects an empty array with 422', async () => {
    const res = await agent.post('/products/bulk').send([]);
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });

  it('rejects a non-array body with 422', async () => {
    const res = await agent.post('/products/bulk').send({ name: 'Not an array', sku: 'X' });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });
});
