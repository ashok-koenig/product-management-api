import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Product from '../src/models/product.js';

beforeEach(() => Product._reset());

// ---------------------------------------------------------------------------
// create()
// ---------------------------------------------------------------------------
describe('create()', () => {
  it('returns a product with all required fields including a uuid id', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-001', price: 9.99 });
    assert.match(p.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(p.name, 'Widget');
    assert.equal(p.sku, 'WGT-001');
    assert.equal(p.price, 9.99);
    assert.ok(p.createdAt instanceof Date);
    assert.equal(p.stock, 0);
  });

  it('sets status to "active" and archivedAt to null by default', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-001', price: 9.99 });
    assert.equal(p.status, 'active');
    assert.equal(p.archivedAt, null);
  });

  it('throws if name is missing', () => {
    assert.throws(() => Product.create({ sku: 'WGT-001', price: 9.99 }), { status: 400 });
  });

  it('throws if sku is missing', () => {
    assert.throws(() => Product.create({ name: 'Widget', price: 9.99 }), { status: 400 });
  });

  it('throws if price is zero or negative', () => {
    assert.throws(() => Product.create({ name: 'Widget', sku: 'WGT-001', price: 0 }), { status: 400 });
    assert.throws(() => Product.create({ name: 'Widget', sku: 'WGT-002', price: -1 }), { status: 400 });
  });

  it('throws if a product with the same sku already exists', () => {
    Product.create({ name: 'Widget', sku: 'WGT-001', price: 9.99 });
    assert.throws(
      () => Product.create({ name: 'Widget Duplicate', sku: 'WGT-001', price: 19.99 }),
      { status: 409 },
    );
  });
});

// ---------------------------------------------------------------------------
// findAll({})
// ---------------------------------------------------------------------------
describe('findAll({})', () => {
  it('returns all non-archived products', () => {
    Product.create({ name: 'A', sku: 'A-1', price: 1.00 });
    Product.create({ name: 'B', sku: 'B-1', price: 2.00 });
    const archived = Product.create({ name: 'C', sku: 'C-1', price: 3.00 });
    Product.delete(archived.id);

    const results = Product.findAll({});
    assert.equal(results.length, 2);
    assert.ok(results.every(p => p.archivedAt === null));
  });

  it('returns empty array when the store is empty', () => {
    assert.deepEqual(Product.findAll({}), []);
  });
});

// ---------------------------------------------------------------------------
// findAll({ category })
// ---------------------------------------------------------------------------
describe('findAll({ category })', () => {
  it('returns only products matching the category', () => {
    Product.create({ name: 'Phone', sku: 'PH-1', price: 299.99, category: 'electronics' });
    Product.create({ name: 'Shirt', sku: 'SH-1', price: 19.99, category: 'clothing' });

    const results = Product.findAll({ category: 'electronics' });
    assert.equal(results.length, 1);
    assert.equal(results[0].sku, 'PH-1');
  });
});

// ---------------------------------------------------------------------------
// findAll({ minPrice, maxPrice })
// ---------------------------------------------------------------------------
describe('findAll({ minPrice, maxPrice })', () => {
  it('returns products with price within the range (inclusive)', () => {
    Product.create({ name: 'Cheap', sku: 'C-1', price: 5.00 });
    Product.create({ name: 'Mid',   sku: 'M-1', price: 50.00 });
    Product.create({ name: 'Pricey', sku: 'P-1', price: 500.00 });

    const results = Product.findAll({ minPrice: 5, maxPrice: 50 });
    assert.equal(results.length, 2);
    assert.ok(results.every(p => p.price >= 5 && p.price <= 50));
  });
});

// ---------------------------------------------------------------------------
// findAll({ inStock: "true" })
// ---------------------------------------------------------------------------
describe('findAll({ inStock: "true" })', () => {
  it('returns only products with stock > 0', () => {
    Product.create({ name: 'In Stock',  sku: 'IS-1', price: 10.00, stock: 5 });
    Product.create({ name: 'Out',       sku: 'OT-1', price: 10.00, stock: 0 });

    const results = Product.findAll({ inStock: 'true' });
    assert.equal(results.length, 1);
    assert.equal(results[0].sku, 'IS-1');
  });
});

// ---------------------------------------------------------------------------
// findAll({ search })
// ---------------------------------------------------------------------------
describe('findAll({ search: "wireless" })', () => {
  it('returns products whose name or description contains the term', () => {
    Product.create({ name: 'Wireless Headphones', sku: 'WH-1', price: 49.99 });
    Product.create({ name: 'Keyboard', sku: 'KB-1', price: 29.99, description: 'Wireless bluetooth keyboard' });
    Product.create({ name: 'Mouse',    sku: 'MS-1', price: 19.99 });

    const results = Product.findAll({ search: 'wireless' });
    assert.equal(results.length, 2);
    assert.ok(results.some(p => p.sku === 'WH-1'));
    assert.ok(results.some(p => p.sku === 'KB-1'));
  });
});

// ---------------------------------------------------------------------------
// findById(id)
// ---------------------------------------------------------------------------
describe('findById(id)', () => {
  it('returns the correct product', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    assert.equal(Product.findById(p.id), p);
  });

  it('returns null for unknown id', () => {
    assert.equal(Product.findById('non-existent-id'), null);
  });

  it('returns null for an archived product id', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    Product.delete(p.id);
    assert.equal(Product.findById(p.id), null);
  });
});

// ---------------------------------------------------------------------------
// findBySku(sku)
// ---------------------------------------------------------------------------
describe('findBySku(sku)', () => {
  it('returns the correct product', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    assert.equal(Product.findBySku('WGT-1'), p);
  });

  it('returns null for unknown sku', () => {
    assert.equal(Product.findBySku('UNKNOWN'), null);
  });
});

// ---------------------------------------------------------------------------
// update(id, patch)
// ---------------------------------------------------------------------------
describe('update(id, patch)', () => {
  it('updates only the provided fields', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    const updated = Product.update(p.id, { name: 'Super Widget' });
    assert.equal(updated.name, 'Super Widget');
    assert.equal(updated.sku, 'WGT-1');
    assert.equal(updated.price, 9.99);
  });

  it('does not allow overwriting id or createdAt', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    const originalId = p.id;
    const originalCreatedAt = p.createdAt;

    Product.update(p.id, { id: 'new-id', createdAt: new Date('2000-01-01'), name: 'Updated' });

    assert.equal(p.id, originalId);
    assert.equal(p.createdAt, originalCreatedAt);
  });

  it('returns null for an archived product', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    Product.delete(p.id);
    const result = Product.update(p.id, { name: 'Ghost' });
    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// delete(id)
// ---------------------------------------------------------------------------
describe('delete(id)', () => {
  it('sets archivedAt (soft archive, record is kept)', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    Product.delete(p.id);
    assert.ok(p.archivedAt instanceof Date);
  });

  it('archived product is excluded from findAll()', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    Product.delete(p.id);
    assert.deepEqual(Product.findAll({}), []);
  });
});

// ---------------------------------------------------------------------------
// restore(id)
// ---------------------------------------------------------------------------
describe('restore(id)', () => {
  it('clears archivedAt', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    Product.delete(p.id);
    Product.restore(p.id);
    assert.equal(p.archivedAt, null);
  });

  it('restored product reappears in findAll()', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    Product.delete(p.id);
    Product.restore(p.id);
    const results = Product.findAll({});
    assert.equal(results.length, 1);
    assert.equal(results[0].id, p.id);
  });

  it('returns null when the product was never archived', () => {
    const p = Product.create({ name: 'Widget', sku: 'WGT-1', price: 9.99 });
    const result = Product.restore(p.id);
    assert.equal(result, null);
    assert.equal(p.archivedAt, null);
  });

  it('returns null for an unknown id', () => {
    const result = Product.restore('non-existent-id');
    assert.equal(result, null);
  });
});
