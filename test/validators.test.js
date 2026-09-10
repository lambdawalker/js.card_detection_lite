import test from 'node:test';
import assert from 'node:assert/strict';
import { aspectRatioValidator, marginValidator } from '../src/core/validators.js';

test('validators preserve Android defaults', () => {
  const valid = { box: { x: 20, y: 20, x2: 180, y2: 120 } };
  assert.equal(aspectRatioValidator()(valid), true);
  assert.equal(marginValidator()(valid, null, { width: 200, height: 140 }), true);
  assert.equal(marginValidator()({ box: { ...valid.box, x: 19 } }, null, { width: 200, height: 140 }), false);
});
