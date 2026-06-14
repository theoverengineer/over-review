import assert from 'node:assert/strict';
import test from 'node:test';

import { hello } from './index';

test('hello returns expected string', () => {
  assert.equal(hello(), 'Hello, over-review!');
});
