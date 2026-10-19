const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const url=process.env.SHOPPER_TEST_URL||'http://127.0.0.1:4173/shopper/';
const output=path.resolve(__dirname,'../qa/shopper');let browser;
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER_CHANNEL?{channel:process.env.TEST_BROWSER_CHANNEL}:{}),args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const checks=[];
 for(const mode of ['no-native-detector','broken-native-detector','denied-photo-fallback']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(mode=>{
   window.__cameraStreams=[];window.__cameraRequests=0;
   const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async options=>{
    window.__cameraRequests++;
    if(mode==='denied-photo-fallback')throw new DOMException('Permission denied for test','NotAllowedError');
    const stream=await original(options);window.__cameraStreams.push(stream);return stream;
   }});
   Object.defineProperty(window,'BarcodeDetector',{configurable:true,value:mode==='broken-native-detector'?class{static async getSupportedFormats(){throw new Error('Native detector unavailable');}}:undefined});
  },mode);
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Let’s make a good shop'}).click();
  await page.locator('[data-action=scan]:visible').first().click();
  assert.equal(await page.locator('#barcode-photo').getAttribute('capture'),'environment');
  if(mode==='denied-photo-fallback'){
   await page.locator('#camera-state').filter({hasText:'Camera permission is blocked.'}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Retry camera',exact:true}).isEnabled(),true);
   const png=await page.evaluate(async()=>{const {toDataURL}=await import('./vendor/qr.js');return toDataURL('486522',{width:360,margin:4});});
   await page.locator('#barcode-photo').setInputFiles({name:'barcode.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});
   await page.locator('#scan-result [data-price="486522"]').waitFor({timeout:30000});
   assert.match(await page.locator('#scan-result').innerText(),/₱14\.05/);
   assert.equal(await page.locator('#torch-button').isVisible(),false,'Photo mode must hide the inactive torch control.');
   await page.screenshot({path:path.join(output,'camera-photo-fallback.png')});
  }else{
   try{await page.locator('#camera-state').filter({hasText:'Keep the barcode inside the frame.'}).waitFor({timeout:15000});}
   catch(error){console.error(JSON.stringify({mode,status:await page.locator('#camera-state').innerText(),requests:await page.evaluate(()=>window.__cameraRequests),errors}));await page.screenshot({path:path.join(output,'camera-failure.png')});throw error;}
   assert.equal(await page.evaluate(()=>document.querySelector('#camera').videoWidth>0),true);
   assert.equal(await page.evaluate(()=>window.__cameraRequests),1,'Fallback must reuse the same camera permission and stream.');
   await page.screenshot({path:path.join(output,'camera-'+mode+'.png')});
  }
  await page.locator('[data-action=close-sheet]').click();
  assert.equal(await page.evaluate(()=>window.__cameraStreams.every(stream=>stream.getTracks().every(track=>track.readyState==='ended'))),true);
  assert.deepEqual(errors,[]);checks.push({mode,status:'passed'});await context.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(output,'camera-report.json'),JSON.stringify({status:'passed',url,checks,measurement:'Isolated Chromium using its simulated camera. Real getUserMedia/video playback and shipped ZXing/photo decoding; physical phone hardware remains unverified.'},null,2));
 console.log('Camera checks passed: automatic permission request, live video without native BarcodeDetector, broken-native fallback, denied-permission guidance, photo barcode lookup and stream cleanup.');
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;});
