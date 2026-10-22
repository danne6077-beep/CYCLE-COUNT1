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
    ['dark body text', '#e8f0ec', '#0c1512', 4.5],
    ['dark muted text', '#9db0a7', '#121d19', 4.5],
    ['dark active accent', '#34d399', '#0c1512', 4.5],
    ['dark primary action', '#ffffff', '#08785b', 4.5]
  ];
  for (const [name, foreground, background, minimum] of pairs) {
    assert.ok(contrast(foreground, background) >= minimum, `${name} contrast ${contrast(foreground, background).toFixed(2)} is below ${minimum}:1`);
  }
});

test('the phase 10 semantic text and action token pairs pass WCAG AA', () => {
  const pairs = [
    ['light text/background','#17201d','#f7faf8'],['light muted/surface','#536158','#ffffff'],
    ['light text/secondary surface','#17201d','#eef2ef'],['brand text/light panel','#08785b','#ffffff'],
    ['white primary button/light brand','#ffffff','#08785b'],['sapphire preset/white','#1d4ed8','#ffffff'],
    ['amber preset/white','#b45309','#ffffff'],['rose preset/white','#be123c','#ffffff'],
    ['dark text/background','#e8f0ec','#0c1512'],['dark muted/surface','#9db0a7','#121d19'],
    ['dark text/raised surface','#e8f0ec','#17231e'],['dark brand/background','#34d399','#0c1512'],
    ['dark button text/brand','#0c1512','#34d399']
  ];
  for (const [name, foreground, background] of pairs) assert.ok(contrast(foreground, background) >= 4.5, `${name}: ${contrast(foreground, background).toFixed(2)}:1`);
});
