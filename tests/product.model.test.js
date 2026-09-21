import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  create,
  findAll,
  findById,
  findBySku,
  update,
  delete as remove,
  restore,
  isUuid,
  resetStore,
} from '../src/models/product.js';

const validProduct = (overrides = {}) => ({
  name: 'Wireless Mouse',
  sku: 'SKU-001',
  description: 'A wireless mouse',
  category: 'electronics',
  price: 19.99,
  stock: 10,
  ...overrides,
});

beforeEach(() => {
  resetStore();
});

describe('create()', () => {
  it('returns a product with all required fields including a uuid id', () => {
    const product = create(validProduct());

    assert.equal(product.name, 'Wireless Mouse');
    assert.equal(product.sku, 'SKU-001');
    assert.equal(product.description, 'A wireless mouse');
    assert.equal(product.category, 'electronics');
    assert.equal(product.price, 19.99);
    assert.equal(product.stock, 10);
    assert.ok(isUuid(product.id));
  });

  it('sets status to "active" and archivedAt to null by default', () => {
    const product = create(validProduct());

    assert.equal(product.status, 'active');
    assert.equal(product.archivedAt, null);
  });

  it('throws if name is missing', () => {
    assert.throws(() => create(validProduct({ name: undefined })));
  });

  it('throws if sku is missing', () => {
    assert.throws(() => create(validProduct({ sku: undefined })));
  });

  it('throws if price is zero or negative', () => {
    assert.throws(() => create(validProduct({ price: 0 })));
    assert.throws(() => create(validProduct({ price: -5 })));
  });

  it('throws if a product with the same sku already exists', () => {
    create(validProduct());
    assert.throws(() => create(validProduct({ name: 'Another Mouse' })));
  });

  it('accepts stock = 0 (out of stock is valid)', () => {
    const product = create(validProduct({ stock: 0 }));
    assert.equal(product.stock, 0);
  });

  it('throws if category is invalid', () => {
    assert.throws(() => create(validProduct({ category: 'not-a-category' })));
  });

  it('throws if stock is not an integer', () => {
    assert.throws(() => create(validProduct({ stock: 1.5 })));
  });

  it('throws if stock is negative', () => {
    assert.throws(() => create(validProduct({ stock: -1 })));
  });

  it('throws if status is invalid', () => {
    assert.throws(() => create(validProduct({ status: 'bogus' })));
  });

  it('throws if description has the wrong type', () => {
    assert.throws(() => create(validProduct({ description: 123 })));
  });

  it('throws if price has more than 2 decimal places', () => {
    assert.throws(() => create(validProduct({ price: 19.999 })));
  });

  it('throws if price is not a number', () => {
    assert.throws(() => create(validProduct({ price: '19.99' })));
  });

  it('accepts an explicit valid status instead of defaulting', () => {
    const product = create(validProduct({ status: 'inactive' }));
    assert.equal(product.status, 'inactive');
  });
});

describe('findAll({})', () => {
  it('returns all non-archived products', () => {
    create(validProduct({ sku: 'SKU-001' }));
    create(validProduct({ sku: 'SKU-002' }));

    const products = findAll({});
    assert.equal(products.length, 2);
  });

  it('returns empty array when the store is empty', () => {
    assert.deepEqual(findAll({}), []);
  });
});

describe('findAll({ category })', () => {
  it('returns only products matching the category', () => {
    create(validProduct({ sku: 'SKU-001', category: 'electronics' }));
    create(validProduct({ sku: 'SKU-002', category: 'books' }));

    const products = findAll({ category: 'books' });
    assert.equal(products.length, 1);
    assert.equal(products[0].sku, 'SKU-002');
  });
});

describe('findAll({ minPrice, maxPrice })', () => {
  it('returns products with price within the range (inclusive)', () => {
    create(validProduct({ sku: 'SKU-001', price: 10 }));
    create(validProduct({ sku: 'SKU-002', price: 20 }));
    create(validProduct({ sku: 'SKU-003', price: 30 }));

    const products = findAll({ minPrice: 10, maxPrice: 20 });
    const skus = products.map((product) => product.sku).sort();
    assert.deepEqual(skus, ['SKU-001', 'SKU-002']);
  });
});

describe('findAll({ status })', () => {
  it('returns only products matching the status', () => {
    create(validProduct({ sku: 'SKU-001', status: 'active' }));
    create(validProduct({ sku: 'SKU-002', status: 'discontinued' }));

    const products = findAll({ status: 'discontinued' });
    assert.equal(products.length, 1);
    assert.equal(products[0].sku, 'SKU-002');
  });
});

describe('findAll({ inStock: "true" })', () => {
  it('returns only products with stock > 0', () => {
    create(validProduct({ sku: 'SKU-001', stock: 5 }));
    create(validProduct({ sku: 'SKU-002', stock: 0 }));

    const products = findAll({ inStock: true });
    assert.equal(products.length, 1);
    assert.equal(products[0].sku, 'SKU-001');
  });
});

describe('findAll({ search: "wireless" })', () => {
  it('returns products whose name or description contains the term', () => {
    create(validProduct({ sku: 'SKU-001', name: 'Wireless Mouse', description: 'peripheral' }));
    create(validProduct({ sku: 'SKU-002', name: 'Keyboard', description: 'A wireless keyboard' }));
    create(validProduct({ sku: 'SKU-003', name: 'Monitor', description: 'A display' }));

    const products = findAll({ search: 'wireless' });
    const skus = products.map((product) => product.sku).sort();
    assert.deepEqual(skus, ['SKU-001', 'SKU-002']);
  });

  it('matches on name when description was never provided', () => {
    create(validProduct({ sku: 'SKU-001', name: 'Wireless Mouse', description: undefined }));

    const products = findAll({ search: 'wireless' });
    assert.equal(products.length, 1);
    assert.equal(products[0].sku, 'SKU-001');
  });
});

describe('findById(id)', () => {
  it('returns the correct product', () => {
    const product = create(validProduct());
    const found = findById(product.id);
    assert.equal(found.id, product.id);
  });

  it('returns null for unknown id', () => {
    assert.equal(findById('00000000-0000-0000-0000-000000000000'), undefined);
  });

  it('returns null for an archived product id', () => {
    const product = create(validProduct());
    remove(product.id);
    assert.equal(findById(product.id), undefined);
  });
});

describe('findBySku(sku)', () => {
  it('returns the correct product', () => {
    const product = create(validProduct());
    const found = findBySku(product.sku);
    assert.equal(found.id, product.id);
  });

  it('returns null for unknown sku', () => {
    assert.equal(findBySku('UNKNOWN-SKU'), undefined);
  });
});

describe('update(id, patch)', () => {
  it('updates only the provided fields', () => {
    const product = create(validProduct());
    const updated = update(product.id, { price: 25.5 });

    assert.equal(updated.price, 25.5);
    assert.equal(updated.name, product.name);
    assert.equal(updated.sku, product.sku);
  });

  it('does not allow overwriting id or createdAt', () => {
    const product = create(validProduct());
    const originalId = product.id;
    const originalCreatedAt = product.createdAt;

    const updated = update(product.id, {
      id: 'fake-id',
      createdAt: new Date('2000-01-01'),
      price: 30,
    });

    assert.equal(updated.id, originalId);
    assert.equal(updated.createdAt, originalCreatedAt);
    assert.equal(updated.price, 30);
  });

  it('strips unknown fields', () => {
    const product = create(validProduct());

    const updated = update(product.id, { price: 12, foo: 'bar' });

    assert.equal(updated.price, 12);
    assert.equal(updated.foo, undefined);
  });

  it('throws when updating an archived product', () => {
    const product = create(validProduct());
    remove(product.id);

    assert.throws(() => update(product.id, { price: 1 }));
  });

  it('throws if name is an empty string', () => {
    const product = create(validProduct());
    assert.throws(() => update(product.id, { name: '' }));
  });

  it('throws if sku is an empty string', () => {
    const product = create(validProduct());
    assert.throws(() => update(product.id, { sku: '' }));
  });

  it('throws if description has the wrong type', () => {
    const product = create(validProduct());
    assert.throws(() => update(product.id, { description: 123 }));
  });

  it('throws if category is invalid', () => {
    const product = create(validProduct());
    assert.throws(() => update(product.id, { category: 'not-a-category' }));
  });

  it('throws if price is invalid', () => {
    const product = create(validProduct());
    assert.throws(() => update(product.id, { price: -5 }));
  });

  it('throws if stock is invalid', () => {
    const product = create(validProduct());
    assert.throws(() => update(product.id, { stock: -1 }));
  });

  it('throws if status is invalid', () => {
    const product = create(validProduct());
    assert.throws(() => update(product.id, { status: 'bogus' }));
  });

  it('throws 409 when patching sku to a value used by another product', () => {
    create(validProduct({ sku: 'SKU-001' }));
    const other = create(validProduct({ sku: 'SKU-002' }));

    assert.throws(() => update(other.id, { sku: 'SKU-001' }));
  });

  it('allows patching sku to its own current value', () => {
    const product = create(validProduct({ sku: 'SKU-001' }));

    const updated = update(product.id, { sku: 'SKU-001', price: 5 });
    assert.equal(updated.sku, 'SKU-001');
    assert.equal(updated.price, 5);
  });
});

describe('delete(id)', () => {
  it('sets archivedAt (soft archive, record is kept)', () => {
    const product = create(validProduct());
    const archived = remove(product.id);

    assert.notEqual(archived.archivedAt, null);
  });

  it('archived product excluded from findAll()', () => {
    const product = create(validProduct());
    remove(product.id);

    assert.deepEqual(findAll({}), []);
  });

  it('throws for an unknown id', () => {
    assert.throws(() => remove('00000000-0000-0000-0000-000000000000'));
  });
});

describe('findAll() indexed category/status lookups', () => {
  it('matches a manual linear scan when filtering by category alone', () => {
    create(validProduct({ sku: 'SKU-001', category: 'electronics' }));
    create(validProduct({ sku: 'SKU-002', category: 'books' }));
    create(validProduct({ sku: 'SKU-003', category: 'electronics' }));

    const indexed = findAll({ category: 'electronics' });
    const all = findAll({});
    const expected = all.filter((product) => product.category === 'electronics');

    assert.deepEqual(
      indexed.map((product) => product.id).sort(),
      expected.map((product) => product.id).sort(),
    );
  });

  it('matches a manual linear scan when filtering by status alone', () => {
    create(validProduct({ sku: 'SKU-001', status: 'active' }));
    create(validProduct({ sku: 'SKU-002', status: 'discontinued' }));
    create(validProduct({ sku: 'SKU-003', status: 'discontinued' }));

    const indexed = findAll({ status: 'discontinued' });
    const all = findAll({});
    const expected = all.filter((product) => product.status === 'discontinued');

    assert.deepEqual(
      indexed.map((product) => product.id).sort(),
      expected.map((product) => product.id).sort(),
    );
  });

  it('matches a manual linear scan when filtering by category and status together', () => {
    create(validProduct({ sku: 'SKU-001', category: 'electronics', status: 'active' }));
    create(validProduct({ sku: 'SKU-002', category: 'electronics', status: 'discontinued' }));
    create(validProduct({ sku: 'SKU-003', category: 'books', status: 'active' }));

    const indexed = findAll({ category: 'electronics', status: 'active' });
    const all = findAll({});
    const expected = all.filter(
      (product) => product.category === 'electronics' && product.status === 'active',
    );

    assert.deepEqual(
      indexed.map((product) => product.id).sort(),
      expected.map((product) => product.id).sort(),
    );
    assert.equal(indexed.length, 1);
    assert.equal(indexed[0].sku, 'SKU-001');
  });

  it('reflects a category change: old category no longer matches, new category does', () => {
    const product = create(validProduct({ sku: 'SKU-001', category: 'electronics' }));

    update(product.id, { category: 'books' });

    assert.deepEqual(findAll({ category: 'electronics' }), []);
    const byNewCategory = findAll({ category: 'books' });
    assert.equal(byNewCategory.length, 1);
    assert.equal(byNewCategory[0].id, product.id);
  });

  it('reflects a status change: old status no longer matches, new status does', () => {
    const product = create(validProduct({ sku: 'SKU-001', status: 'active' }));

    update(product.id, { status: 'discontinued' });

    assert.deepEqual(findAll({ status: 'active' }), []);
    const byNewStatus = findAll({ status: 'discontinued' });
    assert.equal(byNewStatus.length, 1);
    assert.equal(byNewStatus[0].id, product.id);
  });

  it('excludes a removed (soft-archived) product from category/status filtered findAll', () => {
    const product = create(validProduct({ sku: 'SKU-001', category: 'electronics', status: 'active' }));
    remove(product.id);

    assert.deepEqual(findAll({ category: 'electronics' }), []);
    assert.deepEqual(findAll({ status: 'active' }), []);
  });

  it('reindexes a restored product so it reappears via category/status filtered findAll', () => {
    const product = create(validProduct({ sku: 'SKU-001', category: 'electronics', status: 'active' }));
    remove(product.id);
    restore(product.id);

    const byCategory = findAll({ category: 'electronics' });
    assert.equal(byCategory.length, 1);
    assert.equal(byCategory[0].id, product.id);

    const byStatus = findAll({ status: 'active' });
    assert.equal(byStatus.length, 1);
    assert.equal(byStatus[0].id, product.id);
  });

  it('resetStore() fully clears indexed results too', () => {
    create(validProduct({ sku: 'SKU-001', category: 'electronics', status: 'active' }));
    create(validProduct({ sku: 'SKU-002', category: 'books', status: 'discontinued' }));

    resetStore();

    assert.deepEqual(findAll({ category: 'electronics' }), []);
    assert.deepEqual(findAll({ status: 'discontinued' }), []);
    assert.deepEqual(findAll({}), []);
  });
});

describe('restore(id)', () => {
  it('clears archivedAt', () => {
    const product = create(validProduct());
    remove(product.id);
    const restored = restore(product.id);

    assert.equal(restored.archivedAt, null);
  });

  it('restored product reappears in findAll()', () => {
    const product = create(validProduct());
    remove(product.id);
    restore(product.id);

    const products = findAll({});
    assert.equal(products.length, 1);
    assert.equal(products[0].id, product.id);
  });

  it('throws when restoring a product that was never archived', () => {
    const product = create(validProduct());

    assert.throws(() => restore(product.id));
  });
});
