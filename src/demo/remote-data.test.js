import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLiveTiming } from './remote-data.js';

test('sample: loadLiveTiming is a function', () => {
  assert.equal(typeof loadLiveTiming, 'function');
});
