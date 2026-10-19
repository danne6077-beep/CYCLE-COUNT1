import fs from 'node:fs';import path from 'node:path';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
export function buildChat(root){
 const meta=JSON.parse(fs.readFileSync(path.join(root,'catalog/catalog-meta.json'))),prices=JSON.parse(fs.readFileSync(path.join(root,'catalog/catalog-prices.json'))),details=new Map();
 for(const file of meta.files.filter(f=>/products\.v/.test(f.path)))for(const row of JSON.parse(gunzipSync(fs.readFileSync(path.join(root,file.path)))))details.set(row[0],row[5]);
 const rows=prices.items.map(p=>[p.sku,p.name,p.category,p.subcategory,p.department,p.priceCentavos,p.brand||null,p.size??null,p.unit??null,p.aisle??null,p.inStock??null,details.get(p.sku)||[],p.promoCentavos??null,p.promoStart??null,p.promoEnd??null]);
 const version=createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0,20),snapshot={schema:1,version,priceAsOf:prices.effectiveDate||null,source:'Supplied HYPERMART assortment',rows};
 fs.mkdirSync(path.join(root,'chat-data'),{recursive:true});fs.writeFileSync(path.join(root,'chat-data/catalog.json'),JSON.stringify(snapshot));
 fs.writeFileSync(path.join(root,'chat-data/config.json'),JSON.stringify({enableJulian:process.env.ENABLE_JULIAN_EGG!=='false'}));
 return {version,count:rows.length,bytes:fs.statSync(path.join(root,'chat-data/catalog.json')).size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename)console.log(JSON.stringify(buildChat(path.resolve(import.meta.dirname,'..'))));
