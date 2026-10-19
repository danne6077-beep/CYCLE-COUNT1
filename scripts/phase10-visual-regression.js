const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

let baseUrl = process.env.VISUAL_BASE_URL || '';
const staticRoot = path.resolve(__dirname, '..', 'dist');
const staticTypes = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml', '.md':'text/markdown' };
const previewServer = process.env.VISUAL_BASE_URL ? null : http.createServer((request,response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let file = path.resolve(staticRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(staticRoot + path.sep) && file !== path.join(staticRoot,'index.html')) { response.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
  fs.readFile(file,(error,content) => {
    if (error) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200,{'content-type':`${staticTypes[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`}).end(content);
  });
});
const widths = [390, 768, 1024, 1280, 1366, 1440, 1920];
const scales = [1, 1.25, 1.5];
const modules = [
  ['home', '#homeNav'], ['count-sheet', '#countSheetNav'], ['shelf-tag', '#shelfTagNav'],
  ['product-lookup', '#productLookupNav'], ['masterlist', '#masterlistNav'], ['cigarette-monitor', '#cigarsNav']
];
const screenshotDir = path.resolve(__dirname, '..', 'qa', 'phase10', 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });
const browserOptions = { headless: true };
const chromePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
if (chromePath && fs.existsSync(chromePath)) browserOptions.executablePath = chromePath;
let browser;
const failures = [];
const measurements = [];
const screenshotDone = new Set();

function fail(message) { failures.push(message); }
async function signIn(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  if (await page.locator('#loginPage').isVisible()) {
    await page.locator('#loginUsername').fill('admin');
    await page.locator('#loginPassword').fill('admin123');
    await page.locator('#loginForm button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('#appShell')?.hidden, null, { timeout: 12000 });
  } else {
    await page.waitForFunction(() => !document.querySelector('#appShell')?.hidden, null, { timeout: 12000 });
  }
  if (await page.locator('#cookieBanner').isVisible()) await page.locator('#cookieEssential').click();
}
async function navigate(page, selector, width) {
  if (width < 900) await page.locator('.drawer-toggle').click();
  await page.locator(selector).click();
}
async function inspect(page, label, width, scale, theme) {
  const result = await page.evaluate(() => {
    const rect = element => { const r = element.getBoundingClientRect(); return { left:r.left, right:r.right, width:r.width, top:r.top, bottom:r.bottom }; };
    const actions = document.querySelector('.topbar-actions');
    const title = document.querySelector('.topbar-page-title');
    return {
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      title: title ? rect(title) : null,
      actions: actions ? rect(actions) : null,
      panel: [...document.querySelectorAll('#mainContent > section')].find(x => !x.hidden)?.id || 'settings',
      theme: document.documentElement.dataset.theme
    };
  });
  if (result.document > width + 1 || result.body > width + 1) fail(`${label} ${width}px @${scale} ${theme}: horizontal overflow ${result.document}/${result.body}`);
  if (result.title && result.actions && result.title.right > result.actions.left + 1) fail(`${label} ${width}px @${scale} ${theme}: topbar title overlaps page actions`);
  measurements.push({ screen:label,width,scale,theme,documentWidth:result.document,viewport:result.viewport,panel:result.panel });
}

(async () => {
  if (previewServer) {
    await new Promise((resolve,reject) => { previewServer.once('error',reject); previewServer.listen(0,'127.0.0.1',resolve); });
    baseUrl = `http://127.0.0.1:${previewServer.address().port}/`;
  }
  browser = await chromium.launch(browserOptions);
  for (const scale of scales) {
    for (const width of widths) {
      const context = await browser.newContext({ viewport:{width,height:900}, deviceScaleFactor:scale });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await signIn(page);
      for (const theme of ['light','dark']) {
        await page.evaluate(themeValue => {
          localStorage.setItem('fuji-color-theme-v1', themeValue);
          document.documentElement.dataset.theme = themeValue;
          document.documentElement.style.colorScheme = themeValue;
        }, theme);
        for (const [name, selector] of modules) {
          await navigate(page,selector,width);
          await page.waitForTimeout(40);
          await inspect(page, name, width, scale, theme);
          if (width === 1366 && scale === 1) {
            const key = `${theme}-${name}`;
            if (!screenshotDone.has(key)) {
              await page.screenshot({ path:path.join(screenshotDir, `${key}.png`), fullPage:true });
              screenshotDone.add(key);
            }
          }
        }
        await navigate(page,'#settingsBtn',width);
        const settingsState = await page.evaluate(() => ({ visible:!document.querySelector('#settingsPage').hidden, backdrop:!document.querySelector('#modalBackdrop').hidden, visiblePanels:[...document.querySelectorAll('#mainContent > section:not([hidden])')].map(panel=>panel.id), columns:getComputedStyle(document.querySelector('.settings-hub')).gridTemplateColumns }));
        if (!settingsState.visible || settingsState.backdrop || settingsState.visiblePanels.length) fail(`settings ${width}px @${scale} ${theme}: page/backdrop state ${JSON.stringify(settingsState)}`);
        await inspect(page,'settings',width,scale,theme);
        if (width === 1366 && scale === 1) {
          const key = `${theme}-settings`;
          await page.screenshot({ path:path.join(screenshotDir, `${key}.png`), fullPage:true });
          screenshotDone.add(key);
        }
        await page.locator('#closeModal').click();
        await navigate(page,'#helpAssistantTrigger',width);
        await page.locator('#helpAssistantSearch').fill('locator prefix');
        const helpCount = await page.locator('#helpAssistantResults article').count();
        if (helpCount < 1) fail(`help assistant ${width}px @${scale} ${theme}: no local locator answer`);
        await page.locator('#helpAssistantDialog .help-close').click();
        await page.emulateMedia({ media:'print' });
        const printState = await page.evaluate(() => ({ background:getComputedStyle(document.body).backgroundColor, sidebar:getComputedStyle(document.querySelector('.app-sidebar')).display, help:getComputedStyle(document.querySelector('#helpAssistantDialog')).display }));
        if (!['rgb(255, 255, 255)','rgba(0, 0, 0, 0)'].includes(printState.background) || printState.sidebar !== 'none' || printState.help !== 'none') fail(`print ${width}px @${scale} ${theme}: theme-independent print state ${JSON.stringify(printState)}`);
        await page.emulateMedia({ media:'screen' });
        if (pageErrors.length) fail(`${name} ${width}px @${scale} ${theme}: page errors ${pageErrors.join('; ')}`);
      }
      await context.close();
    }
  }
  const routeContext = await browser.newContext({ viewport:{width:1366,height:900} });
  const routePage = await routeContext.newPage();
  await routePage.goto(new URL('design/', baseUrl).href, {waitUntil:'domcontentloaded'});
  if (!(await routePage.getByRole('heading',{name:'Interface patterns'}).count())) fail('design route did not render the component library');
  await routePage.goto(new URL('404.html',baseUrl).href, {waitUntil:'domcontentloaded'});
  if (!(await routePage.locator('body').innerText()).match(/page|home|not found/i)) fail('404 route did not render recovery content');
  await routeContext.close();
  await browser.close();
  if (previewServer) await new Promise(resolve => previewServer.close(resolve));
  console.log(JSON.stringify({ cases:measurements.length, screenshots:screenshotDone.size, failures, output:screenshotDir },null,2));
  if (failures.length) process.exitCode = 1;
})().catch(async error => { console.error(error); if (browser) await browser.close(); if (previewServer?.listening) await new Promise(resolve => previewServer.close(resolve)); process.exitCode = 1; });
