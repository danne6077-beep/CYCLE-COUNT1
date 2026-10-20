const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
let browser,page;
(async()=>{
 const output=path.resolve(__dirname,'../qa/shopper');fs.mkdirSync(output,{recursive:true});
 browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER_CHANNEL?{channel:process.env.TEST_BROWSER_CHANNEL}:{})});
 const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true,colorScheme:'light'});page=await context.newPage();const errors=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));context.on('request',r=>requests.push(r.url()));
 await page.goto(process.env.SHOPPER_TEST_URL||'http://127.0.0.1:4173/shopper/',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'Welcome to a better basket.'}).waitFor({timeout:60000});await page.locator('#budget-input').fill('500');await page.getByRole('button',{name:'Let’s make a good shop'}).click();
 await page.locator('#chat-launcher').click();await page.locator('#chat-ready').filter({hasText:'Offline ready'}).waitFor({timeout:60000});
 async function ask(q){const previous=await page.locator('.message.assistant').count()?await page.locator('.message.assistant').last().getAttribute('data-message-id'):null;await page.locator('#chat-input').fill(q);await page.locator('#chat-form button').click();await page.waitForFunction(previous=>{const nodes=document.querySelectorAll('.message.assistant');return nodes.length&&nodes[nodes.length-1].dataset.messageId!==previous;},previous);await page.locator('#chat-busy').waitFor({state:'hidden'});return page.locator('.message.assistant').last();}
 for(const q of ['cheapest rice','how much milk','cheapest cooking oil','compare Coke vs Pepsi','rice under 100','pinakamurang bigas','magkano ang itlog','saan ang sabon','meron ba kayong Bear Brand','may 500 ako ano mabibili']){const answer=await ask(q);assert.ok(await answer.locator('.chat-product,.plan-card').count(),q);assert.ok(await answer.locator('table tbody tr,[data-plan-row]').count(),q);}
 const rice=await ask('cheapest rice');assert.match(await rice.innerText(),/SEGUNDINO RICE 1KILO/);assert.match(await rice.innerText(),/₱47\.00/);
 await rice.locator('[data-chat-add="9613"]').click();await page.locator('#chat-basket-change').filter({hasText:'Basket updated'}).waitFor();
 let answer=await ask('How much is my basket?');assert.match(await answer.innerText(),/₱47\.00/);assert.match(await answer.innerText(),/₱453\.00/);
 await page.locator('#chat-basket-change button').click();answer=await ask('my basket');assert.match(await answer.innerText(),/₱0\.00/);
 await ask('cheapest rice');await ask('idagdag mo yung pangalawa');answer=await ask('my basket');assert.match(await answer.innerText(),/₱48\.00/);
 assert.equal(await page.locator('#chat-julian').count(),0);
 await page.locator('#chat-input').fill('a'.repeat(410));assert.match(await page.locator('#chat-count').innerText(),/410/);await page.locator('#chat-input').fill('');
 await page.keyboard.press('Escape');assert.equal(await page.locator('#fuji-chat').evaluate(el=>el.open),false);await page.locator('#chat-launcher').click();
 for(let i=0;i<25;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('#fuji-chat').contains(document.activeElement)),true,'Focus must stay in the modal');}
 await page.addScriptTag({path:require.resolve('../shopper/node_modules/axe-core/axe.min.js')});
 const accessibility=[];for(const theme of ['dark','light']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('#fuji-chat'));return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));});accessibility.push(...violations.map(v=>({...v,theme})));}assert.deepEqual(accessibility,[]);
 const minTargets=await page.locator('#fuji-chat button:visible,#fuji-chat select:visible').evaluateAll(els=>els.filter(el=>el.getBoundingClientRect().height<44).map(el=>el.outerHTML.slice(0,120)));assert.deepEqual(minTargets,[]);
 const offlineQuestions=['cheapest rice','pinakamurang bigas','magkano ang itlog','cooking oyl','magkano ang gatsa','show shampoo under 100','may 500 ako ano mabibili','compare coke vs pepsi','best value rice','meron bigas','saan ang sabon','promo ngayon','cheapest coffee','cheapest sugar','cheapest salt','cheapest water','cheapest bread','cheapest milk','cheapest detergent','pinakamahal na bigas','list biscuits','adobo ingredients','breakfast ingredients','what can you do','salamat po','my basket','ano ang matitira sa budget ko','bgas','cheapest rice','yung pangalawa','add it','mas mura pa?','unknownxyzqqq'];
 const start=requests.length;await context.setOffline(true);
 for(const q of offlineQuestions){answer=await ask(q);assert.ok((await answer.locator('.chat-answer').innerText()).length>10,q);}
 assert.deepEqual(requests.slice(start),[],'Chat questions must make no network requests once prepared');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#chat-launcher').click();await page.locator('#chat-ready').filter({hasText:'Offline ready'}).waitFor({timeout:30000});answer=await ask('cheapest rice');assert.match(await answer.innerText(),/₱47\.00/);
 const history=await page.evaluate(async()=>{const {read}=await import('./lib/storage.js');return (await read('chat-history')).length;});assert.ok(history>60&&history<=200);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#chat-input').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),true);
 await page.screenshot({path:path.join(output,'chat-mobile-offline.png')});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(output,'chat-desktop.png')});
 assert.deepEqual(errors,[]);const timings=await page.evaluate(async()=>{const {read}=await import('./lib/storage.js');return(await read('chat-history')).filter(m=>m.elapsedMs!=null).map(m=>m.elapsedMs).sort((a,b)=>a-b);});
 fs.writeFileSync(path.join(output,'chat-report.json'),JSON.stringify({status:'passed',offlineQueries:offlineQuestions.length,questionNetworkRequests:requests.slice(start).filter(u=>u.includes('/api/')).length,offlineReload:true,historyMessages:history,accessibility,seriousCritical:0,queryMedianMs:timings[Math.floor(timings.length/2)],queryP95Ms:timings[Math.floor(timings.length*.95)],errors},null,2));
 await browser.close();console.log('Offline chatbot passed: bilingual answers, actual basket/undo, 33 offline queries, reload, history, keyboard focus and axe.');
})().catch(async error=>{console.error(error);if(page)await page.screenshot({path:path.resolve(__dirname,'../qa/shopper/chat-failure.png')}).catch(()=>{});await browser?.close();process.exitCode=1;});
