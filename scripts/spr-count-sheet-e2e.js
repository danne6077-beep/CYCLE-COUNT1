const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');

// Use the same official pinned libraries as the app, cached locally for deterministic browser runs.
const xlsxFile = process.env.FUJI_SHEETJS_TEST_PATH || path.join(os.tmpdir(), 'fuji-sheetjs-0.20.3.js');
const barcodeFile = process.env.FUJI_JSBARCODE_TEST_PATH || path.join(os.tmpdir(), 'fuji-jsbarcode-3.11.6.js');
const XLSX = require(xlsxFile);
const root = path.resolve(__dirname, '..', 'dist');
const output = path.join(os.tmpdir(), 'fuji-spr-qa');
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json'};
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  fs.readFile(file, (error, body) => {if(error)res.writeHead(404).end(); else res.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream'}).end(body);});
});

(async () => {
  fs.mkdirSync(output, {recursive:true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, ...(process.platform==='win32' ? {executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'} : {})});
  const page = await browser.newPage({viewport:{width:1366, height:1000}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('https://cdn.sheetjs.com/**', route => route.fulfill({path:xlsxFile, contentType:'text/javascript'}));
    await page.route('https://cdn.jsdelivr.net/npm/jsbarcode@*/**', route => route.fulfill({path:barcodeFile, contentType:'text/javascript'}));
    await page.goto(`http://127.0.0.1:${server.address().port}/`, {waitUntil:'domcontentloaded'});
    await page.locator('#openDeviceWorkspace').click();
    await page.evaluate(() => loadItems([{supplier:'Original',sku:'SAVED',description:'Saved inventory'}]));
    await page.locator('#countSheetNav').click();
    await page.locator('#chooseSprCountSheetMode').click();
    assert.equal(await page.locator('#sprCountSheetMode').isVisible(), true);
    const data = [["SKU'S",'BARCODE','DESCRIPTION'], ...Array.from({length:16}, (_,i) => [i===15?'00000':String(i).padStart(5,'0'), '036000291452', i===0?'<img src=x onerror=alert(1)>':`SPR product ${i}`])];
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(data), 'SPR');
    await page.locator('#sprCountSheetFile').setInputFiles({name:'spr.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(XLSX.write(book,{bookType:'xlsx',type:'buffer'}))});
    await page.waitForFunction(() => document.querySelector('#sprCountSheetStatus').textContent.includes('Ready to print'));
    assert.equal(await page.locator('#sprCountSheetPages .spr-sheet').count(), 2);
    assert.equal(await page.locator('#sprCountSheetPages tbody tr').count(), 16);
    assert.equal(await page.locator('#sprCountSheetPages tbody tr').first().locator('td').nth(1).innerText(), '00000');
    assert.equal(await page.locator('#sprCountSheetPages img').count(), 0);
    assert.ok(await page.locator('#sprCountSheetPages svg rect').count() > 0);
    assert.deepEqual(await page.locator('#sprCountSheetPages thead').first().locator('th').allTextContents(), ['#','SKU','BARCODE','DESCRIPTION','COUNT']);
    assert.equal(await page.evaluate(() => items[0].sku), 'SAVED');
    const originalLayout = await page.evaluate(() => ({orientation:document.querySelector('#orientation').value,size:document.documentElement.style.getPropertyValue('--print-page-size')}));
    await page.screenshot({path:path.join(output,'spr-desktop.png'),fullPage:true});
    const pdf = await page.pdf({path:path.join(output,'spr-portrait.pdf'),preferCSSPageSize:true,printBackground:true});
    const source = pdf.toString('latin1');
    const mediaBoxes = [...source.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
    assert.equal(mediaBoxes.length, 2, 'Two PDF pages for 16 spreadsheet rows');
    mediaBoxes.forEach(match => {assert.equal(Number(match[1]),612);assert.equal(Number(match[2]),792);});
    assert.deepEqual(await page.evaluate(() => ({orientation:document.querySelector('#orientation').value,size:document.documentElement.style.getPropertyValue('--print-page-size')})), originalLayout);
    await page.locator('#sprCountSheetFile').setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from('WRONG,HEADER\nno,sku')});
    await page.waitForFunction(() => document.querySelector('#sprCountSheetStatus').textContent.includes('Could not load file'));
    assert.equal(await page.locator('#sprCountSheetPages tbody tr').count(),16);
    await page.setViewportSize({width:360,height:900});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No mobile page overflow');
    await page.screenshot({path:path.join(output,'spr-mobile.png'),fullPage:true});
    await page.setViewportSize({width:1366,height:1000});
    await page.locator('#changeCountSheetMode').click(); await page.locator('#chooseManualCountSheetMode').click();
    await page.locator('#manualCountSheetFileInput').setInputFiles({name:'manual.csv',mimeType:'text/csv',buffer:Buffer.from('SKU,BARCODE,DESCRIPTION\n12,036000291452,Standard manual product')});
    await page.waitForFunction(() => document.querySelector('#manualCountSheetFileName').textContent.includes('Loaded:'));
    await page.locator('#generateImportedCountSheetPreviewBtn').click();
    assert.equal(await page.locator('#manualCountSheetPages thead th').count(),10,'Existing manual layout retains locator columns');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({result:'passed',realExcelUpload:true,leadingZeros:true,rowsPreserved:16,noCcdOrLocators:true,realBarcodes:true,pdfPages:2,pdfSize:'612 × 792 pt (Letter portrait)',savedInventoryUnchanged:true,layoutSettingsUnchanged:true,invalidUploadPreservesPrevious:true,mobileOverflow:false,manualModeRegression:'passed',pageErrors:errors,artifacts:output},null,2));
  } finally {await browser.close();await new Promise(resolve => server.close(resolve));}
})().catch(error => {console.error(error);process.exitCode=1;});
