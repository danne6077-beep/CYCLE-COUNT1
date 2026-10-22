const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..','dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.md':'text/markdown; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((request,response)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname)}catch{response.writeHead(400).end('Bad request');return}
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');const file=path.resolve(root,relative);
  if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403).end('Forbidden');return}
  fs.readFile(file,(error,body)=>{if(error){response.writeHead(404).end('Not found');return}response.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream'}).end(body)});
});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.platform==='win32'&&fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
  const context=await browser.newContext({viewport:{width:1366,height:900}});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
    // Keep this browser flow deterministic and offline while exercising the real import/mapping handler.
    await page.route('https://cdn.sheetjs.com/**',route=>route.fulfill({contentType:'text/javascript',body:`window.XLSX={read(input){const text=new TextDecoder().decode(input);const rows=text.trim().split(/\\r?\\n/).map(line=>line.split(','));const sheet={'!ref':'A1:F3'};rows.forEach((row,r)=>row.forEach((value,c)=>sheet[String.fromCharCode(65+c)+(r+1)]={v:value,w:value}));return {SheetNames:['inventory'],Sheets:{inventory:sheet}}},utils:{decode_range(){return {s:{r:0,c:0},e:{r:2,c:5}}},encode_cell({r,c}){return String.fromCharCode(65+c)+(r+1)},format_cell(cell){return String(cell.v??'')}}};`}));
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
    await page.locator('#openDeviceWorkspace').click();await page.waitForFunction(()=>!document.querySelector('#appShell').hidden);
    await page.locator('#countSheetNav').click();
    await page.evaluate(()=>showStep(1));
    await page.locator('#fileInput').setInputFiles({name:'inventory.csv',mimeType:'text/csv',buffer:Buffer.from('SUPPLIER,LOCATOR,SKU,UPC,DESCRIPTION,ON HAND\nAcme,SA-A1,0012,036000291452,Milk,10\nAcme,SA-A2,0013,012345678905,Bread,0\n')});
    await page.locator('#importMappingDialog').waitFor({state:'visible',timeout:15000});
    assert.equal(await page.locator('#importMappingDialog [data-import-field="expectedQty"]').inputValue(),'ON HAND');
    await page.locator('#importMappingForm button[type="submit"]').click();
    await page.locator('#dataPanel').waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelector('#rowCount').textContent.startsWith('2 of 2'));
    await page.locator('#startPhysicalCount').waitFor({state:'visible'});
    assert.equal(await page.locator('#dataPanel').isVisible(),true);
    await page.locator('#startPhysicalCount').click();await page.locator('#countEntryPanel').waitFor({state:'visible'});
    const skuRow=page.locator('#countEntryRows tr').filter({hasText:'0012'});
    assert.equal(await skuRow.locator('[data-entry-field="expected"]').inputValue(),'10');
    const counted=skuRow.locator('[data-entry-field="counted"]');await counted.fill('12');await counted.dispatchEvent('change');
    await page.waitForFunction(()=>document.querySelector('#countEntryRows tr [data-status="recount"]'));
    assert.match(await skuRow.locator('.count-entry-variance').innerText(),/\+2/);
    await skuRow.locator('[data-entry-field="reason"]').selectOption('damaged');
    await skuRow.locator('[data-entry-field="note"]').fill('Broken packaging');await skuRow.locator('[data-entry-field="note"]').dispatchEvent('change');
    await skuRow.locator('[data-entry-decision="approved"]').click();
    await page.waitForFunction(()=>document.querySelector('#countEntryReviewSummary').textContent.includes('0 need review'));
    const id=await page.evaluate(()=>window.fujiGetActiveCountSession().id);
    const csvPromise=page.waitForEvent('download');await page.locator('#exportCountReport').click();const csv=await csvPromise;
    assert.match(csv.suggestedFilename(),/count-session-.*\.csv/);
    const breadRow=page.locator('#countEntryRows tr').filter({hasText:'0013'});await breadRow.locator('[data-entry-field="counted"]').fill('0');await breadRow.locator('[data-entry-field="counted"]').dispatchEvent('change');
    await page.locator('#completeCountSession').click();
    await page.waitForFunction(()=>document.querySelector('#completeCountSession').textContent==='Session completed');
    const saved=await page.evaluate(async id=>(await window.fujiCountStorage.readAll()).find(session=>session.id===id),id);
    assert.equal(saved.status,'completed-with-approvals');assert.ok(saved.entries[0].audit.length>=4);
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.querySelector('#appShell').hidden);await page.waitForFunction(id=>[...document.querySelector('#countSessionSelect').options].some(option=>option.value===id),id);
    await page.evaluate(id=>window.fujiOpenCountEntry(id),id);await page.locator('#countEntryPanel').waitFor({state:'visible'});
    assert.equal(await page.locator('#countEntryRows tr').filter({hasText:'0012'}).locator('[data-entry-field="counted"]').inputValue(),'12');
    for(const width of [360,768,1366])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:900});await page.evaluate(value=>{document.documentElement.dataset.theme=value;document.documentElement.style.colorScheme=value;localStorage.setItem('fuji-color-theme-v1',value)},theme);
      await page.waitForTimeout(30);
      const dimensions=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      assert.ok(dimensions.document<=width+1&&dimensions.body<=width+1,`${width}px ${theme} viewport overflow: ${JSON.stringify(dimensions)}`);
      fs.mkdirSync(path.join(__dirname,'..','qa','phase10','after'),{recursive:true});
      await page.screenshot({path:path.join(__dirname,'..','qa','phase10','after',`count-entry-${theme}-${width}.png`),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'passed',csvImportAndExpectedQuantityMapping:true,expectedAndCounted:true,varianceReview:true,auditTrail:true,csvExport:true,completion:true,reloadPersistence:true,responsiveScreenshots:6,pageErrors:errors},null,2));
  }finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
