import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScale } from '../../src/ui/fit-scene.js';

test('the 1440x900 reference keeps scale 1', () => {
  assert.deepEqual(computeScale({ width: 1440, height: 836 }), { scene: 1, panel: 1 });
});

test('a larger window zooms the scene and widens the panel a little', () => {
  const s = computeScale({ width: 1920, height: 1016 });
  assert.ok(s.scene > 1.2 && s.scene < 1.3, String(s.scene));
  assert.ok(s.panel > 1 && s.panel <= 1.2);
});

test('the scene fits the limiting dimension and never shrinks below 0.8', () => {
  const wide = computeScale({ width: 3000, height: 836 });
  assert.equal(wide.scene, 1);
  assert.equal(computeScale({ width: 900, height: 500 }).scene, 0.8);
  assert.equal(computeScale({ width: 900, height: 500 }).panel, 1);
});
