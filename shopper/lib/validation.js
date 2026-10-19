import {parseMoney,validDate,gs1Valid} from './core.js';
/** Validate staff enrichment. Reference records stay unpriced until merged. */
export function validateEnrichment(rows,knownSkus) {
  const errors=[],warnings=[],products=[],seen=new Set();
  rows.forEach((r,index)=>{
    const row=index+2,sku=String(r.PRODUCT_CODE||'').trim();
    const error=message=>errors.push({row,sku,message});
    if(!sku || !knownSkus.has(sku)) error('SKU is missing or is not in HYPERMART.');
    if(seen.has(sku)) error('Duplicate SKU enrichment.'); seen.add(sku);
    const p=parseMoney(r.SELLING_PRICE_PHP);
    if(p==null || p<=0) error('Selling price must be a positive PHP value with at most two decimals.');
    if(!validDate(r.PRICE_EFFECTIVE_DATE)) error('PRICE_EFFECTIVE_DATE must be a valid YYYY-MM-DD.');
    const hasSize=String(r.NET_SIZE??'').trim()!=='';
    const size=hasSize?Number(r.NET_SIZE):null;
    const unit=String(r.NET_UNIT||'').trim().toLowerCase();
    if(hasSize && (!Number.isFinite(size)||size<=0||!['g','kg','ml','l','pc','pack'].includes(unit))) error('Net size and unit must be valid together.');
    if(!hasSize&&unit) error('NET_SIZE is required when NET_UNIT is set.');
    if(!hasSize) warnings.push({row,sku,message:'No verified size; excluded from savings.'});
    const pieces=r.PIECES_PER_PACK?Number(r.PIECES_PER_PACK):null;
    if(unit==='pack'&&(!Number.isSafeInteger(pieces)||pieces<=0)) error('Pack comparisons need positive PIECES_PER_PACK.');
    const promoText=String(r.PROMO_PRICE_PHP??'').trim();
    const promo=promoText?parseMoney(promoText):null;
    if(promoText && (promo==null||promo<=0||promo>=p||!validDate(r.PROMO_START)||!validDate(r.PROMO_END)||r.PROMO_START>r.PROMO_END)) error('Promo requires a lower positive price and valid inclusive dates.');
    if(!promoText&&(r.PROMO_START||r.PROMO_END)) error('Promo dates require a promo price.');
    for(const field of ['HOUSE_BRAND','IN_STOCK']) if(r[field] && !['true','false'].includes(String(r[field]).trim().toLowerCase())) error(field+' must be true, false, or blank.');
    if(p>1000000) warnings.push({row,sku,message:'Price exceeds ₱10,000; verify outlier.'});
    products.push({sku,priceCentavos:p,priceAsOf:r.PRICE_EFFECTIVE_DATE,size,unit:unit||null,piecesPerPack:pieces,brand:r.BRAND?.trim()||null,comparisonGroup:r.COMPARISON_GROUP?.trim()||null,houseBrand:r.HOUSE_BRAND?String(r.HOUSE_BRAND).trim().toLowerCase()==='true':null,inStock:r.IN_STOCK?String(r.IN_STOCK).trim().toLowerCase()==='true':null,promoCentavos:promo,promoStart:r.PROMO_START||null,promoEnd:r.PROMO_END||null});
  });
  if(!rows.length) errors.push({row:1,sku:'',message:'No enrichment rows supplied.'});
  return {errors,warnings,products,canPublish:errors.length===0};
}
export function validateBarcodes(products) {
  const errors=[],warnings=[],seen=new Map();
  for(const p of products) for(const code of p.barcodes||[]) {
    if(seen.has(code)&&seen.get(code)!==p.sku) errors.push({sku:p.sku,message:'Barcode '+code+' maps to more than one SKU.'});
    seen.set(code,p.sku);
    if(/^\d+$/.test(code)&&[8,12,13,14].includes(code.length)&&!gs1Valid(code)) warnings.push({sku:p.sku,message:'Check-digit failure: '+code});
  }
  return {errors,warnings};
}
export function parseCsv(source) {
  const rows=[];let row=[],field='',quoted=false;
  const data=String(source).replace(/^\uFEFF/,'');
  for(let i=0;i<data.length;i++) {
    const c=data[i];
    if(c==='"'&&quoted&&data[i+1]==='"'){field+='"';i++;}
    else if(c==='"') quoted=!quoted;
    else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&data[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw new Error('Unclosed quoted CSV field.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  const headers=rows.shift()?.map(s=>s.trim())||[];
  if(new Set(headers).size!==headers.length)throw new Error('Duplicate CSV headers.');
  return rows.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]?.trim()||''])));
}
