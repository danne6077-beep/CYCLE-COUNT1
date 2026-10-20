import {normalizeProduct} from '../lib/chat/normalize.js';
export const median=values=>{const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length?a.length%2?a[m]:(a[m-1]+a[m])/2:null;};
export function findAnomalies(items){
 const products=items.map(normalizeProduct),flags=new Map(products.map(p=>[p.sku,[]])),groups=new Map();
 const add=(key,p,value,kind)=>{if(value==null)return;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({p,value,kind});};
 for(const p of products){if(p.priceCentavos==null||p.priceCentavos<=0)flags.get(p.sku).push('nonpositive-or-missing');else if(p.priceCentavos<100)flags.get(p.sku).push('below-one-peso');add('price|'+p.category,p,p.priceCentavos,'category-price');if(p.unitPrice)add('unit|'+p.category+'|'+p.subcategory+'|'+p.unitPrice.unit,p,p.unitPrice.exact,'label-unit-price');}
 for(const rows of groups.values()){if(rows.length<8)continue;const mid=median(rows.map(r=>r.value)),mad=median(rows.map(r=>Math.abs(r.value-mid)));for(const r of rows)if(Math.abs(r.value-mid)>(mad>0?5*mad:Math.max(1,mid*.05)))flags.get(r.p.sku).push(r.kind+'-outlier');}
 const counts={flagged:0,nonpositiveOrMissing:0,belowOnePeso:0,categoryPrice:0,unitPrice:0};for(const f of flags.values()){if(f.length)counts.flagged++;if(f.includes('nonpositive-or-missing'))counts.nonpositiveOrMissing++;if(f.includes('below-one-peso'))counts.belowOnePeso++;if(f.includes('category-price-outlier'))counts.categoryPrice++;if(f.includes('label-unit-price-outlier'))counts.unitPrice++;}return {flags,counts};
}
