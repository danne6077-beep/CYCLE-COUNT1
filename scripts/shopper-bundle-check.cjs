const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let browser,page;
(async()=>{
  const output=path.resolve(__dirname,'../qa/shopper');
  fs.mkdirSync(output,{recursive:true});
  browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER_CHANNEL?{channel:process.env.TEST_BROWSER_CHANNEL}:{})});
  page=await browser.newPage({viewport:{width:360,height:800}});
  const url=process.env.SHOPPER_TEST_URL||'http://127.0.0.1:4173/shopper/';
  const response=await page.goto(url,{waitUntil:'networkidle'});
  assert.equal(response.status(),200);
  assert.match(await page.title(),/FUJI.*Grocery Tracker/,'Expected the shopper app; a protected preview may require Vercel sign-in.');
  await page.getByRole('heading',{name:'Welcome to a better basket.'}).waitFor({timeout:60000});
  assert.ok(await page.locator('#sheet').getByText('Prices may not always be accurate. Estimate only. Final prices are confirmed at the cashier.',{exact:true}).isVisible());
  const roundtrip=await page.evaluate(async()=>{
    const [{toDataURL},{BrowserMultiFormatReader}]=await Promise.all([import('./vendor/qr.js'),import('./vendor/scanner.js')]);
    const expected='FUJI-BUNDLE-CHECK-12345';
    const image=new Image();
    image.src=await toDataURL(expected,{width:320,margin:4});
    await image.decode();
    const result=await new BrowserMultiFormatReader().decodeFromImageElement(image);
    return {expected,decoded:result.getText(),png:image.src.startsWith('data:image/png;base64,')};
  });
  assert.equal(roundtrip.png,true);
  assert.equal(roundtrip.decoded,roundtrip.expected);
  await page.getByRole('button',{name:'Let’s make a good shop'}).click();
  await page.locator('.product').first().waitFor();
  await page.locator('#toast .toast-inner').waitFor({state:'detached',timeout:7000});
  await page.screenshot({path:path.join(output,'built-mobile-light.png')});
  await page.locator('.topbar [data-tab=settings]').click();
  await page.locator('#theme-select').selectOption('dark');
  await page.locator('.mobile-nav [data-tab=shop]').click();
  await page.locator('#toast .toast-inner').waitFor({state:'detached',timeout:7000});
  await page.screenshot({path:path.join(output,'built-mobile-dark.png')});
  const headers=response.headers();
  if(!new URL(url).hostname.match(/^(localhost|127\.0\.0\.1)$/)){
    assert.match(headers['content-security-policy']||'',/default-src 'self'/);
    assert.match(headers['permissions-policy']||'',/camera=\(self\)/);
  }
  const checkedHeaders=Object.fromEntries(['content-security-policy','permissions-policy','x-content-type-options','cache-control'].map(key=>[key,headers[key]||'']));
  fs.writeFileSync(path.join(output,'bundle-report.json'),JSON.stringify({status:'passed',url,roundtrip,headers:checkedHeaders,screenshots:['built-mobile-light.png','built-mobile-dark.png']},null,2));
  await browser.close();
  console.log('Production bundles passed: QR generation, ZXing decode, visible price warning, light/dark shopper UI.');
})().catch(async error=>{console.error(error);if(page){const location=new URL(page.url());console.error('Page:',await page.title(),location.origin+location.pathname);}await browser?.close();process.exitCode=1;});
