import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';import {build} from 'esbuild';
import {preparePrices} from './prepare-prices.mjs';import {buildChat} from './build-chat.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist');
preparePrices(root);const chatReport=buildChat(root);
if(path.dirname(out)!==root||path.basename(out)!=='dist')throw new Error('Unexpected output path');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const file of ['index.html','app.js','style.css','design.css','chat.css','i18n.js','icon.svg','manifest.webmanifest','staff.html','staff.js','account-config.json','catalog.schema.json'])fs.copyFileSync(path.join(root,file),path.join(out,file));
for(const dir of ['lib','catalog','chat-data','fonts','icons','templates'])if(fs.existsSync(path.join(root,dir)))fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});
await build({entryPoints:[path.join(root,'lib/chat/worker.js')],bundle:true,format:'esm',minify:true,target:'es2020',define:{__CHAT_VERSION__:JSON.stringify(chatReport.version)},outfile:path.join(out,'lib/chat/worker.js')});
fs.mkdirSync(path.join(out,'vendor'),{recursive:true});
await build({stdin:{contents:'export {BrowserMultiFormatReader} from "@zxing/browser"',resolveDir:root},bundle:true,format:'esm',minify:true,target:'es2020',outfile:path.join(out,'vendor/scanner.js')});
await build({stdin:{contents:'import QR from "qrcode"; export const toDataURL=QR.toDataURL;',resolveDir:root},bundle:true,platform:'browser',format:'esm',minify:true,target:'es2020',outfile:path.join(out,'vendor/qr.js')});
fs.writeFileSync(path.join(out,'account-config.json'),JSON.stringify({apiKey:process.env.SHOPPER_FIREBASE_API_KEY||'',projectId:process.env.SHOPPER_FIREBASE_PROJECT_ID||'',syncEnabled:process.env.SHOPPER_CLOUD_SYNC==='true'}));
const rawShell=[];
function collect(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name),rel=path.relative(out,p).replaceAll('\\','/');if(e.isDirectory()){if(e.name!=='catalog')collect(p);}else if(!['staff.html','staff.js'].includes(rel))rawShell.push('./'+rel);}}
collect(out);
// Fingerprint canonical sources before stamping that fingerprint into imports/cache keys.
const hash=createHash('sha256');for(const file of rawShell)hash.update(fs.readFileSync(path.join(out,file)));const version=hash.digest('hex').slice(0,12);
for(const rel of rawShell.filter(f=>f.endsWith('.js')&&!f.includes('/vendor/'))){const file=path.join(out,rel);let source=fs.readFileSync(file,'utf8');source=source.replace(/((?:\bfrom\s*|\bimport\s*\(\s*)['"])(\.\.?\/[^'"]+\.js)(?:\?[^'"]*)?(['"])/g,(_,prefix,file,quote)=>prefix+file+'?v='+version+quote).replaceAll('?v=harden1','?v='+version).replace('__SHELL_EXPECTED__',version);fs.writeFileSync(file,source);}
const html=path.join(out,'index.html');fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace(/(\.\/(?:app\.js|style\.css|design\.css|chat\.css))(?:\?v=[^"']+)?/g,'$1?v='+version));
const shell=rawShell.map(file=>/\.(?:js|css)$/.test(file)?file+'?v='+version:file.startsWith('./chat-data/')?file+'?v='+chatReport.version:file);
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8').replace('__SHELL_VERSION__',version).replace(/\/\*PRECACHE\*\/\[[^\n]*\]/,JSON.stringify(shell));fs.writeFileSync(path.join(out,'sw.js'),sw);
const initial=new Set();function visit(file){if(initial.has(file))return;initial.add(file);const source=fs.readFileSync(file,'utf8');for(const m of source.matchAll(/\bimport\s+(?:[^;]*?\s+from\s*)?['"](\.[^'"]+)['"]/g)){const next=path.resolve(path.dirname(file),m[1].split('?')[0]);if(next.endsWith('.js'))visit(next);}}visit(path.join(out,'app.js'));
const jsBytes=[...initial].reduce((sum,file)=>sum+gzipSync(fs.readFileSync(file)).length,0);if(jsBytes>150*1024)throw new Error('Initial JavaScript exceeds 150 KB gzipped');
const meta=JSON.parse(fs.readFileSync(path.join(out,'catalog/catalog-meta.json')));for(const file of meta.files)if(createHash('sha256').update(fs.readFileSync(path.join(out,file.path))).digest('hex')!==file.checksum)throw new Error('Catalog checksum mismatch: '+file.path);
const gzip=file=>gzipSync(fs.readFileSync(path.join(out,file))).length;const playbookGzipBytes=fs.readdirSync(path.join(out,'chat-data/playbooks')).reduce((sum,file)=>sum+gzip('chat-data/playbooks/'+file),0);if(playbookGzipBytes>60*1024)throw new Error('Playbooks exceed 60 KiB gzip');
const report={shellVersion:version,priceAnomalies:chatReport.anomalies,initialJavaScriptGzipBytes:jsBytes,initialModules:[...initial].map(file=>path.relative(out,file).replaceAll('\\','/')),chatWorkerGzipBytes:gzip('lib/chat/worker.js'),chatSnapshotGzipBytes:gzip('chat-data/catalog.json'),playbookGzipBytes,chatVersion:chatReport.version,scannerLazyGzipBytes:gzip('vendor/scanner.js'),catalogFiles:meta.files.length,itemCount:meta.itemCount};
fs.mkdirSync(path.join(root,'..','docs'),{recursive:true});fs.writeFileSync(path.join(root,'..','docs/shopper-build-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
