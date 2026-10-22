const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateVariance, readQuantity, pagesForGroups } = require('../count-session-utils.js');

test('variance is counted minus expected and percentage is relative to expected', () => {
  assert.deepEqual(calculateVariance(20, 17), {
    expected: 20, counted: 17, variance: -3, variancePct: -15, status: 'recount'
  });
});

test('zero variance matches, missing count remains pending, and zero expected has no percentage', () => {
  assert.equal(calculateVariance(0, 0).status, 'matched');
  assert.equal(calculateVariance(0, 0).variancePct, null);
  assert.deepEqual(calculateVariance(12, null), {
    expected: 12, counted: null, variance: null, variancePct: null, status: 'pending'
  });
});

test('absolute integer tolerance distinguishes acceptable variance from recount', () => {
  assert.equal(calculateVariance(100, 98, 2).status, 'within-tolerance');
  assert.equal(calculateVariance(100, 97, 2).status, 'recount');
});

test('quantities reject empty expected values, decimals, negatives, and unsafe integers', () => {
  assert.throws(() => calculateVariance('', 1), /required/);
  for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, 'nope']) {
    assert.throws(() => readQuantity(invalid, 'Counted quantity'));
  }
});

test('print page estimates count supplier group boundaries independently', () => {
  assert.equal(pagesForGroups([0, 1, 10, 11, 24], 10), 7);
  assert.throws(() => pagesForGroups([5], 0), /greater than zero/);
});
