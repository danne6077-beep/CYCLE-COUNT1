const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist'),out=path.join(os.tmpdir(),'fuji-redesign-qa');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://local').pathname;const file=path.resolve(root,pathname==='/'?'index.html':pathname.slice(1));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data)})});
const screens=[['home','homeNav'],['count','countSheetNav'],['shelf','shelfTagNav'],['lookup','productLookupNav'],['masterlist','masterlistNav'],['cigars','cigarsNav'],['hotlist','hotlistNav'],['announcements','announcementsNav'],['about','creditsBtn'],['settings','settingsBtn']];
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:process.env.FUJI_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const results=[],errors=[];
  try{for(const theme of ['light','dark'])for(const width of [1440,768,390]){
    const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,serviceWorkers:'block',reducedMotion:'reduce'});
    await context.addInitScript(()=>localStorage.setItem('fuji-cookie-choice-v1','essential'));
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.FUJI_UI_TEST_URL||`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
    async function check(name){
      await page.waitForTimeout(70);
      const dimensions=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      let violations=[];
      if(process.env.FUJI_AXE_PATH&&width!==768){await page.addScriptTag({path:process.env.FUJI_AXE_PATH});violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,12)}))});}
      await page.screenshot({path:path.join(out,`after-${name}-${theme}-${width}.png`),fullPage:true});
      const item={screen:name,theme,width,dimensions,violations};results.push(item);
      console.log(JSON.stringify({screen:name,theme,width,overflow:dimensions.document>width+1,axe:violations.map(v=>v.id)}));
    }
    await check('login');
    if(width===1440&&theme==='light'){
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'skip-link');
      assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
      await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'loginPage');
    }
    await page.locator('#openDeviceWorkspace').click();
    for(const [name,id]of screens){await page.evaluate(id=>document.getElementById(id).click(),id);await check(name)}
    if(width===1440&&theme==='light'){
      await page.locator('[data-settings-tab="palette"]').click();await page.locator('[data-accent-option="sapphire"]').click();
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()),'#1d4ed8');
      await page.locator('[data-settings-tab="logo"]').click();await page.locator('#customLogoInput').setInputFiles(path.join(root,'logo.jpg'));
      await page.waitForFunction(()=>document.querySelector('.sidebar-brand .brand-mark img')?.src.startsWith('data:image'));
      await page.locator('#saveSettings').click();await page.reload({waitUntil:'domcontentloaded'});
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()),'#1d4ed8');
      assert.ok(await page.locator('.sidebar-brand .brand-mark img').count());
      await page.locator('.sidebar-collapse').click();assert.ok(await page.locator('#appShell').evaluate(e=>e.classList.contains('sidebar-collapsed')));
      await page.locator('.sidebar-collapse').click();await page.keyboard.press('Control+k');
      assert.ok(await page.locator('#siteSearchDialog').evaluate(e=>e.open));await page.keyboard.press('Escape');
      assert.equal(await page.locator('#siteSearchDialog').evaluate(e=>e.open),false);
    }
    // Use the actual theme control, rather than setting only a CSS attribute.
    await page.locator('#themeToggle').click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme==='dark'?'light':'dark');
    await context.close();
  }
  fs.writeFileSync(path.join(out,'ui-report.json'),JSON.stringify({results,errors},null,2));
  assert.deepEqual(errors,[],'No browser JavaScript errors');
  assert.deepEqual(results.filter(r=>r.dimensions.document>r.width+1||r.dimensions.body>r.width+1),[],'No viewport overflow');
  const failures=results.filter(r=>r.violations.length);assert.equal(failures.length,0,`Axe findings: ${JSON.stringify(failures.map(r=>({screen:r.screen,theme:r.theme,width:r.width,rules:r.violations.map(v=>v.id)})))}`);
  console.log(`UI checks passed. Screenshots and report: ${out}`);
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
