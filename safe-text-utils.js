(function (root) {
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }
  const api = { escapeHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FujiSafeText = api;
})(typeof window !== 'undefined' ? window : globalThis);
