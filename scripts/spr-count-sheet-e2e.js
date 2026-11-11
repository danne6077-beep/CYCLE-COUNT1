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
 const groupSheets = page.locator('#sprGroupSheets');
 const categoryList = page.locator('#sprCategorySelectionList');
 const resetPrinted = categoryList.getByRole('button', {name:'Reset Printed'});
 const generate = page.locator('#sprGeneratePreview');
 const chooseCategory = name => categoryList.getByRole('button', {name:`Select category ${name}`, exact:true}).click();
 const previewSkus = () => page.locator('[data-spr-cell="sku"]').allTextContents();
 const selectAllAndGenerate = async () => {
  await categoryList.getByRole('button', {name:'Select All Categories'}).click();
  await generate.click();
 };

 const largeRows = ['SKU,BARCODE,DESCRIPTION,CATEGORY','TARGET1,036000291452,Target one,ACCESSORIES','TARGET2,036000291452,Target two,ALCOHOLIC BEVERAGES'];
 for(let i=0;i<8286;i++)largeRows.push(`OTHER${i},036000291452,Other item,OTHER`);
 await page.locator('#sprCountSheetFile').setInputFiles({name:'large-categories.csv',mimeType:'text/csv',buffer:Buffer.from(largeRows.join('\n'))});
 await page.waitForFunction(()=>!document.querySelector('#sprCountSheetMode').hasAttribute('aria-busy'));
 assert.match(await page.locator('#sprCountSheetStatus').innerText(), /8,288 rows loaded/);
 assert.equal(await groupSheets.inputValue(), 'separate');
 assert.equal(await generate.isEnabled(), true);
 await generate.click();
 assert.match(await page.locator('#sprCountSheetStatus').innerText(), /Select at least one category/);
 assert.equal(await categoryList.locator('[aria-pressed="true"]').count(), 0);
 assert.deepEqual(await previewSkus(), []);
 await chooseCategory('ACCESSORIES');
 const beverages = categoryList.getByRole('button', {name:'Select category ALCOHOLIC BEVERAGES'});
 await beverages.press('Enter');
 assert.equal(await categoryList.locator('[aria-pressed="true"]').count(), 2);
 assert.deepEqual(await previewSkus(), []);
 await generate.click();
 assert.deepEqual(await previewSkus(), ['TARGET1','TARGET2']);
 assert.equal(await page.locator('.spr-sheet').count(), 2);
 await page.locator('#sprCountSheetMode .print-toolbar').screenshot({path:path.join(out,'category-selection-toolbar.png')});

 async function upload(count,type='xlsx'){await page.locator('#sprCountSheetFile').setInputFiles({name:`synthetic.${type}`,mimeType:'application/octet-stream',buffer:book(count,type)});await page.waitForFunction(()=>!document.querySelector('#sprCountSheetMode').hasAttribute('aria-busy'));await selectAllAndGenerate();assert.match(await page.locator('#sprCountSheetStatus').innerText(),/Ready to print/);assert.equal(await page.locator('[data-spr-row]').count(),count);assert.equal(await page.locator('.spr-pages .scan-barcode').count(),count,'Every barcode renders without its CDN');assert.ok(await page.locator('.spr-pages .scan-barcode rect').count()>count,'Barcodes contain actual bars');assert.equal(await page.locator('.spr-pages .barcode-render-fallback').count(),0)}
 async function change(key,value){await page.locator(`[data-spr-setting="${key}"]`).selectOption(value)}
 const pagination=[];
 for(const count of [5,30,120]){await upload(count);const pages=await page.locator('.spr-sheet').count();console.log(count,'rows',pages,'pages',await page.locator('#sprCountSheetStatus').innerText());assert.equal(pages,Math.ceil(count/15));for(let i=0;i<pages;i++)assert.equal(await page.locator('.spr-sheet-footer').nth(i).locator('span').last().innerText(),`Page ${i+1} of ${pages}`);pagination.push({count,pages})}
 for(const type of ['xls','xlsm']){await upload(5,type);assert.equal(await page.locator('[data-spr-cell="sku"]').first().innerText(),'000000')}
 await page.locator('#sprCountSheetFile').setInputFiles(path.join(out,'template.csv'));await page.waitForFunction(()=>!document.querySelector('#sprCountSheetMode').hasAttribute('aria-busy'));await selectAllAndGenerate();assert.equal(await page.locator('[data-spr-row]').count(),2);
 await page.locator('#sprCountSheetFile').setInputFiles(path.join(out,'template.xlsx'));await page.waitForFunction(()=>!document.querySelector('#sprCountSheetMode').hasAttribute('aria-busy'));
 assert.deepEqual(await groupSheets.locator('option').allTextContents(), ['One category per sheet','Combine into single continuous sheet']);
 await chooseCategory('Household');
 await generate.click();
 assert.deepEqual(await previewSkus(), ['000002']);
 assert.match(await page.locator('.spr-header-fields').first().innerText(), /Category\s+Household/i);

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
 assert.equal(await categoryList.locator('[data-category][aria-pressed="false"]').count(), 3);
 await chooseCategory('Grocery');
 assert.equal(await page.locator('#printSprCountSheet').isDisabled(), true);
 await generate.click();
 assert.deepEqual(await previewSkus(), ['001','003']);
 const sprSheet = page.locator('.spr-sheet').first();
 assert.match(await sprSheet.locator('h3').innerText(), /^SPR \(Special Count Request\)$/i);
 assert.match(await sprSheet.locator('.spr-header-fields').innerText(), /Store\s+14014\s+Branch\s+Cauayan\s+Category\s+Grocery\s+Count date\s+\d{4}-\d{2}-\d{2}\s+Prepared by\s+Danne Lozana/i);
 assert.equal(await sprSheet.locator('.spr-sheet-footer span').first().innerText(), '14014 · Cauayan');
 assert.doesNotMatch(await sprSheet.innerText(), /CCD No\./i);
 const sprDate = page.locator('#sprCountDate');
 const inventoryDate = await page.locator('#dateField').inputValue();
 assert.equal(await sprDate.inputValue(), inventoryDate);
 await sprDate.fill('2026-12-03');
 assert.match(await sprSheet.locator('.spr-header-fields').innerText(), /Count date\s+2026-12-03/i);
 assert.match(await page.locator('#sprCountSheetStatus').innerText(), /Grocery · 2 rows/);
 const rowsPerPage = page.locator('[data-spr-setting="perPage"]');
 await rowsPerPage.fill('1');
 const categoryPdf = await page.pdf({preferCSSPageSize:true, printBackground:true});
 assert.equal([...categoryPdf.toString('latin1').matchAll(/\/MediaBox\s*\[/g)].length, 2);
 await rowsPerPage.fill('15');
 await page.evaluate(()=>{
  window.print=()=>{window.sprPrintedSkus=[...document.querySelectorAll('[data-spr-cell="sku"]')].map(cell=>cell.textContent)};
 });
 async function verifyPrint(button, expectedSkus) {
  await page.evaluate(()=>{window.sprPrintedSkus=null});
  await page.locator(button).click();
  await page.waitForFunction(()=>window.sprPrintedSkus!==null);
  assert.deepEqual(await page.evaluate(()=>window.sprPrintedSkus), expectedSkus);
  await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
 }
 await verifyPrint('#printSprCountSheet', ['001','003']);
 const printedGrocery = categoryList.getByRole('button', {name:/Grocery printed/i});
 assert.equal(await printedGrocery.isEnabled(), false);
 assert.equal(await categoryList.getByRole('button', {name:'Select category Household', exact:true}).isEnabled(), true);
 await resetPrinted.click();
 assert.equal(await categoryList.getByRole('button', {name:'Select category Grocery', exact:true}).isEnabled(), true);
 await chooseCategory('Grocery');
 await generate.click();
 await verifyPrint('#exportSprCountSheet', ['001','003']);
 assert.equal(await printedGrocery.isEnabled(), false);
 await resetPrinted.click();
 await chooseCategory('Imported Items');
 await generate.click();
 assert.deepEqual(await previewSkus(), ['004']);

 await groupSheets.selectOption({label:'Combine into single continuous sheet'});
 await categoryList.getByRole('button', {name:'Clear All'}).click();
 assert.equal(await page.locator('#printSprCountSheet').isEnabled(), false);
 assert.deepEqual(await previewSkus(), []);
 await selectAllAndGenerate();
 assert.equal(await previewSkus().then(skus=>skus.length), 5);
 await categoryList.getByRole('button', {name:'Clear All'}).click();
 assert.equal(await page.locator('#exportSprCountSheet').isEnabled(), false);
 await chooseCategory('Household');
 await chooseCategory('Grocery');
 await generate.click();
 const printOrder = page.locator('#sprCategoryOrderList .spr-category-order-row > span');
 const combinedSkus = ['002','005','001','003'];
 assert.deepEqual(await printOrder.allTextContents(), ['Household','Grocery']);
 assert.deepEqual(await previewSkus(), combinedSkus);
 assert.equal(await page.getByRole('button', {name:'Move Household up'}).isEnabled(), false);
 await page.getByRole('button', {name:'Move Grocery up'}).click();
 await generate.click();
 assert.deepEqual(await printOrder.allTextContents(), ['Grocery','Household']);
 assert.deepEqual(await previewSkus(), ['001','003','002','005']);
 await page.getByRole('button', {name:'Move Grocery down'}).click();
 await generate.click();
 assert.deepEqual(await previewSkus(), combinedSkus);
 assert.equal(await page.locator('.spr-sheet').count(), 1, 'Selected categories share one sheet');
 const sprLabels = await page.locator('.spr-department-band').allTextContents();
 assert.equal(sprLabels.length, 3);
 assert.match(sprLabels[0], /Category: Household · Supplier: Home Supply/);
 assert.match(sprLabels[1], /Category: Grocery · Supplier: Acme & Sons/);
 assert.match(sprLabels[2], /Category: Grocery · Supplier: Tea Co/);
 await rowsPerPage.fill('3');
 const combinedPdf = await page.pdf({preferCSSPageSize:true, printBackground:true});
 assert.equal([...combinedPdf.toString('latin1').matchAll(/\/MediaBox\s*\[/g)].length, 2);
 assert.deepEqual(await page.locator('.spr-sheet').first().locator('[data-spr-cell="sku"]').allTextContents(), combinedSkus.slice(0, 3));
 await rowsPerPage.fill('15');
 await verifyPrint('#printSprCountSheet', combinedSkus);
 assert.equal(await categoryList.locator('.is-printed').count(), 2);
 await categoryList.screenshot({path:path.join(out,'printed-category-tiles.png')});
 assert.equal(await categoryList.getByRole('button', {name:'Select category Imported Items', exact:true}).isEnabled(), true);
 await resetPrinted.click();
 await chooseCategory('Household');
 await chooseCategory('Grocery');
 await groupSheets.selectOption({label:'One category per sheet'});
 await generate.click();
 assert.deepEqual(await printOrder.allTextContents(), ['Household','Grocery']);
 assert.equal(await page.locator('.spr-sheet').count(), 2);
 const separateSheets = page.locator('.spr-sheet');
 assert.match(await separateSheets.nth(0).locator('.spr-header-fields').innerText(), /Category\s+Household/i);
 assert.match(await separateSheets.nth(1).locator('.spr-header-fields').innerText(), /Category\s+Grocery/i);
 for (const sheet of await separateSheets.all()) {
  assert.match(await sheet.innerText(), /Count date\s+2026-12-03/i);
  assert.doesNotMatch(await sheet.innerText(), /CCD No\./i);
 }
 assert.deepEqual(await separateSheets.nth(0).locator('[data-spr-cell="sku"]').allTextContents(), ['002','005']);
 assert.deepEqual(await separateSheets.nth(1).locator('[data-spr-cell="sku"]').allTextContents(), ['001','003']);
 assert.equal(await separateSheets.nth(1).locator('.spr-sheet-footer span').last().innerText(), 'Page 2 of 2');
 const separatePdf = await page.pdf({preferCSSPageSize:true, printBackground:true});
 assert.equal([...separatePdf.toString('latin1').matchAll(/\/MediaBox\s*\[/g)].length, 2);
 await verifyPrint('#exportSprCountSheet', combinedSkus);
 assert.equal(await categoryList.locator('.is-printed').count(), 2);
 await resetPrinted.click();
 await chooseCategory('Household');
 await chooseCategory('Grocery');
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), 'Print order fits on a phone');
 await page.setViewportSize({width:1440,height:1000});
 await groupSheets.selectOption({label:'Combine into single continuous sheet'});
 await generate.click();
 assert.equal(await page.locator('.spr-sheet').count(), 1);
 assert.deepEqual(await previewSkus(), combinedSkus);
 await upload(30);
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
 for(const id of ['printSprCountSheet','exportSprCountSheet']){const before=await page.evaluate(()=>window.sprPrintCalls||0);await page.locator(`#${id}`).click();await page.waitForFunction(value=>window.sprPrintCalls===value,before+1);assert.equal(await page.evaluate(()=>document.body.classList.contains('print-spr-count-sheet')),true);await page.evaluate(()=>dispatchEvent(new Event('afterprint')));await resetPrinted.click();await selectAllAndGenerate()}
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
 const standardDate = page.locator('#standardCountDate');
 assert.equal(await standardDate.inputValue(), inventoryDate);
 await standardDate.fill('2026-12-11');
 await page.waitForFunction(()=>document.querySelector('#countSheetPages .reference-sheet-header').textContent.includes('DATE: 2026-12-11'));
 assert.equal(await page.locator('#dateField').inputValue(), inventoryDate);
 await page.evaluate(()=>{
  window.print=()=>{window.standardPrintedHeader=document.querySelector('#countSheetPages .reference-sheet-header').textContent};
 });
 await page.locator('#printSheetBtn').click();
 await page.waitForFunction(()=>Boolean(window.standardPrintedHeader));
 assert.match(await page.evaluate(()=>window.standardPrintedHeader), /DATE: 2026-12-11/);
 await page.evaluate(()=>dispatchEvent(new Event('afterprint')));

 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,cdnFailureRecovered:true,excelFormats:['xlsx','xls','xlsm'],templates:['xlsx','csv'],standardCategorySelection:true,categoryPrinting:true,categoryOrder:true,separateCategorySheets:true,printedCategoryStatus:true,pagination,pdfChecks,presets:true,persistence:true,mobile:true,otherModeUnchanged:true,output:out},null,2));
}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
