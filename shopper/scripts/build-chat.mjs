import fs from 'node:fs';import path from 'node:path';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {findAnomalies} from './price-anomalies.mjs';
import {normalizeScannedBarcode,gs1Valid} from '../lib/core.js';
export function buildChat(root){
 const meta=JSON.parse(fs.readFileSync(path.join(root,'catalog/catalog-meta.json'))),prices=JSON.parse(fs.readFileSync(path.join(root,'catalog/catalog-prices.json'))),details=new Map();
 for(const file of meta.files.filter(f=>/products\.v/.test(f.path)))for(const row of JSON.parse(gunzipSync(fs.readFileSync(path.join(root,file.path)))))details.set(row[0],row[5]);
 const playbookDir=path.join(root,'chat-data/playbooks'),playbookFiles=fs.readdirSync(playbookDir).filter(n=>n.endsWith('.json')&&n!=='index.json').sort(),playbookBodies=playbookFiles.map(n=>JSON.parse(fs.readFileSync(path.join(playbookDir,n))));
 const playbookVersion=createHash('sha256').update(JSON.stringify(playbookBodies)).digest('hex').slice(0,20);fs.writeFileSync(path.join(playbookDir,'index.json'),JSON.stringify({version:playbookVersion,files:playbookFiles}));
 const anomalies=findAnomalies(prices.items);
 const rows=prices.items.map(p=>[p.sku,p.name,p.category,p.subcategory,p.department,p.priceCentavos,p.brand||null,p.size??null,p.unit??null,p.aisle??null,p.inStock??null,details.get(p.sku)||[],p.promoCentavos??null,p.promoStart??null,p.promoEnd??null,anomalies.flags.get(p.sku)]);
 const version=createHash('sha256').update(JSON.stringify(rows)).update(JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'chat-data/aliases.json'))))).update(JSON.stringify([prices.effectiveDate||null,playbookVersion])).digest('hex').slice(0,20),snapshot={schema:1,version,priceAsOf:prices.effectiveDate||null,source:'Supplied HYPERMART assortment',playbookVersion,sourceLabel:'Supplied HYPERMART assortment',builtAt:new Date().toISOString(),effectiveDate:prices.effectiveDate||null,anomalyCounts:anomalies.counts,rows};
 fs.mkdirSync(path.join(root,'chat-data'),{recursive:true});fs.writeFileSync(path.join(root,'chat-data/catalog.json'),JSON.stringify(snapshot));
 // Source codes are identifiers, commonly already 12 digits: do not discard their final digit again.
 const scanKeys=new Map(),fullKeys=new Map(),add=(map,key,sku)=>{if(!key)return;if(!map.has(key))map.set(key,new Set());map.get(key).add(sku);};
 for(const [sku,codes] of details)for(const raw of codes){if(!/^\d{2,100}$/.test(raw))continue;add(scanKeys,raw.replace(/^0/,'').slice(0,12),sku);if([8,12,13,14].includes(raw.length)&&gs1Valid(raw))add(fullKeys,normalizeScannedBarcode(raw),sku);}
 const entries=map=>Object.fromEntries([...map].sort(([a],[b])=>a.localeCompare(b)).map(([key,skus])=>[key,[...skus].sort()]));
 fs.writeFileSync(path.join(root,'chat-data/scan-index.json'),JSON.stringify({rule:1,catalogChecksum:meta.checksum,keys:entries(scanKeys),fullKeys:entries(fullKeys)}));
 fs.rmSync(path.join(root,'chat-data/config.json'),{force:true});
 return {version,anomalies:anomalies.counts,count:rows.length,bytes:fs.statSync(path.join(root,'chat-data/catalog.json')).size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename)console.log(JSON.stringify(buildChat(path.resolve(import.meta.dirname,'..'))));
