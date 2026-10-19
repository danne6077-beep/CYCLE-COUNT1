import {read,write,clearStore} from './storage.js';
import {barcodeVariants,bucket,normalizeText} from './core.js';
const base=new URL('../',import.meta.url);
export class Catalog {
  constructor(){this.meta=null;this.rows=[];this.bySku=new Map();this.parts=new Map();this.prices=new Map();this.progress=()=>{};}
  async init() {
    const cached=await read('meta','catalog');
    try {const r=await fetch(new URL('catalog/catalog-meta.json',base),{cache:'no-store'});if(!r.ok)throw new Error('Catalog unavailable');this.meta=await r.json();}
    catch(error){if(!cached)throw new Error('Connect once to download the Hypermart catalog.');this.meta=cached;}
    if(cached&&cached.checksum!==this.meta.checksum) await clearStore('catalog');
    await write('meta',this.meta,'catalog');
    this.loadedDepartments=new Set();
    await this.loadDepartment('groceries');
    await this.refreshPrices();
    return this;
  }
  async loadDepartment(department='groceries') {
    const wanted=this.meta.departments.map((name,i)=>({name,i})).filter(d=>department==='all'||(department==='groceries'?['FMCG','FRESH & STAPLE'].includes(d.name):d.name===department));
    for(const d of wanted) {
      if(this.loadedDepartments.has(d.i))continue;
      const rows=await this.file(`catalog/search.v${this.meta.version}.${d.i}.json.gz`);
      this.rows=this.rows.concat(rows);
      for(const row of rows)this.bySku.set(row[0],row);
      this.loadedDepartments.add(d.i);
    }
  }
  async refreshPrices() {
    let data=await read('prices','catalog');
    try{const r=await fetch(new URL('catalog/catalog-prices.json',base),{cache:'no-store'});if(r.ok){const next=await r.json();if(Array.isArray(next.items)){data=next;await write('prices',data,'catalog');}}}catch{}
    this.priceVersion=data?.version||0;
    this.prices=new Map((data?.items||[]).map(p=>[p.sku,p]));
    this.priceAsOf=data?.updatedAt||null;
  }
  async file(path) {
    if(this.parts.has(path))return this.parts.get(path);
    const promise=(async()=>{
      const bytes=await this.bytes(path);
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(stream).text());
    })();
    this.parts.set(path,promise);
    if(this.parts.size>12){const first=this.parts.keys().next().value;this.parts.delete(first);}
    try{return await promise;}catch(e){this.parts.delete(path);throw e;}
  }
  async bytes(path){
    let bytes=await read(path,'catalog');
    if(!bytes){
      const r=await fetch(new URL(path,base));if(!r.ok)throw new Error('This part of the catalog is not available offline yet.');
      bytes=await r.arrayBuffer();
      const entry=this.meta.files.find(f=>f.path===path);
      const checksum=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
      if(!entry||checksum!==entry.checksum)throw new Error('Catalog integrity check failed. Please check for new catalog data.');
      await write(path,bytes,'catalog');
    }
    return bytes;
  }
  product(row) {
    if(!row)return null;
    const [sku,name,c,s,d]=row;
    return {sku,name,category:this.meta.categories[c],subcategory:this.meta.subcategories[s],department:this.meta.departments[d],priceCentavos:null,priceAsOf:null,size:null,unit:null,brand:null,houseBrand:null,inStock:null,...this.prices.get(sku)};
  }
  search(query='',category='',limit=40,department='groceries') {
    const aliases={bigas:'rice',gatas:'milk',asukal:'sugar',asin:'salt',mantika:'oil',tubig:'water',kape:'coffee',tinapay:'bread',itlog:'egg',sabon:'soap'};
    const words=normalizeText(query).split(' ').filter(Boolean).map(w=>aliases[w]||w);
    const matches=[];
    for(const r of this.rows) {
      if(department==='groceries'&&!['FMCG','FRESH & STAPLE'].includes(this.meta.departments[r[4]]))continue;
      if(!['all','groceries'].includes(department)&&this.meta.departments[r[4]]!==department)continue;
      if(category&&this.meta.categories[r[2]]!==category)continue;
      const text=normalizeText(r[0]+' '+r[1]);
      if(!words.every(w=>text.includes(w)))continue;
      matches.push(r);if(matches.length>=limit)break;
    }
    if(!matches.length&&words.length===1&&words[0].length>=4) {
      const q=words[0];
      for(const r of this.rows) {
        if(department==='groceries'&&!['FMCG','FRESH & STAPLE'].includes(this.meta.departments[r[4]]))continue;
        if(!['all','groceries'].includes(department)&&this.meta.departments[r[4]]!==department)continue;
        if(category&&this.meta.categories[r[2]]!==category)continue;
        const terms=normalizeText(r[1]).split(' ');
        if(terms.some(t=>oneEdit(t,q))){matches.push(r);if(matches.length>=limit)break;}
      }
    }
    return matches.map(r=>this.product(r));
  }
  async lookup(raw) {
    const skus=new Set();
    for(const code of barcodeVariants(raw)) {
      if(!this.bySku.has(code)&&/^[A-Za-z0-9_-]{1,32}$/.test(code))await this.details(code);
      if(this.bySku.has(code))skus.add(code);
      const file=`catalog/barcodes.v${this.meta.version}.${bucket(code)}.json.gz`;
      const index=await this.file(file);
      for(const sku of index[code]||[])skus.add(sku);
    }
    const products=[];
    for(const sku of skus){if(!this.bySku.has(sku))await this.details(sku);const p=this.product(this.bySku.get(sku));if(p)products.push(p);}
    return products;
  }
  async details(sku) {
    const list=await this.file(`catalog/products.v${this.meta.version}.${bucket(sku)}.json.gz`);
    const row=list.find(r=>r[0]===sku);
    if(row)this.bySku.set(sku,row.slice(0,5));
    return row?{barcodes:row[5],sourceStatus:row[6],sellingUnit:row[7]}:null;
  }
  async downloadAll(onProgress=()=>{}) {
    let done=0;
    // Three concurrent requests avoid flooding mobile connections.
    const queue=[...this.meta.files];
    await Promise.all(Array.from({length:3},async()=>{while(queue.length){const f=queue.shift();await this.bytes(f.path);onProgress(++done,this.meta.files.length);}}));
    await write('offlineComplete',this.meta.checksum,'catalog');
  }
}
function oneEdit(a,b){if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return edits+(i<a.length||j<b.length?1:0)<=1;}
