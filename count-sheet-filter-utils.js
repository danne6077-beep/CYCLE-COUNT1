(function (global) {
  function normalizeCategory(item) {
    const value = String(item && (item.category || item.subdeptName || item.classification || 'Uncategorized')).trim();
    return value || 'Uncategorized';
  }

  function normalizeSupplier(item) {
    const value = String(item && (item.supplier || 'Unassigned Supplier')).trim();
    return value || 'Unassigned Supplier';
  }

  function normalizeDepartment(item) {
    return String(item && (item.departmentCode || item.deptCode || '')).trim();
  }

  function passesSelectedFilters(item, options = {}) {
    const {
      ccd = 'all',
      department = 'all',
      supplier = 'all',
      category = 'all'
    } = options;

    if (ccd !== 'all' && String(item.ccdNo || item.ccd || '').trim() !== ccd) {
      return false;
    }

    if (department !== 'all' && normalizeDepartment(item) !== department) {
      return false;
    }

    if (supplier !== 'all' && normalizeSupplier(item) !== supplier) {
      return false;
    }

    if (category && category !== 'all' && category !== '__mix__' && normalizeCategory(item) !== category) {
      return false;
    }

    return true;
  }

  function getDepartmentSupplierOptions(items, options = {}) {
    const { ccd = 'all', department = 'all', category = 'all' } = options;
    return [...new Set((items || [])
      .filter(item => passesSelectedFilters(item, { ccd, department, supplier: 'all', category }))
      .map(normalizeSupplier)
    )].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
  }

  function getDepartmentCategoryOptions(items, options = {}) {
    const { ccd = 'all', department = 'all', supplier = 'all' } = options;
    return [...new Set((items || [])
      .filter(item => passesSelectedFilters(item, { ccd, department, supplier, category: 'all' }))
      .map(normalizeCategory)
    )].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
  }

  function applyCombinedGroupingRules({ selectedCategory, groupingMode }) {
    if (selectedCategory === '__mix__') {
      return { groupingMode: 'category' };
    }
    return { groupingMode: groupingMode || 'supplier' };
  }

  const api = {
    normalizeCategory,
    normalizeSupplier,
    normalizeDepartment,
    passesSelectedFilters,
    getDepartmentSupplierOptions,
    getDepartmentCategoryOptions,
    applyCombinedGroupingRules
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.CountSheetFilters = api;
}(typeof window !== 'undefined' ? window : globalThis));
