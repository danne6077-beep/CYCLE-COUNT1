import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';import {build} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist');
if(path.dirname(out)!==root||path.basename(out)!=='dist')throw new Error('Unexpected output path');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const files=['index.html','app.js','style.css','i18n.js','icon.svg','manifest.webmanifest','staff.html','staff.js','account-config.json','catalog.schema.json'];
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(out,file));
for(const dir of ['lib','catalog','fonts','icons','templates'])if(fs.existsSync(path.join(root,dir)))fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});
fs.mkdirSync(path.join(out,'vendor'),{recursive:true});
await build({stdin:{contents:'export {BrowserMultiFormatReader} from "@zxing/browser"',resolveDir:root},bundle:true,format:'esm',minify:true,target:'es2020',outfile:path.join(out,'vendor/scanner.js')});
await build({stdin:{contents:'import QR from "qrcode"; export const toDataURL=QR.toDataURL;',resolveDir:root},bundle:true,platform:'browser',format:'esm',minify:true,target:'es2020',outfile:path.join(out,'vendor/qr.js')});
const config={apiKey:process.env.SHOPPER_FIREBASE_API_KEY||'',projectId:process.env.SHOPPER_FIREBASE_PROJECT_ID||'',syncEnabled:process.env.SHOPPER_CLOUD_SYNC==='true'};
fs.writeFileSync(path.join(out,'account-config.json'),JSON.stringify(config));
const shell=[];
function collect(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name),rel=path.relative(out,p).replaceAll('\\','/');if(e.isDirectory()){if(e.name!=='catalog')collect(p);}else if(!['staff.html','staff.js'].includes(rel))shell.push('./'+rel);}}
collect(out);
const hash=createHash('sha256');for(const file of shell)hash.update(fs.readFileSync(path.join(out,file)));const version=hash.digest('hex').slice(0,12);
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8').replace('__SHELL_VERSION__',version).replace('/*PRECACHE*/[]',JSON.stringify(shell));fs.writeFileSync(path.join(out,'sw.js'),sw);
let jsBytes=0;for(const file of ['app.js','i18n.js',...fs.readdirSync(path.join(out,'lib')).filter(s=>s.endsWith('.js')).map(s=>'lib/'+s)])jsBytes+=gzipSync(fs.readFileSync(path.join(out,file))).length;
if(jsBytes>150*1024)throw new Error('Initial JavaScript exceeds 150 KB gzipped');
const meta=JSON.parse(fs.readFileSync(path.join(out,'catalog/catalog-meta.json'),'utf8'));for(const file of meta.files){const bytes=fs.readFileSync(path.join(out,file.path));if(createHash('sha256').update(bytes).digest('hex')!==file.checksum)throw new Error('Catalog checksum mismatch: '+file.path);}
const report={shellVersion:version,initialJavaScriptGzipBytes:jsBytes,scannerLazyGzipBytes:gzipSync(fs.readFileSync(path.join(out,'vendor/scanner.js'))).length,catalogFiles:meta.files.length,itemCount:meta.itemCount};
fs.mkdirSync(path.join(root,'..','docs'),{recursive:true});fs.writeFileSync(path.join(root,'..','docs','shopper-build-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
