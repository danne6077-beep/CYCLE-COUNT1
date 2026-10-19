const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const excluded = new Set(['.git', 'node_modules', 'dist', 'qa']);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { if (!excluded.has(entry.name) && !entry.name.startsWith('.')) walk(path.join(dir, entry.name)); }
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path.join(dir, entry.name));
  }
}
walk(root);
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { failed = true; process.stderr.write(`${path.relative(root, file)}\n${result.stderr}`); }
}
if (failed) process.exit(1);
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
