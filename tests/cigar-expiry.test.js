const test = require('node:test');
const assert = require('node:assert/strict');
const { checkExpiry } = require('../cigar-expiry-utils.js');

const today = new Date(2026, 9, 4, 12);

test('accepts delivery that meets its supplied minimum remaining shelf life', () => {
  assert.deepEqual(
    checkExpiry({ expiryDate: '2027-04-02', minimumDays: '180', now: today }),
    { decision: 'accept', daysRemaining: 180, minimumDays: 180, expiryDate: '2027-04-02' }
  );
});

test('rejects unexpired stock below the required minimum shelf life', () => {
  assert.equal(checkExpiry({ expiryDate: '2026-10-20', minimumDays: 30, now: today }).decision, 'reject-shelf-life');
});

test('rejects stock expiring today or earlier', () => {
  assert.equal(checkExpiry({ expiryDate: '2026-10-04', minimumDays: 0, now: today }).decision, 'reject-expired');
  assert.equal(checkExpiry({ expiryDate: '2026-10-03', minimumDays: 0, now: today }).decision, 'reject-expired');
});

test('rejects invalid expiry dates and receiving thresholds', () => {
  assert.throws(() => checkExpiry({ expiryDate: '2026-02-30', minimumDays: 0, now: today }), /valid expiry date/);
  assert.throws(() => checkExpiry({ expiryDate: '2027-01-01', minimumDays: '', now: today }), /threshold/);
  assert.throws(() => checkExpiry({ expiryDate: '2027-01-01', minimumDays: -1, now: today }), /threshold/);
});
