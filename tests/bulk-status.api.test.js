import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import createApp from '../src/app.js';
import Product from '../src/models/product.js';

const app = createApp();
const agent = supertest(app);

const seed = async () => {
  const [r1, r2, r3] = await Promise.all([
    agent.post('/products').send({ name: 'Laptop Pro', sku: 'LPRO-002', category: 'electronics', price: 999.99, stock: 10 }),
    agent.post('/products').send({ name: 'Cotton Shirt', sku: 'SHRT-002', category: 'clothing', price: 29.99, stock: 5 }),
    agent.post('/products').send({ name: 'Wireless Headphones', sku: 'HEAD-002', category: 'electronics', price: 149.99, stock: 3 }),
  ]);
  return { laptop: r1.body.data, shirt: r2.body.data, headphones: r3.body.data };
};

describe('PATCH /products/bulk-status', () => {
  let laptop, shirt, headphones;

  beforeEach(async () => {
    Product._reset();
    ({ laptop, shirt, headphones } = await seed());
  });

  it('returns 200 and updates status on all matched products', async () => {
    const res = await agent
      .patch('/products/bulk-status')
      .send({ ids: [laptop.id, shirt.id], status: 'inactive' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 2);
    assert.ok(res.body.data.every(p => p.status === 'inactive'));
    assert.equal(res.body.error, null);
  });

  it('updates all three products in one call', async () => {
    const res = await agent
      .patch('/products/bulk-status')
      .send({ ids: [laptop.id, shirt.id, headphones.id], status: 'discontinued' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 3);
    assert.ok(res.body.data.every(p => p.status === 'discontinued'));
  });

  it('returned products contain the correct ids', async () => {
    const res = await agent
      .patch('/products/bulk-status')
      .send({ ids: [laptop.id, headphones.id], status: 'inactive' });

    assert.equal(res.status, 200);
    const returnedIds = res.body.data.map(p => p.id).sort();
    assert.deepEqual(returnedIds, [laptop.id, headphones.id].sort());
  });

  it('returns 400 for an empty body', async () => {
    const res = await agent.patch('/products/bulk-status').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(typeof res.body.error === 'string');
  });

  it('returns 400 when ids is missing', async () => {
    const res = await agent.patch('/products/bulk-status').send({ status: 'active' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('returns 400 when ids is an empty array', async () => {
    const res = await agent.patch('/products/bulk-status').send({ ids: [], status: 'active' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('returns 400 when an id is not a valid UUID', async () => {
    const res = await agent
      .patch('/products/bulk-status')
      .send({ ids: ['not-a-uuid'], status: 'active' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('UUID'));
  });

  it('returns 400 when status is missing', async () => {
    const res = await agent.patch('/products/bulk-status').send({ ids: [laptop.id] });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('returns 400 for an invalid status value', async () => {
    const res = await agent
      .patch('/products/bulk-status')
      .send({ ids: [laptop.id], status: 'pending' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('status must be one of'));
  });

  it('returns 404 when any id does not exist', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await agent
      .patch('/products/bulk-status')
      .send({ ids: [laptop.id, fakeId], status: 'inactive' });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes(fakeId));
  });

  it('returns 404 for an archived product id and makes no changes', async () => {
    await agent.delete(`/products/${laptop.id}`);
    const res = await agent
      .patch('/products/bulk-status')
      .send({ ids: [laptop.id, shirt.id], status: 'inactive' });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);

    // shirt must be unchanged since the request was rejected
    const shirtRes = await agent.get(`/products/${shirt.id}`);
    assert.equal(shirtRes.body.data.status, 'active');
  });

  it('does not change any product when the request fails with 404', async () => {
    const fakeId = '11111111-1111-1111-1111-111111111111';
    await agent.patch('/products/bulk-status').send({ ids: [laptop.id, fakeId], status: 'discontinued' });

    const laptopRes = await agent.get(`/products/${laptop.id}`);
    assert.equal(laptopRes.body.data.status, 'active');
  });
});
