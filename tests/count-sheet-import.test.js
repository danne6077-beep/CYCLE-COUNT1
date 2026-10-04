const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, rowsFromMatrix } = require('../count-sheet-import-utils.js');

test('CSV parser preserves quoted commas, escaped quotes, and newlines', () => {
  const matrix = parseCsv('SKU,Description,Notes\r\n1,"Tea, green","Said ""fresh""\r\nstock"\r\n');
  assert.deepStrictEqual(matrix, [
    ['SKU', 'Description', 'Notes'],
    ['1', 'Tea, green', 'Said "fresh"\r\nstock']
  ]);
});

test('matrix rows receive unique headers and retain additional cells', () => {
  const rows = rowsFromMatrix([
    ['SKU', 'SKU', ''],
    ['1001', '1002', '4'],
    ['', '', '']
  ]);
  assert.deepStrictEqual(rows, [{ SKU: '1001', 'SKU (2)': '1002', 'Column 3': '4' }]);
});

test('matrix conversion rejects missing headers or data rows', () => {
  assert.throws(() => rowsFromMatrix([]), /header row/);
  assert.throws(() => rowsFromMatrix([['SKU', 'Description']]), /no data rows/);
});

test('CSV parser rejects unterminated quoted fields', () => {
  assert.throws(() => parseCsv('SKU,Description\n1,"incomplete'), /unclosed quoted field/);
});
