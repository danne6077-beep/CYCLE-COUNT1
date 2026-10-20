const {createHash}=require('node:crypto');const catalogVersion=require('../shopper/catalog/catalog-meta.json').version;const {getProduct,shard,bucket,fail,body,headers,sendError,verify}=require('../server/shopper.cjs');
module.exports=async function handler(req,res){headers(res);if(req.method!=='POST'){res.setHeader('Allow','POST');res.status(405).json({error:'POST required.'});return;}
 try{
  await verify(req,true);
  const token=process.env.CATALOG_GITHUB_TOKEN,repo=process.env.CATALOG_GITHUB_REPOSITORY,branch=process.env.CATALOG_GITHUB_BRANCH||'main';
  if(!token||!repo||!/^[-\w]+\/[-.\w]+$/.test(repo))throw fail(503,'Catalog publishing is not configured.');
  const data=body(req),{validateEnrichment}=await import('../shopper/lib/validation.js'),{today}=await import('../shopper/lib/core.js');
  if(!Array.isArray(data.rows)||data.rows.length>5000)throw fail(400,'Supply up to 5,000 enrichment rows.');
  const known=new Set(data.rows.map(r=>String(r.PRODUCT_CODE||'')).filter(sku=>getProduct(sku)));
  const validation=data.rollbackVersion!=null?{errors:[],warnings:[],products:[]}:validateEnrichment(data.rows,known);
  for(const p of validation.products){if(p.priceAsOf>today())validation.errors.push({sku:p.sku,message:'Price effective dates cannot be in the future.'});for(const code of getProduct(p.sku)?.barcodes||[]){if((shard(`barcodes.v${catalogVersion}.${bucket(code)}.json.gz`)[code]||[]).length>1)validation.errors.push({sku:p.sku,message:'Source barcode '+code+' maps to multiple products. Resolve the reference catalog before publishing this item.'});}}
  if(validation.errors.length){res.status(422).json({errors:validation.errors,warnings:validation.warnings});return;}
  async function github(route,method='GET',payload){const r=await fetch('https://api.github.com/repos/'+repo+route,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(12000)});const result=await r.json();if(!r.ok)throw fail(r.status===422?409:503,'Publication could not complete. Another update may have occurred; refresh version history and retry.');return result;}
  const head=await github('/git/ref/heads/'+encodeURIComponent(branch)),commit=await github('/git/commits/'+head.object.sha);
  const currentFile=await github('/contents/shopper/catalog/catalog-prices.json?ref='+encodeURIComponent(head.object.sha));
  const current=JSON.parse(Buffer.from(currentFile.content,'base64').toString('utf8'));
  if(data.expectedVersion!==current.version)throw fail(409,'A newer price catalog exists. Refresh before publishing.');
  let products;
  if(data.rollbackVersion!=null){const entry=(current.history||[]).find(h=>h.version===data.rollbackVersion);if(!entry||!/^shopper\/catalog\/prices\.v\d+\.json$/.test(entry.path))throw fail(400,'Unknown rollback version.');const file=await github('/contents/'+entry.path+'?ref='+head.object.sha);products=JSON.parse(Buffer.from(file.content,'base64').toString()).items;}
  else{const merged=new Map(current.items.map(p=>[p.sku,p]));for(const p of validation.products){const source=getProduct(p.sku);merged.set(p.sku,{...p,name:source.name,category:source.category,subcategory:source.subcategory,department:source.department});}products=[...merged.values()];}
  const version=current.version+1,updatedAt=new Date().toISOString();const checksum=createHash('sha256').update(JSON.stringify(products)).digest('hex');
  const snapshotPath=`shopper/catalog/prices.v${version}.json`,entry={version,updatedAt,itemCount:products.length,checksum,path:snapshotPath};
  const next={schemaVersion:1,sourceSheet:'HYPERMART',version,updatedAt,checksum,items:products,history:[...(current.history||[]),entry].slice(-20)};
  const tree=await github('/git/trees','POST',{base_tree:commit.tree.sha,tree:[{path:'shopper/catalog/catalog-prices.json',mode:'100644',type:'blob',content:JSON.stringify(next)},{path:snapshotPath,mode:'100644',type:'blob',content:JSON.stringify({schemaVersion:1,sourceSheet:'HYPERMART',version,updatedAt,checksum,items:products})}]});
  const created=await github('/git/commits','POST',{message:`Publish Hypermart prices v${version}`,tree:tree.sha,parents:[head.object.sha]});
  // Fast-forward only: concurrent updates are rejected instead of overwritten.
  await github('/git/refs/heads/'+encodeURIComponent(branch),'PATCH',{sha:created.sha,force:false});
  res.status(200).json({version,itemCount:products.length,commit:created.sha,warnings:validation.warnings,message:'Committed to the deployment branch. Prices go live after Vercel finishes deploying.'});
 }catch(error){sendError(res,error);}
};
