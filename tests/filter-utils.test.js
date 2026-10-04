const test = require('node:test');
const assert = require('node:assert/strict');
const { getDepartmentSupplierOptions, getDepartmentCategoryOptions, applyCombinedGroupingRules } = require('../count-sheet-filter-utils.js');

const items = [
  { ccdNo: '1', departmentCode: '600', supplier: 'Alpha', category: 'Milk' },
  { ccdNo: '1', departmentCode: '600', supplier: 'Beta', category: 'Bread' },
  { ccdNo: '2', departmentCode: '600', supplier: 'Alpha', category: 'Milk' },
  { ccdNo: '1', departmentCode: '700', supplier: 'Gamma', category: 'Snack' }
];

test('supplier choices only include department items for the selected category', () => {
  assert.deepStrictEqual(getDepartmentSupplierOptions(items, { ccd: 'all', department: '600', category: 'Milk' }), ['Alpha']);
  assert.deepStrictEqual(getDepartmentCategoryOptions(items, { ccd: 'all', department: '600', supplier: 'Alpha' }), ['Milk']);
});

test('mix categories turns on category grouping automatically', () => {
  const result = applyCombinedGroupingRules({ selectedCategory: '__mix__', groupingMode: 'split' });
  assert.equal(result.groupingMode, 'category');
});
