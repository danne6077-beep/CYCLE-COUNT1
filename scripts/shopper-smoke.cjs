const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
let browser;
(async()=>{
 const output=path.resolve(__dirname,'../qa/shopper');fs.mkdirSync(output,{recursive:true});
 browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER_CHANNEL?{channel:process.env.TEST_BROWSER_CHANNEL}:{})});
 const context=await browser.newContext({viewport:{width:360,height:800},deviceScaleFactor:1,isMobile:true,hasTouch:true,colorScheme:'light'});const page=await context.newPage();
 await context.addInitScript(()=>{
  window.__fujiTestBarcodes=[];
  window.BarcodeDetector=class{static async getSupportedFormats(){return ['ean_13','ean_8','upc_a','upc_e','code_128','qr_code'];}async detect(){return window.__fujiTestBarcodes.length?[{rawValue:window.__fujiTestBarcodes.shift()}]:[];}};
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d');const draw=()=>{ctx.fillStyle='#163e2e';ctx.fillRect(0,0,640,480);};draw();setInterval(draw,100);window.__fujiTestStream=c.captureStream(10);return window.__fujiTestStream;}});
 });
 const errors=[],catalogRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/catalog/'))catalogRequests.push(r.url());});
 await page.goto(process.env.SHOPPER_TEST_URL||'http://127.0.0.1:4173/shopper/',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'Welcome to a better basket.'}).waitFor({timeout:60000});
 await page.locator('#budget-input').fill('400');await page.getByRole('button',{name:'Let’s make a good shop'}).click();
 await page.locator('.product').first().waitFor();assert.equal(await page.locator('.product-price.unknown').count(),0);assert.match(await page.locator('.product').first().innerText(),/₱/);
 assert.equal(catalogRequests.some(url=>/\/search\.v\d+\./.test(url)),false,'The first usable screen must not wait for the full department search catalog.');
 assert.equal(catalogRequests.some(url=>url.endsWith('/catalog-prices.json')),false,'The first screen must not wait for the full price overlay.');
 await page.locator('#toast .toast-inner').waitFor({state:'detached',timeout:7000});
 await page.locator('.topbar [data-tab=settings]').click();await page.locator('#theme-select').selectOption('light');await page.locator('.mobile-nav [data-tab=shop]').click();
 await page.screenshot({path:path.join(output,'mobile-light.png'),fullPage:false});
 await page.locator('#product-search').fill('rice');await page.locator('#result-count').filter({hasText:'matching products'}).waitFor({timeout:60000});
 const skus=await page.locator('[data-add]').evaluateAll(elements=>elements.slice(0,5).map(el=>el.dataset.add));assert.equal(skus.length,5);
 await page.locator('[data-plan]').first().click();
 await page.locator('[data-action=scan]:visible').first().click();
 await page.getByText('Keep the barcode inside the frame. Tap video to refocus.').waitFor();
 await page.evaluate(sku=>window.__fujiTestBarcodes.push(sku),skus[0]);await page.locator(`#scan-result [data-price="${skus[0]}"]`).waitFor();
 for(const sku of skus.slice(1)){await page.locator('#barcode-input').fill(sku);await page.locator('#barcode-form button').click();await page.locator(`#scan-result [data-price="${sku}"]`).waitFor();}
 await page.locator('[data-action=close-sheet]').click();
 assert.equal(await page.evaluate(()=>window.__fujiTestStream.getTracks().every(t=>t.readyState==='ended')),true);
 await page.locator('.mobile-nav [data-tab=cart]').click();await page.locator('.cart-item').first().waitFor();assert.equal(await page.locator('.cart-item').count(),5);
 for(let i=0;i<skus.length;i++){await page.locator(`[data-price="${skus[i]}"]`).click();await page.locator('#manual-price').fill((50.29+i*10).toFixed(2));await page.getByRole('button',{name:'Save shelf price',exact:true}).click();}
 assert.ok((await page.locator('.summary-row.total').innerText()).includes('₱351.45'));
 await page.locator(`[data-qty="1"][data-sku="${skus[0]}"]`).click();assert.ok((await page.locator('.summary-row.total').innerText()).includes('₱401.74'));assert.ok((await page.locator('.budget-status').innerText()).includes('Over budget'));
 await page.locator('[data-action=finish]').click();await page.getByRole('button',{name:'Save finished trip'}).click();await page.getByRole('heading',{name:'Past trips',exact:true}).waitFor();assert.ok((await page.locator('main').innerText()).includes('₱401.74'));
 await page.locator('[data-action=history]').click();await page.locator('[data-share]').first().waitFor();
 await page.locator('.topbar [data-tab=settings]').click();await page.locator('#theme-select').selectOption('dark');
 await page.locator('#toast .toast-inner').waitFor({state:'detached',timeout:7000});
 await page.locator('.mobile-nav [data-tab=shop]').click();await page.screenshot({path:path.join(output,'mobile-dark.png'),fullPage:false});
 await page.locator('.topbar [data-tab=ask]').click();await page.locator('#chat-input').fill('What’s the cheapest rice?');await page.locator('#chat-form button').click();await page.locator('.message.assistant').waitFor();assert.match(await page.locator('.message.assistant').innerText(),/Lowest pack price/);
 await page.locator('#chat-ready').filter({hasText:'Offline ready'}).waitFor();await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#chat-form').waitFor({timeout:30000});await page.locator('[data-chat-close]').click();await page.locator('.mobile-nav [data-tab=shop]').click();await page.locator('.product').first().waitFor();await context.setOffline(false);
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-action=theme]').click();await page.screenshot({path:path.join(output,'desktop-light.png'),fullPage:false});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'smoke-report.json'),JSON.stringify({status:'passed',scannedItems:5,mockedCameraRead:true,cameraTracksStopped:true,knownSubtotal:40174,offlineReload:true,errors,screenshots:['mobile-light.png','mobile-dark.png','desktop-light.png']},null,2));
 await browser.close();console.log('Shopper mobile smoke passed: onboard, scan 5 real SKUs, prices, budget, history, local helper, offline reload, themes.');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
