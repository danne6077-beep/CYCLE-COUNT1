const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');
const XLSX = require('../spr-vendor/xlsx.full.min.js');
const {addDays} = require('../cigar-monitor-data.js');

const root = path.resolve(__dirname,'..','dist');
const storageKey = 'fuji-cigarette-monitor-v1';
const today = '2026-11-11';
const yesterday = addDays(today,-1);
const products = Array.from({length:12},(_,index) => ({
  sku:String(index+1).padStart(5,'0'), description:'Synthetic product '+(index+1), upc:String(12345678900+index)
}));
const seed = {
  products,
  records:Array.from({length:32},(_,index) => index === 6 || index === 24 ? null : {
    date:addDays(today,index-32), transaction:String(1320+index), cs1:String(640+index),
    cs2:String(590+index), bag:String(281+index), fmcg:String(377+index),
    items:products.map((product,skuIndex) => ({
      sku:product.sku, beginning:20+skuIndex, withdrawal:1, sales:11+skuIndex+index%5,
      jdaSales:11+skuIndex+index%5+(skuIndex === 0 ? index%3-1 : 0),
      ending:index === 31 && skuIndex === 1 ? -2 : index === 31 && skuIndex === 2 ? 0 : 10-index%5
    }))
  }).filter(Boolean)
};
assert.equal(seed.records.length,30);
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const server = http.createServer((request,response) => {
  const route = new URL(request.url,'http://localhost').pathname;
  const file = path.resolve(root,route === '/' ? 'index.html' : route.slice(1));
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  fs.readFile(file,(error,body) => {
    if(error){response.writeHead(404).end();return;}
    response.writeHead(200,{'Content-Type':mime[path.extname(file)] ?? 'application/octet-stream'}).end(body);
  });
});

async function run(){
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser = await chromium.launch({headless:true, ...(process.platform === 'win32' ? {channel:'chrome'} : {})});
    const context = await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Taipei',serviceWorkers:'block'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-11T04:00:00Z'));
    await page.route('https://cdn.sheetjs.com/**',route => route.fulfill({path:path.resolve(__dirname,'../spr-vendor/xlsx.full.min.js'),contentType:'text/javascript'}));
    const url = process.env.FUJI_CIGAR_TEST_URL ?? 'http://127.0.0.1:'+server.address().port+'/';
    const field = (sku,name) => page.locator('#cigarDailyRows input[data-sku="'+sku+'"][data-field="'+name+'"]');
    const sku1 = products[0].sku;
    const sku2 = products[1].sku;
    const row = field(sku1,'beginning').locator('xpath=ancestor::tr');
    const daily = page.getByRole('tab',{name:'Daily Monitoring'});
    const trends = page.getByRole('tab',{name:'Trends'});
    const history = page.locator('#cigarHistoryRows');
    const confirm = () => page.locator('#confirmAccept').click();
    const cancel = () => page.locator('#confirmCancel').click();
    const openMonitor = async () => {
      const device = page.locator('#openDeviceWorkspace');
      if(await device.isVisible()) await device.click();
      const cookies = page.locator('#cookieEssential');
      if(await cookies.isVisible()) await cookies.click();
      await page.locator('#cigarsNav').click();
    };

    await page.goto(url,{waitUntil:'domcontentloaded'});
    await openMonitor();
    await trends.click();
    assert.equal(await page.locator('#cigarTrendsEmpty').isVisible(),true);
    await page.evaluate(({key,seed}) => localStorage.setItem(key,JSON.stringify(seed)),{key:storageKey,seed});
    await page.reload({waitUntil:'domcontentloaded'});
    await openMonitor();

    const previous = seed.records.at(-1);
    assert.equal(await field(sku1,'beginning').inputValue(),String(previous.items[0].ending));
    assert.equal(await field(sku2,'beginning').inputValue(),'-2');
    assert.equal(await page.locator('#cigarEnteredCount').innerText(),'0');
    await field(sku1,'beginning').fill('5');
    await field(sku1,'beginning').press('Enter');
    assert.equal(await field(sku2,'beginning').evaluate(input => input === document.activeElement),true);
    await field(sku2,'beginning').press('Shift+Tab');
    assert.equal(await field(sku1,'beginning').evaluate(input => input === document.activeElement),true);
    await field(sku1,'withdrawal').fill('1');
    await field(sku1,'sales').fill('10');
    await field(sku1,'sales').press('Tab');
    assert.equal(await field(sku2,'sales').evaluate(input => input === document.activeElement),true);
    await field(sku1,'jdaSales').fill('7');
    await page.locator('#cigarTransaction').fill('1,401');
    await page.locator('#cigarCs1').fill('721');
    assert.deepEqual(await row.locator('.cigar-figure-alert').allTextContents(),['+3','-4']);
    assert.equal(await page.locator('#cigarTotalSales').innerText(),'10');
    assert.equal(await page.locator('#cigarTotalJda').innerText(),'7');
    assert.equal(await page.locator('#cigarTotalVariance').innerText(),'+3');
    assert.equal(await page.locator('#cigarEnteredCount').innerText(),'1');
    await page.locator('#cigarEnteredOnly').check();
    assert.equal(await page.locator('#cigarDailyRows tr').count(),1);
    await page.locator('#cigarEnteredOnly').uncheck();
    await page.reload({waitUntil:'domcontentloaded'});
    await openMonitor();
    assert.equal(await field(sku1,'sales').inputValue(),'10');
    assert.match(await page.locator('#cigarDailyStatus').innerText(),/draft restored/i);
    await page.locator('#cigarStartOver').click();
    await cancel();
    assert.equal(await field(sku1,'sales').inputValue(),'10');
    await page.locator('#cigarStartOver').click();
    await confirm();
    assert.equal(await field(sku1,'sales').inputValue(),'');
    assert.equal(await field(sku1,'beginning').inputValue(),String(previous.items[0].ending));

    await field(sku1,'beginning').fill('5');
    await field(sku1,'withdrawal').fill('1');
    await field(sku1,'sales').fill('10');
    await field(sku1,'jdaSales').fill('7');
    await page.locator('#cigarTransaction').fill('1,401');
    await page.locator('#cigarCs1').fill('721');
    await page.locator('#cigarSaveDay').click();
    assert.equal(await page.locator('#cigarDailySummary').isVisible(),true);
    await page.locator('#cigarEditDay').click();
    await field(sku1,'sales').fill('12');
    await page.locator('#cigarSaveDay').click();
    await cancel();
    assert.equal(await page.locator('#cigarDailyForm').isVisible(),true);
    await page.locator('#cigarSaveDay').click();
    await confirm();
    assert.equal(await page.locator('#cigarDailySummary').isVisible(),true);

    await trends.click();
    await page.getByRole('button',{name:'30 days',exact:true}).click();
    const chartIds = ['cigarSalesChart','cigarVarianceChart','cigarEndingChart','cigarTopChart','cigarCountsChart'];
    await page.waitForFunction(ids => ids.every(id => window.Chart?.getChart(id)?.width > 0),chartIds);
    const chartFigures = await page.evaluate(() => {
      const sales = Chart.getChart('cigarSalesChart').data.datasets;
      const counts = Chart.getChart('cigarCountsChart').data.datasets;
      return {
        latestSales:sales[0].data.at(-1).y, average:sales[1].data.at(-1).y,
        includesGap:sales[0].data.some(point => point.y === null),
        latestTrans:counts[0].data.at(-1).y, top:Chart.getChart('cigarTopChart').data.labels.length,
        variance:Chart.getChart('cigarVarianceChart').data.datasets[0].data.at(-1).y
      };
    });
    const expectedAverage = (12+seed.records.filter(record => record.date >= addDays(today,-6))
      .reduce((sum,record) => sum+record.items.reduce((subtotal,item) => subtotal+item.sales,0),0))/7;
    assert.deepEqual(chartFigures,{latestSales:12,average:expectedAverage,includesGap:true,latestTrans:1401,top:10,variance:5});
    await page.locator('#cigarTrendSkuSearch').fill('Synthetic product 2');
    assert.equal(await page.locator('#cigarTrendSku').inputValue(),sku2);
    assert.equal(await page.evaluate(() => Chart.getChart('cigarEndingChart').data.datasets[0].data.at(-1).y),-2);
    assert.ok(await page.locator('#cigarLoggedDays button[data-state="missing"]').count() > 0);
    await page.locator('#cigarTrendSkuSearch').clear();

    const screenshots = fs.mkdtempSync(path.join(os.tmpdir(),'fuji-cigarette-qa-'));
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({path:path.join(screenshots,'trends-light.png'),fullPage:true});
    const lightColor = await page.evaluate(() => Chart.getChart('cigarSalesChart').options.scales.y.ticks.color);
    await page.evaluate(() => {document.documentElement.dataset.theme = 'dark';});
    await page.waitForFunction(light => Chart.getChart('cigarSalesChart')?.options.scales.y.ticks.color !== light,lightColor);
    await page.screenshot({path:path.join(screenshots,'trends-dark.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(() => Chart.getChart('cigarSalesChart')?.width < 390);
    await page.screenshot({path:path.join(screenshots,'trends-phone.png'),fullPage:true});
    const overflow = await page.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      outside:[...document.querySelectorAll('#cigarsPanel *')].filter(node => node.getBoundingClientRect().right > innerWidth+1 && !node.closest('.cigars-table-wrap')).slice(0,8).map(node => [node.id || node.className,node.getBoundingClientRect().right])}));
    assert.ok(overflow.scrollWidth <= overflow.width+1,JSON.stringify(overflow)+' '+screenshots);
    await page.setViewportSize({width:1440,height:1000});

    await page.getByRole('button',{name:'Custom range',exact:true}).click();
    await page.locator('#cigarTrendFrom').fill(yesterday);
    await page.locator('#cigarTrendTo').fill(yesterday);
    assert.equal(await history.locator('tr').count(),1);
    await history.locator('tr').first().getByRole('button',{name:/^Tue,/}).click();
    assert.equal(await page.locator('#cigarDailySummary').isVisible(),true);
    assert.ok((await page.locator('#cigarSummaryRows').innerText()).includes('-2'));
    await trends.click();
    await history.getByRole('button',{name:'Edit '+yesterday,exact:true}).click();
    assert.equal(await page.locator('#cigarLogDate').inputValue(),yesterday);
    await field(sku1,'sales').fill('61');
    await page.reload({waitUntil:'domcontentloaded'});
    await openMonitor();
    assert.equal(await page.locator('#cigarLogDate').inputValue(),yesterday);
    assert.equal(await field(sku1,'sales').inputValue(),'61');

    await daily.click();
    await page.locator('#cigarExportCsv').click();
    await page.locator('#cigarCsvFrom').fill(today);
    await page.locator('#cigarCsvTo').fill(today);
    const csvDownload = page.waitForEvent('download');
    await page.locator('#cigarCsvDownload').click();
    const csv = fs.readFileSync(await (await csvDownload).path(),'utf8');
    assert.ok(csv.includes(today+','));
    assert.ok(!csv.includes(yesterday+','));
    assert.ok(csv.includes('00001'));
    await trends.click();
    const backupDownload = page.waitForEvent('download');
    await page.locator('#cigarBackup').click();
    const backup = fs.readFileSync(await (await backupDownload).path());
    const snapshot = JSON.parse(backup);
    assert.equal(snapshot.records.length,31);
    assert.equal(snapshot.drafts[yesterday].items[sku1].sales,'61');
    await history.getByRole('button',{name:'Delete '+yesterday,exact:true}).click();
    await cancel();
    assert.equal(await history.getByRole('button',{name:'Delete '+yesterday,exact:true}).count(),1);
    await history.getByRole('button',{name:'Delete '+yesterday,exact:true}).click();
    await confirm();
    assert.equal(await history.getByRole('button',{name:'Delete '+yesterday,exact:true}).count(),0);
    await page.locator('#cigarRestoreFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"records":[]}')});
    await page.waitForFunction(() => document.querySelector('#cigarRestorePreview').textContent.includes('Choose a Cigarette Monitor'));
    assert.equal(await page.locator('#cigarRestoreConfirm').isDisabled(),true);
    await page.locator('#cigarRestoreCancel').click();
    await page.locator('#cigarRestoreFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:backup});
    await page.waitForFunction(() => !document.querySelector('#cigarRestoreConfirm').disabled);
    assert.match(await page.locator('#cigarRestorePreview').innerText(),/31 saved days · 1 draft/);
    assert.equal(await history.getByRole('button',{name:'Delete '+yesterday,exact:true}).count(),0);
    await page.locator('#cigarRestoreConfirm').click();
    assert.equal(await history.getByRole('button',{name:'Delete '+yesterday,exact:true}).count(),1);

    await daily.click();
    const workbook = XLSX.utils.book_new();
    const sheetRows = Array.from({length:8},() => []);
    sheetRows[1][5] = '2026-10-01';
    sheetRows[6] = ['SKU','DESCRIPTION','UPC','TOTAL','EXPIRY','BEG','W','SALES','JDA_S','ENDING'];
    sheetRows[7] = [sku1,'Synthetic imported item','000012340000',10,'',5,2,3,3,4];
    XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(sheetRows),'SELLING');
    await page.locator('#cigarSellingFile').setInputFiles({name:'synthetic.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from(XLSX.write(workbook,{bookType:'xlsx',type:'buffer'}))});
    await page.waitForFunction(() => document.querySelector('#cigarImportStatus').textContent.includes('Imported 1 products and 1 dated entries'));
    const imported = await page.evaluate(key => JSON.parse(localStorage.getItem(key)),storageKey);
    assert.equal(imported.records.length,32);
    assert.equal(imported.records[0].items[0].ending,4);
    assert.equal(imported.products[0].upc,'000012340000');
    assert.equal(imported.drafts[yesterday].items[sku1].sales,'61');
    await page.getByRole('tab',{name:'Expiry Lookup'}).click();
    assert.equal(await page.locator('#cigarExpiryForm').isVisible(),true);
    await page.evaluate(key => localStorage.removeItem(key),storageKey);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log('Cigarette Monitor browser checks passed. Screenshots: '+screenshots);
  }finally{
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => {console.error(error);process.exitCode=1;});
