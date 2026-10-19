/** Prices are integer centavos. Missing prices remain null throughout. */
/** @typedef {{sku:string,name:string,priceCentavos:number|null,priceAsOf?:string|null,promoCentavos?:number|null,promoStart?:string|null,promoEnd?:string|null,size?:number|null,unit?:string|null,piecesPerPack?:number|null,category?:string,subcategory?:string,comparisonGroup?:string|null,brand?:string|null,houseBrand?:boolean|null,inStock?:boolean|null}} Product */
/** @typedef {{product:Product,quantity:number,manualCentavos?:number|null,unitCentavos?:number|null,checked?:boolean,note?:string,observedAt?:string}} Line */
export const WARNING = 'Prices may not always be accurate. Estimate only. Final prices are confirmed at the cashier.';
export const money = value => value == null ? 'Price unavailable' : new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(value/100);
export const normalizeText = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
/** Parse a decimal string without binary floating point multiplication. */
export function parseMoney(value) {
  const input=String(value??'').trim().replace(/^₱\s*/,'');
  if(input.includes(',')&&!/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(input))return null;
  const s = input.replace(/,/g,'');
  if (!/^\d+(?:\.\d{1,2})?$/.test(s)) return null;
  const [whole,fraction=''] = s.split('.');
  const cents = Number(whole)*100 + Number(fraction.padEnd(2,'0'));
  return Number.isSafeInteger(cents) && cents <= 999999999 ? cents : null;
}
export function today(date = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function validDate(value) { if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value; }
/** @param {Product} product */
export function price(product, day = today()) {
  if (!Number.isSafeInteger(product.priceCentavos) || product.priceCentavos < 0) return null;
  if (Number.isSafeInteger(product.promoCentavos) && product.promoCentavos >= 0 && product.promoCentavos < product.priceCentavos && validDate(product.promoStart) && validDate(product.promoEnd) && product.promoStart <= day && day <= product.promoEnd) return product.promoCentavos;
  return product.priceCentavos;
}
/** @param {Line} line */
export function linePrice(line,day = today()) { if('unitCentavos'in line)return line.unitCentavos;return Number.isSafeInteger(line.manualCentavos) && line.manualCentavos >= 0 ? line.manualCentavos : price(line.product,day); }
/** @param {Line[]} lines */
export function totals(lines,day = today()) {
  let knownCentavos=0, unpricedQuantity=0, count=0;
  const categories={};
  for (const line of lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity<1 || line.quantity>9999) throw new Error('Invalid quantity');
    const p=linePrice(line,day); count+=line.quantity;
    if(p==null) { unpricedQuantity+=line.quantity; continue; }
    const sum=p*line.quantity;
    if(!Number.isSafeInteger(sum) || !Number.isSafeInteger(knownCentavos+sum)) throw new Error('Total exceeds safe money range');
    knownCentavos+=sum;
    const c=line.product.category||'Other'; categories[c]=(categories[c]||0)+sum;
  }
  return {knownCentavos,unpricedQuantity,count,categories,complete:unpricedQuantity===0};
}
export function budgetStatus(total,budget) {
  if(!Number.isSafeInteger(budget)||budget<=0) return {state:'unset',ratio:0,label:'Set a trip budget',remaining:null};
  const ratio=total/budget;
  return {state:ratio>1?'over':ratio>=0.8?'near':'good',ratio,label:ratio>1?'Over budget':ratio>=0.8?'Getting close':'Comfortably within budget',remaining:budget-total};
}
export function gs1Valid(code) {
  if(!/^\d+$/.test(code)||![8,12,13,14].includes(code.length)) return false;
  const digits=[...code].map(Number); const check=digits.pop();
  const sum=digits.reverse().reduce((v,d,i)=>v+d*(i%2===0?3:1),0);
  return (10-sum%10)%10===check;
}
export function expandUpce(code) {
  if(!/^[01]\d{7}$/.test(code)) return null;
  const [n,a,b,c,d,e,f,x]=code;
  if('012'.includes(f)) return n+a+b+f+'0000'+c+d+e+x;
  if(f==='3') return n+a+b+c+'00000'+d+e+x;
  if(f==='4') return n+a+b+c+d+'00000'+e+x;
  return n+a+b+c+d+e+'0000'+f+x;
}
export function barcodeVariants(raw) {
  const code=String(raw??'').trim().replace(/\s+/g,'');
  if(!code || code.length>100 || /[\x00-\x1f]/.test(code)) return [];
  const variants=new Set([code]);
  if(/^\d{12}$/.test(code)) variants.add('0'+code);
  if(/^0\d{12}$/.test(code)) variants.add(code.slice(1));
  if(/^\d{8}$/.test(code)) { const expanded=expandUpce(code); if(expanded&&gs1Valid(expanded)) { variants.add(expanded);variants.add('0'+expanded); } }
  return [...variants];
}
export const bucket = code => [...String(code)].reduce((s,c)=>s+c.charCodeAt(0),0)%64;
/** @param {Product} p */
export function comparable(p) {
  if(!p.size || !Number.isFinite(p.size) || p.size<=0 || !p.unit) return null;
  const u=p.unit.toLowerCase();
  if(u==='g') return {dimension:'mass',amount:p.size,scale:100,label:'100 g'};
  if(u==='kg') return {dimension:'mass',amount:p.size*1000,scale:100,label:'100 g'};
  if(u==='ml') return {dimension:'volume',amount:p.size,scale:100,label:'100 ml'};
  if(u==='l') return {dimension:'volume',amount:p.size*1000,scale:100,label:'100 ml'};
  if(u==='pc') return {dimension:'piece',amount:p.size,scale:1,label:'piece'};
  if(u==='pack' && Number.isSafeInteger(p.piecesPerPack) && p.piecesPerPack>0) return {dimension:'piece',amount:p.size*p.piecesPerPack,scale:1,label:'piece'};
  return null;
}
/** @param {Product} p */
export function unitPrice(p,day=today()) { const c=comparable(p),v=price(p,day); return c&&v!=null?{centavos:v/c.amount*c.scale,label:c.label,dimension:c.dimension,amount:c.amount}:null; }
/** Verified comparison groups prevent category-only unsafe swaps. @param {Product} a @param {Product} b */
export function sameGroup(a,b) { return !!a.comparisonGroup && a.comparisonGroup===b.comparisonGroup && !!a.subcategory && a.subcategory===b.subcategory && a.category===b.category; }
/** @param {Line[]} lines @param {Product[]} catalog */
export function savings(lines,catalog,budget,day=today(),dismissed=[]) {
  const suggestions=[];
  for(const line of lines) {
    const from=line.product, fromPrice=linePrice(line,day), a=unitPrice(from,day);
    if(fromPrice==null || !a || line.manualCentavos!=null) continue;
    for(const target of catalog) {
      if(target.sku===from.sku || target.inStock!==true || !sameGroup(from,target)) continue;
      if(lines.some(l=>l.product.sku===target.sku&&(l.manualCentavos!=null||l.unitCentavos!=null)))continue;
      const b=unitPrice(target,day), targetPrice=price(target,day);
      if(!b || b.dimension!==a.dimension || b.centavos>=a.centavos || targetPrice==null) continue;
      const ratio=b.amount/a.amount;
      const requiredQuantity=Math.ceil(a.amount*line.quantity/b.amount);
      const saved=fromPrice*line.quantity-targetPrice*requiredQuantity;
      const bigger=from.brand && from.brand===target.brand && b.amount>a.amount;
      const type=bigger?'bulk':target.houseBrand===true?'house-brand':target.promoCentavos===targetPrice?'promo':'equivalent';
      if(!bigger && (ratio<0.8||ratio>1.25)) continue;
      if(saved<=0) continue;
      const id=type+':'+from.sku+':'+target.sku;
      if(dismissed.includes(id)) continue;
      suggestions.push({id,type,from,target,quantity:requiredQuantity,savedCentavos:saved,
        confidence:bigger?'Same brand, bigger pack':'Similar item — check suitability',
        reason:bigger?`Lower unit price. Buy ${requiredQuantity} pack(s) if you will use the full ${b.amount*requiredQuantity} base units; shelf life is unknown.`:`Same verified comparison group; ${money(saved)} less for this basket quantity.`,
        explanation:`${fromPrice} × ${line.quantity} − ${targetPrice} × ${requiredQuantity}; unit ${a.centavos} → ${b.centavos} per ${a.label}`});
    }
  }
  // One best swap per source avoids summing mutually exclusive choices.
  const best=new Map();
  const familiarity=brand=>lines.filter(l=>l.product.brand===brand).length;
  for(const s of suggestions.sort((a,b)=>b.savedCentavos-a.savedCentavos||familiarity(b.target.brand)-familiarity(a.target.brand)||a.target.sku.localeCompare(b.target.sku))) if(!best.has(s.from.sku)) best.set(s.from.sku,s);
  const result=[...best.values()];
  for(let i=0;i<lines.length;i++) for(let j=i+1;j<lines.length;j++) {
    const a=lines[i].product,b=lines[j].product,id='overlap:'+a.sku+':'+b.sku;
    if(a.sku!==b.sku&&sameGroup(a,b)&&!dismissed.includes(id)) result.push({id,type:'overlap',from:a,target:b,quantity:0,savedCentavos:0,confidence:'Similar items',reason:'You have two items in the same verified comparison group. Do you need both?',explanation:'Comparison-group overlap; no savings assumed.'});
  }
  const t=totals(lines,day);
  if(budget>0 && t.knownCentavos>budget) {
    let remaining=t.knownCentavos-budget;
    const actions=[];
    for(const l of [...lines].sort((a,b)=>(linePrice(b,day)||0)*b.quantity-(linePrice(a,day)||0)*a.quantity)) {
      const value=linePrice(l,day); if(value==null) continue;
      actions.push({sku:l.product.sku,name:l.product.name,centavos:value*l.quantity}); remaining-=value*l.quantity;
      if(remaining<=0) break;
    }
    result.unshift({id:'rescue',type:'rescue',from:null,target:null,quantity:0,savedCentavos:0,confidence:'Your choice',actions,reason:`Removing ${actions.length} selected line(s) would bring the known subtotal within budget. Nothing is removed automatically.`,explanation:'Greedy descending complete-line cost; unknown prices excluded, global optimality not claimed.'});
  }
  return result;
}
export function csvEscape(value) { const s=String(value??''); const safe=/^[=+@\-\t\r]/.test(s)?"'"+s:s; return '"'+safe.replace(/"/g,'""')+'"'; }
export function tripCsv(trips) { return ['Date,SKU,Name,Quantity,Unit PHP,Line PHP,Price source',...trips.flatMap(t=>t.lines.map(l=>[t.date,l.product.sku,l.product.name,l.quantity,linePrice(l)==null?'':(linePrice(l)/100).toFixed(2),linePrice(l)==null?'':(linePrice(l)*l.quantity/100).toFixed(2),l.manualCentavos!=null?'Shelf price entered on device':'Catalog'].map(csvEscape).join(',')))].join('\r\n'); }
export function monthlyInsight(trips,catalog=[]) {
  const category={};
  for(const t of trips) for(const [c,v] of Object.entries(t.totals.categories)) category[c]=(category[c]||0)+Number(v);
  const top=Object.entries(category).sort((a,b)=>Number(b[1])-Number(a[1]))[0];
  if(!top)return 'Finish a trip to see your spending patterns.';
  const opportunities=[];
  for(const trip of trips){
    const lines=(trip.lines||[]).filter(l=>l.product.category===top[0]&&linePrice(l)!=null).map(l=>({product:{...l.product,priceCentavos:linePrice(l),promoCentavos:null},quantity:l.quantity}));
    opportunities.push(...savings(lines,catalog,0).filter(s=>s.savedCentavos>0));
  }
  const potential=opportunities.sort((a,b)=>b.savedCentavos-a.savedCentavos).slice(0,3).reduce((n,s)=>n+s.savedCentavos,0);
  return `Your largest recorded category is ${top[0]} at ${money(top[1])}. `+(potential?`Your top ${Math.min(3,opportunities.length)} eligible recorded purchase(s) could save about ${money(potential)} using current verified alternatives. Check today's shelf prices.`:'Savings estimates need verified comparison prices.');
}
