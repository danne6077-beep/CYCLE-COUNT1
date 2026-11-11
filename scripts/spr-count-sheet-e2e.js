const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..','dist'),out=path.join(os.tmpdir(),'fuji-spr-layout-qa');
const XLSX=require('../spr-vendor/xlsx.full.min.js');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const relative=new URL(req.url,'http://local').pathname;const file=path.resolve(root,relative==='/'?'index.html':relative.replace(/^\//,''));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(error,body)=>{if(error)res.writeHead(404).end();else res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'}).end(body)})});
function book(count,type='xlsx') {const workbook=XLSX.utils.book_new();const data=[["SKU'S",'BARCODE','DESCRIPTION'],...Array.from({length:count},(_,i)=>[String(i).padStart(6,'0'),'036000291452',`Synthetic SPR product ${i}`])];XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(data),'FOR SPR');return Buffer.from(XLSX.write(workbook,{bookType:type,type:'buffer'}))}
(async()=>{fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('https://cdn.sheetjs.com/**',route=>route.abort());
 await page.route('https://cdn.jsdelivr.net/npm/jsbarcode@*/**',route=>route.abort());
 await page.goto(process.env.FUJI_SPR_TEST_URL||`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});await page.locator('#openDeviceWorkspace').click();await page.evaluate(()=>loadItems([{supplier:'Synthetic',sku:'SAVED',description:'Saved inventory'}]));await page.locator('#countSheetNav').click();await page.locator('#chooseSprCountSheetMode').click();
 assert.equal(await page.evaluate(()=>typeof window.XLSX),'undefined','CDN failure is reproduced');
 const csvDownload=page.waitForEvent('download');await page.locator('#downloadSprCsvTemplate').click();const csv=await csvDownload;await csv.saveAs(path.join(out,'template.csv'));assert.ok(fs.readFileSync(path.join(out,'template.csv'),'utf8').includes('"SKU","BARCODE","DESCRIPTION","CATEGORY","SUPPLIER"'));
 const excelDownload=page.waitForEvent('download');await page.locator('#downloadSprExcelTemplate').click();const excel=await excelDownload;await excel.saveAs(path.join(out,'template.xlsx'));const template=XLSX.read(fs.readFileSync(path.join(out,'template.xlsx')),{cellNF:true});assert.equal(template.Sheets['FOR SPR'].A2.t,'s');assert.equal(template.Sheets['FOR SPR'].A2.v,'000001');assert.equal(template.Sheets['FOR SPR'].A2.z,'@');
 const templateSheet = template.Sheets['FOR SPR'];
 assert.equal(templateSheet.B2.v, '036000291452');
 assert.equal(templateSheet.B2.z, '@');
 assert.equal(templateSheet.D1.v, 'CATEGORY');
 assert.equal(templateSheet.E1.v, 'SUPPLIER');
 async function upload(count,type='xlsx'){await page.locator('#sprCountSheetFile').setInputFiles({name:`synthetic.${type}`,mimeType:'application/octet-stream',buffer:book(count,type)});await page.waitForFunction(()=>!document.querySelector('#sprCountSheetMode').hasAttribute('aria-busy'));assert.match(await page.locator('#sprCountSheetStatus').innerText(),/Ready to print/);assert.equal(await page.locator('[data-spr-row]').count(),count);assert.equal(await page.locator('.spr-pages .scan-barcode').count(),count,'Every barcode renders without its CDN');assert.ok(await page.locator('.spr-pages .scan-barcode rect').count()>count,'Barcodes contain actual bars');assert.equal(await page.locator('.spr-pages .barcode-render-fallback').count(),0)}
 async function change(key,value){await page.locator(`[data-spr-setting="${key}"]`).selectOption(value)}
 const pagination=[];
 for(const count of [5,30,120]){await upload(count);const pages=await page.locator('.spr-sheet').count();console.log(count,'rows',pages,'pages',await page.locator('#sprCountSheetStatus').innerText());assert.equal(pages,Math.ceil(count/15));for(let i=0;i<pages;i++)assert.equal(await page.locator('.spr-sheet-footer').nth(i).locator('span').last().innerText(),`Page ${i+1} of ${pages}`);pagination.push({count,pages})}
 for(const type of ['xls','xlsm']){await upload(5,type);assert.equal(await page.locator('[data-spr-cell="sku"]').first().innerText(),'000000')}
 await page.locator('#sprCountSheetFile').setInputFiles(path.join(out,'template.csv'));await page.waitForFunction(()=>!document.querySelector('#sprCountSheetMode').hasAttribute('aria-busy'));assert.equal(await page.locator('[data-spr-row]').count(),2);
 await page.locator('#sprCountSheetFile').setInputFiles(path.join(out,'template.xlsx'));await page.waitForFunction(()=>!document.querySelector('#sprCountSheetMode').hasAttribute('aria-busy'));assert.equal(await page.locator('[data-spr-cell="sku"]').first().innerText(),'000001');
 const categoryFilter = page.locator('#sprCategoryFilter');
 const previewSkus = () => page.locator('[data-spr-cell="sku"]').allTextContents();
 await categoryFilter.selectOption({label:'Household'});
 assert.deepEqual(await previewSkus(), ['000002']);
 assert.match(await page.locator('.spr-header-fields').first().innerText(), /Category\s+Household/i);
 await categoryFilter.selectOption({label:'All categories'});
 assert.equal(await page.locator('[data-spr-row]').count(), 2);

 const categorizedRows = [
  ['SKU','BARCODE','DESCRIPTION','CATEGORY','CCD','SUPPLIER'],
  ['001','036000291452','Coffee','Grocery','1','Acme & Sons'],
  ['002','036000291452','Detergent','Household','2','Home Supply'],
  ['003','036000291452','Tea',' grocery ','1','Tea Co'],
  ['004','036000291452','Unsorted item','','3',''],
  ['005','036000291452','Dish soap','HOUSEHOLD','2','Home Supply']
 ];
 await page.locator('#sprCountSheetFile').setInputFiles({
  name:'categorized.csv', mimeType:'text/csv', buffer:Buffer.from(categorizedRows.map(row=>row.join(',')).join('\n'))
 });
 await page.waitForFunction(()=>!document.querySelector('#sprCountSheetMode').hasAttribute('aria-busy'));
 assert.deepEqual(await categoryFilter.locator('option').allTextContents(), ['All categories','Grocery','Household','Imported Items','Combine into single continuous sheet']);
 await categoryFilter.selectOption({label:'Grocery'});
 assert.deepEqual(await previewSkus(), ['001','003']);
 assert.match(await page.locator('.spr-header-fields').first().innerText(), /CCD No\.\s+1\s+Category\s+Grocery/i);
 assert.match(await page.locator('#sprCountSheetStatus').innerText(), /Grocery · 2 rows/);
 const rowsPerPage = page.locator('[data-spr-setting="perPage"]');
 await rowsPerPage.fill('1');
 const categoryPdf = await page.pdf({preferCSSPageSize:true, printBackground:true});
 assert.equal([...categoryPdf.toString('latin1').matchAll(/\/MediaBox\s*\[/g)].length, 2);
 await rowsPerPage.fill('15');
 await page.evaluate(()=>{
  window.print=()=>{window.sprPrintedSkus=[...document.querySelectorAll('[data-spr-cell="sku"]')].map(cell=>cell.textContent)};
 });
 for (const button of ['#printSprCountSheet','#exportSprCountSheet']) {
  await page.evaluate(()=>{window.sprPrintedSkus=null});
  await page.locator(button).click();
  await page.waitForFunction(()=>window.sprPrintedSkus!==null);
  assert.deepEqual(await page.evaluate(()=>window.sprPrintedSkus), ['001','003']);
  await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
 }
 await categoryFilter.selectOption({label:'Imported Items'});
 assert.deepEqual(await previewSkus(), ['004']);

 await categoryFilter.selectOption({label:'Combine into single continuous sheet'});
 const categoryList = page.locator('#sprCategorySelectionList');
 assert.equal(await page.locator('#printSprCountSheet').isEnabled(), false);
 assert.deepEqual(await previewSkus(), []);
 await categoryList.getByRole('button', {name:'Select All Categories'}).click();
 assert.equal(await previewSkus().then(skus=>skus.length), 5);
 await categoryList.getByRole('button', {name:'Clear All'}).click();
 assert.equal(await page.locator('#exportSprCountSheet').isEnabled(), false);
 await categoryList.getByRole('button', {name:'Grocery', exact:true}).click();
 await categoryList.getByRole('button', {name:'Household', exact:true}).click();
 const combinedSkus = ['001','003','002','005'];
 assert.deepEqual(await previewSkus(), combinedSkus);
 assert.equal(await page.locator('.spr-sheet').count(), 1, 'Selected categories share one sheet');
 const sprLabels = await page.locator('.spr-department-band').allTextContents();
 assert.equal(sprLabels.length, 3);
 assert.match(sprLabels[0], /Category: Grocery · Supplier: Acme & Sons/);
 assert.match(sprLabels[1], /Category: Grocery · Supplier: Tea Co/);
 assert.match(sprLabels[2], /Category: Household · Supplier: Home Supply/);
 await rowsPerPage.fill('3');
 const combinedPdf = await page.pdf({preferCSSPageSize:true, printBackground:true});
 assert.equal([...combinedPdf.toString('latin1').matchAll(/\/MediaBox\s*\[/g)].length, 2);
 assert.deepEqual(await page.locator('.spr-sheet').first().locator('[data-spr-cell="sku"]').allTextContents(), combinedSkus.slice(0, 3));
 await rowsPerPage.fill('15');
 for (const button of ['#printSprCountSheet','#exportSprCountSheet']) {
  await page.evaluate(()=>{window.sprPrintedSkus=null});
  await page.locator(button).click();
  await page.waitForFunction(()=>window.sprPrintedSkus!==null);
  assert.deepEqual(await page.evaluate(()=>window.sprPrintedSkus), combinedSkus);
  await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
 }
 await upload(30);
 assert.equal(await categoryFilter.inputValue(), '');
 assert.deepEqual(await categoryFilter.locator('option').allTextContents(), ['All categories','Imported Items']);
 assert.deepEqual(await page.locator('.spr-table thead').first().locator('th').allTextContents(),['SKU','Barcode','Description','Final Count']);
 assert.equal(await page.locator('.spr-table [data-spr-cell="count"]').first().innerText(),'');
 const originalLayout=await page.evaluate(()=>({paper:document.querySelector('#paperSize').value,orientation:document.querySelector('#orientation').value,page:document.documentElement.style.getPropertyValue('--print-page-size')}));
 const pdfChecks=[];
 for(const paper of ['a4','letter'])for(const orientation of ['portrait','landscape']){
  await change('paper',paper);await change('orientation',orientation);assert.equal(await page.locator('#printSprCountSheet').isEnabled(),true);const previewPages=await page.locator('.spr-sheet').count();
  const pdf=await page.pdf({path:path.join(out,`${paper}-${orientation}.pdf`),preferCSSPageSize:true,printBackground:true});const boxes=[...pdf.toString('latin1').matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];console.log(paper,orientation,'preview',previewPages,'pdf',boxes.length,boxes.map(x=>x.slice(1)));
  assert.equal(boxes.length,previewPages,'Each preview page fits one printed page');for(const box of boxes){const [w,h]=box.slice(1).map(Number);const expected=paper==='a4'?[595.28,841.89]:[612,792];if(orientation==='landscape')expected.reverse();assert.ok(Math.abs(w-expected[0])<1&&Math.abs(h-expected[1])<1)}pdfChecks.push({paper,orientation,pages:boxes.length});
 }
 await page.locator('#sprPresetName').fill('My SPR');await page.locator('#sprSavePreset').click();await page.locator('#sprResetLayout').click();assert.equal(await page.locator('[data-spr-setting="paper"]').inputValue(),'a4');await page.locator('#sprSavedPreset').selectOption('0');await page.locator('#sprLoadPreset').click();assert.equal(await page.locator('[data-spr-setting="paper"]').inputValue(),'letter');
 await page.locator('#sprResetLayout').click();for(const column of ['sku','barcode','description'])await page.locator(`[data-spr-column="${column}"]`).uncheck();await page.locator('[data-spr-column="count"]').click();assert.ok(await page.locator('[data-spr-column="count"]').isChecked());
 await page.locator('#sprResetLayout').click();await change('density','roomy');await change('font','large');await change('barcode','large');await change('margins','wide');await change('paper','legal');for(const key of ['fields','bands','footer'])await page.locator(`[data-spr-setting="${key}"]`).uncheck();assert.equal(await page.locator('.spr-header-fields,.spr-department-band,.spr-sheet-footer').count(),0);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#countSheetNav').click();await page.locator('#chooseSprCountSheetMode').click();assert.equal(await page.locator('[data-spr-setting="paper"]').inputValue(),'legal');assert.equal(await page.locator('[data-spr-setting="density"]').inputValue(),'roomy');
 await page.locator('#sprSavedPreset').selectOption('0');await page.locator('#sprDeletePreset').click();await page.locator('#confirmAccept').click();assert.equal(await page.locator('#sprSavedPreset option').count(),1);
 await page.locator('#sprResetLayout').click();await upload(5);await page.locator('#sprCountSheetFile').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('WRONG,HEADINGS\nno,sku')});await page.waitForFunction(()=>document.querySelector('#sprCountSheetStatus').textContent.includes('Could not load file'));assert.equal(await page.locator('[data-spr-row]').count(),5);assert.equal(await page.locator('#printSprCountSheet').isEnabled(),true);
 await page.evaluate(()=>{window.print=()=>{window.sprPrintCalls=(window.sprPrintCalls||0)+1}});
 for(const id of ['printSprCountSheet','exportSprCountSheet']){const before=await page.evaluate(()=>window.sprPrintCalls||0);await page.locator(`#${id}`).click();await page.waitForFunction(value=>window.sprPrintCalls===value,before+1);assert.equal(await page.evaluate(()=>document.body.classList.contains('print-spr-count-sheet')),true);await page.evaluate(()=>dispatchEvent(new Event('afterprint')))}
 const printed=[];for(const theme of ['light','dark']){await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;window.prepareSprCountSheetPrint()},theme);await page.emulateMedia({media:'print'});printed.push(await page.locator('.spr-sheet').first().screenshot());await page.evaluate(()=>dispatchEvent(new Event('afterprint')));await page.emulateMedia({media:'screen'})}assert.ok(printed[0].equals(printed[1]),'Printed SPR sheet is identical in both themes');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Phone has no page overflow');await page.screenshot({path:path.join(out,'phone.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 assert.deepEqual(await page.evaluate(()=>({paper:document.querySelector('#paperSize').value,orientation:document.querySelector('#orientation').value,page:document.documentElement.style.getPropertyValue('--print-page-size')})),originalLayout);assert.equal(await page.evaluate(()=>items[0].sku),'SAVED');
 await page.locator('#changeCountSheetMode').click();await page.locator('#chooseManualCountSheetMode').click();await page.locator('#manualCountSheetFileInput').setInputFiles({name:'manual.csv',mimeType:'text/csv',buffer:Buffer.from('SKU,BARCODE,DESCRIPTION\n12,036000291452,Synthetic manual product')});await page.waitForFunction(()=>document.querySelector('#manualCountSheetFileName').textContent.includes('Loaded:'));await page.locator('#generateImportedCountSheetPreviewBtn').click();assert.equal(await page.locator('#manualCountSheetPages thead th').count(),10);
 await page.evaluate(items=>loadItems(items), categorizedRows.slice(1).map(([sku,barcode,description,category,ccdNo,supplier])=>({
  sku, barcode, description, category:category.trim().toLowerCase()==='grocery'?'Grocery':category.trim()?'Household':'Other', ccdNo, supplier
 })));
 await page.locator('#countSheetNav').click();
 await page.locator('#chooseStandardCountSheetMode').click();
 const standardCategories = page.locator('#supplierSelectionList');
 await standardCategories.getByRole('button', {name:'Select category Grocery', exact:true}).click();
 await standardCategories.getByRole('button', {name:'Select category Household', exact:true}).click();
 await page.locator('#countSheetGroupMode').selectOption('category-combined');
 await page.locator('#generateCountSheetPreview').click();
 await page.waitForFunction(()=>document.querySelector('#countSheetPages')?.textContent.includes('SUPPLIER: Tea Co'));
 const standardLabels = await page.locator('#countSheetPages .department-group-row').allTextContents();
 assert.ok(standardLabels.some(label=>label.includes('CATEGORY: Grocery · SUPPLIER: Acme & Sons')));
 assert.ok(standardLabels.some(label=>label.includes('CATEGORY: Grocery · SUPPLIER: Tea Co')));
 assert.ok(standardLabels.some(label=>label.includes('CATEGORY: Household · SUPPLIER: Home Supply')));
 assert.doesNotMatch(await page.locator('#countSheetPages').textContent(), /Unsorted item/);

 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,cdnFailureRecovered:true,excelFormats:['xlsx','xls','xlsm'],templates:['xlsx','csv'],categoryPrinting:true,pagination,pdfChecks,presets:true,persistence:true,mobile:true,otherModeUnchanged:true,output:out},null,2));
}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
