const CACHE = 'fuji-shell-v1';
const SHELL = [
  '/', '/index.html', '/404.html', '/manifest.webmanifest', '/logo.jpg', '/tokens.css',
  '/styles.css', '/app-shell.css', '/count-sheet.css', '/count-sheet-reference.css',
  '/print.css', '/print-tags.css', '/shelftag.css', '/home-dashboard.css', '/auth.css',
  '/settings-hub.css', '/cigars.css', '/announcements.css', '/masterlist.css', '/site-extras.css', '/about-us.css', '/redesign.css',
  '/safe-text-utils.js', '/count-session-utils.js', '/count-sheet-import-utils.js',
  '/count-sheet-filter-utils.js', '/cigar-monitor-utils.js', '/cigar-expiry-utils.js',
  '/app.js', '/firebase-config.js', '/firebase-auth.js', '/app-shell.js', '/site-extras.js',
  '/print-controller.js', '/product-lookup.js', '/shelftag.js', '/cigar-monitor.js',
  '/cigar-expiry.js', '/masterlist.js', '/announcements.js', '/layout-persistence.js'
];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
];
self.addEventListener('install', event => event.waitUntil(Promise.all([
  caches.open(CACHE).then(cache => cache.addAll(SHELL)),
  caches.open('fuji-libs-v1').then(async cache => { await Promise.all(LIBS.map(async url => { try { const response = await fetch(url, { mode: 'no-cors' }); await cache.put(url, response); } catch {} })); })
]).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('fuji-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
 self.addEventListener('fetch', event => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  if (url.origin !== self.location.origin) {
    if (url.hostname !== 'cdn.jsdelivr.net' && url.hostname !== 'cdn.sheetjs.com') return;
    event.respondWith(caches.open('fuji-libs-v1').then(async cache => (await cache.match(request)) || fetch(request)));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put('/index.html', copy)); return response; }).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if (response.ok && response.type === 'basic') caches.open(CACHE).then(cache => cache.put(request, response.clone())); return response; })));
});
