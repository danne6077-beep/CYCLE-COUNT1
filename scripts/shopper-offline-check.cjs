const {chromium}=require('playwright');const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),assert=require('node:assert/strict');let browser;
(async()=>{
 const root=path.resolve(__dirname,'..'),meta=JSON.parse(fs.readFileSync(path.join(root,'shopper/catalog/catalog-meta.json')));
 const other=JSON.parse(z.gunzipSync(fs.readFileSync(path.join(root,'shopper/catalog/search.v1.0.json.gz'))))[0];
 browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER_CHANNEL?{channel:process.env.TEST_BROWSER_CHANNEL}:{})});const context=await browser.newContext({viewport:{width:360,height:800}}),page=await context.newPage();
 await page.goto(process.env.SHOPPER_TEST_URL||'http://127.0.0.1:4173/shopper/',{waitUntil:'networkidle'});await page.locator('#budget-input').waitFor();await page.getByRole('button',{name:'Let’s make a good shop'}).click();
 const downloaded=await page.evaluate(async()=>{const {Catalog}=await import('./lib/catalog.js');const c=await new Catalog().init();await c.downloadAll();return {files:c.meta.files.length,parsedPartitionsRetained:c.parts.size};});
 assert.ok(downloaded.parsedPartitionsRetained<=12);await context.setOffline(true);
 const result=await page.evaluate(async sku=>{const {Catalog}=await import('./lib/catalog.js');const c=await new Catalog().init();const products=await c.lookup(sku);const timings=[];for(let i=0;i<10;i++){const t=performance.now();await c.lookup(sku);timings.push(performance.now()-t);}return {skus:products.map(p=>p.sku),averageMs:timings.reduce((a,b)=>a+b,0)/timings.length,maxMs:Math.max(...timings)};},other[0]);
 assert.ok(result.skus.includes(other[0]));assert.ok(result.maxMs<300);
 const report={status:'passed',compressedCatalogBytes:meta.files.reduce((n,f)=>n+f.bytes,0),...downloaded,offlineOtherDepartmentSku:other[0],cachedLookupAverageMs:Math.round(result.averageMs*100)/100,cachedLookupMaxMs:Math.round(result.maxMs*100)/100,measurement:'Desktop Chrome on this workstation, cached lookup only; not a physical-device camera benchmark.'};
 fs.mkdirSync(path.join(root,'qa/shopper'),{recursive:true});fs.writeFileSync(path.join(root,'qa/shopper/offline-report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report,null,2));
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
