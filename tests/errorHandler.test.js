import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { ApiError } from '../src/models/product.js';

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

let originalConsoleError;
let consoleErrorCalls;

beforeEach(() => {
  originalConsoleError = console.error;
  consoleErrorCalls = [];
  console.error = (...args) => {
    consoleErrorCalls.push(args);
  };
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('errorHandler', () => {
  it('responds 500 with a generic message and logs the error when status is missing', () => {
    const res = createRes();
    const err = new Error('something exploded');

    errorHandler(err, {}, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { success: false, data: null, error: 'Internal server error' });
    assert.equal(consoleErrorCalls.length, 1);
    assert.equal(consoleErrorCalls[0][0], err);
  });

  it('responds with the error status and message when status is set, without logging', () => {
    const res = createRes();
    const err = new ApiError(400, 'bad request');

    errorHandler(err, {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { success: false, data: null, error: 'bad request' });
    assert.equal(consoleErrorCalls.length, 0);
  });
});
