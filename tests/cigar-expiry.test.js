const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeBatchCode } = require('../cigar-expiry-utils.js');

test('decodes PMFTC batch codes using the workbook year and Julian-day positions', () => {
  assert.deepEqual(
    decodeBatchCode('MB23619110'),
    { manufacturer: 'PMFTC', manufacturingDate: '2026-07-10', expiryDate: '2027-07-10' }
  );
  assert.equal(decodeBatchCode('MB24624016').manufacturingDate, '2026-08-28');
});

test('decodes JTI batch codes using the workbook month, year, and day positions', () => {
  assert.deepEqual(
    decodeBatchCode('6EF27C52'),
    { manufacturer: 'JTI', manufacturingDate: '2026-05-27', expiryDate: '2027-05-27' }
  );
  assert.equal(decodeBatchCode('6FF29A32').manufacturingDate, '2026-06-29');
});

test('rejects invalid code dates and unsupported code formats', () => {
  assert.throws(() => decodeBatchCode('MB23636710'), /invalid production day/);
  assert.throws(() => decodeBatchCode('6EF32C52'), /invalid production date/);
  assert.throws(() => decodeBatchCode('not-a-batch-code'), /format not recognized/);
});

test('treats leap-day expiry as the final day of February in the following year', () => {
  assert.deepEqual(
    decodeBatchCode('MB24406000'),
    { manufacturer: 'PMFTC', manufacturingDate: '2024-02-29', expiryDate: '2025-02-28' }
  );
});
