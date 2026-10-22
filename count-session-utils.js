(function (root) {
  function readQuantity(value, label) {
    if (value === null || value === undefined || value === '') return null;
    const quantity = Number(value);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new Error(`${label} must be a non-negative whole number.`);
    }
    return quantity;
  }

  function calculateVariance(expectedValue, countedValue, toleranceValue = 0) {
    const expected = readQuantity(expectedValue, 'Expected quantity');
    const counted = readQuantity(countedValue, 'Counted quantity');
    const tolerance = readQuantity(toleranceValue, 'Tolerance');
    if (expected === null) throw new Error('Expected quantity is required.');
    if (counted === null) {
      return { expected, counted: null, variance: null, variancePct: null, status: 'pending' };
    }
    const variance = counted - expected;
    const variancePct = expected === 0 ? null : (variance / expected) * 100;
    const status = variance === 0 ? 'matched' : Math.abs(variance) <= tolerance ? 'within-tolerance' : 'recount';
    return { expected, counted, variance, variancePct, status };
  }

  function pagesForGroups(groupCounts, rowsPerPage) {
    const pageSize = readQuantity(rowsPerPage, 'Rows per page');
    if (!pageSize) throw new Error('Rows per page must be greater than zero.');
    return groupCounts.reduce((total, count) => total + Math.ceil(readQuantity(count, 'Group row count') / pageSize), 0);
  }

  const api = { readQuantity, calculateVariance, pagesForGroups };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CountSessionUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
