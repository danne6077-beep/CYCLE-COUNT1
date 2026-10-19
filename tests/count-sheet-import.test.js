const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, rowsFromMatrix, mapImportedRows } = require('../count-sheet-import-utils.js');
const Import = require('../count-sheet-import-utils.js');

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

test('imported rows map common Excel and CSV headers to count-sheet fields', () => {
  const rows = mapImportedRows(rowsFromMatrix([
    ['Supplier Name', 'Locator Code', 'SKU No.', 'UPC Code', 'Item Description', 'CCD No.', 'Dept Code'],
    ['Acme', 'WH-A1', '00123', '012345678905', 'Sample product', '42', '600']
  ]));
  assert.equal(rows[0].supplier, 'Acme');
  assert.equal(rows[0].locator, 'WH-A1');
  assert.equal(rows[0].sku, '00123');
  assert.equal(rows[0].barcode, '012345678905');
  assert.equal(rows[0].description, 'Sample product');
  assert.equal(rows[0].ccdNo, '42');
  assert.equal(rows[0].departmentCode, '600');
});

test('imported rows safely default missing supplier, locator, barcode, and description values', () => {
  const rows = mapImportedRows(rowsFromMatrix([
    ['SKU', 'UPC', 'Description'],
    ['00123', '', '']
  ]));
  assert.equal(rows[0].supplier, 'Unassigned Supplier');
  assert.equal(rows[0].locator, '');
  assert.equal(rows[0].barcode, '');
  assert.equal(rows[0].description, '');
  assert.equal(rows[0].category, 'Imported Items');
});

test('column suggestions support alternate headings and explicit remapping', () => {
  const rows=rowsFromMatrix([['Vendor','Bin','Product #','EAN code','On Hand Qty'],['Acme','SA-01','0007','4006381333931','12']]);
  const mapping=Import.suggestColumnMapping(rows);
  assert.equal(mapping.supplier,'Vendor');
  assert.equal(mapping.sku,'Product #');
  assert.equal(mapping.expectedQty,'On Hand Qty');
  const mapped=Import.mapRowsWithColumns(rows,{...mapping,sku:'Product #'});
  assert.equal(mapped[0].sku,'0007');
  assert.equal(mapped[0].expectedQty,'12');
  assert.equal(mapped[0]._sourceRow,2);
});

test('UPC/EAN digit validation handles correct and incorrect check digits', () => {
  assert.equal(Import.upcCheckDigitValid('4006381333931'),true);
  assert.equal(Import.upcCheckDigitValid('4006381333932'),false);
  assert.equal(Import.upcCheckDigitValid('unknown'),null);
});

test('row validation includes source row and duplicate issue reasons', () => {
  const rows=[{_sourceRow:8,sku:'7',barcode:'4006381333931'},{_sourceRow:9,sku:'7',barcode:'4006381333932'}];
  const issues=Import.validateRows(rows);
  assert.ok(issues.some(issue=>issue.row===8&&issue.message.includes('more than once')));
  assert.ok(issues.some(issue=>issue.row===9&&issue.message.includes('check digit')));
});

test('locator area recognition follows configured prefixes case-insensitively', () => {
  assert.equal(Import.recognizeLocatorArea('sa-01'), 'sa');
  assert.equal(Import.recognizeLocatorArea('WH-E-B2L2'), 'wh');
  assert.equal(Import.recognizeLocatorArea('BA1', { sa:'SA-', ba:'BA', wh:'WARE-' }), 'ba');
  assert.equal(Import.recognizeLocatorArea('Aisle 2'), '');
});

test('validator handles a 50,000-row import without changing row count', () => {
  const rows=Array.from({length:50000},(_,index)=>({sku:`SKU-${index}`,barcode:''}));
  assert.equal(Import.validateRows(rows).length,0);
});
