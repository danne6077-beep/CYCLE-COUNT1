import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
export function preparePrices(root){
  const meta=JSON.parse(fs.readFileSync(path.join(root,'catalog/catalog-meta.json')));
  const prices=JSON.parse(fs.readFileSync(path.join(root,'catalog/catalog-prices.json')));
  if(meta.mode!=='priced-assortment')return;
  const starter=new Set(JSON.parse(gunzipSync(fs.readFileSync(path.join(root,meta.starterPath)))).map(r=>r[0]));
  fs.writeFileSync(path.join(root,'catalog/starter-prices.json'),JSON.stringify({...prices,history:[],items:prices.items.filter(p=>starter.has(p.sku))}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename)preparePrices(path.resolve(import.meta.dirname,'..'));
