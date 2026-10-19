const test = require('node:test');
const assert = require('node:assert/strict');

function luminance(hex) {
  const values = hex.replace('#', '').match(/.{2}/g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}
function contrast(a, b) {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test('light and dark theme token pairs meet WCAG AA contrast', () => {
  const pairs = [
    ['light body text', '#19211e', '#f4f6f4', 4.5],
    ['light muted text', '#56645d', '#ffffff', 4.5],
    ['light accent action', '#ffffff', '#08785b', 4.5],
    ['dark body text', '#e6ede9', '#101713', 4.5],
    ['dark muted text', '#b0bdb6', '#17201b', 4.5],
    ['dark active accent', '#55c6a0', '#101713', 4.5],
    ['dark primary action', '#ffffff', '#08785b', 4.5]
  ];
  for (const [name, foreground, background, minimum] of pairs) {
    assert.ok(contrast(foreground, background) >= minimum, `${name} contrast ${contrast(foreground, background).toFixed(2)} is below ${minimum}:1`);
  }
});
