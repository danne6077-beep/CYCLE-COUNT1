const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml } = require('../safe-text-utils.js');

test('escapes imported text before it is placed in HTML templates', () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert(1)"> & 'SKU'`), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;SKU&#39;');
  assert.equal(escapeHtml(null), '');
});
