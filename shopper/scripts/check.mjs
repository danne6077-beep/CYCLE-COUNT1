import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');let failures=0,count=0;
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','dist','vendor','catalog'].includes(entry.name))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())visit(p);else if(/\.(?:js|mjs)$/.test(p)){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});count++;if(r.status){process.stderr.write(r.stderr);failures++;}}}}
visit(root);console.log(`Syntax checked ${count} source files; ${failures} errors.`);process.exitCode=failures?1:0;
