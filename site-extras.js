(() => {
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const themeKey = 'fuji-color-theme-v1';
  const cookieKey = 'fuji-cookie-choice-v1';
  const newsletterKey = 'fuji-newsletter-interest-v1';

  function setTheme(theme) {
    const dark = theme === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    try { localStorage.setItem(themeKey, dark ? 'dark' : 'light'); } catch {}
    const button = $('themeToggle');
    if (button) {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
      button.querySelector('span:last-child').textContent = dark ? 'Light' : 'Dark';
    }
  }
  let savedTheme = null; try { savedTheme = localStorage.getItem(themeKey); } catch {}
  setTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  $('themeToggle')?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  const menuToggle = $('mobileMenuToggle');
  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    $('appShell').classList.toggle('nav-open', open);
  });
  document.querySelectorAll('#primaryNavigation button,#utilityNavigation button').forEach(button => button.addEventListener('click', () => {
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation');
    $('appShell')?.classList.remove('nav-open');
  }));

  const progress = $('scrollProgress');
  const backTop = $('backToTop');
  const updateScrollTools = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const value = Math.min(100, Math.round(scrollY / max * 100));
    progress?.style.setProperty('--scroll-progress', `${value}%`);
    progress?.setAttribute('aria-valuenow', String(value));
    backTop?.classList.toggle('is-visible', scrollY > 500);
  };
  addEventListener('scroll', updateScrollTools, { passive: true });
  addEventListener('resize', updateScrollTools);
  updateScrollTools();
  backTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  const searchDialog = $('siteSearchDialog');
  const searchInput = $('siteSearchInput');
  const results = $('siteSearchResults');
  const navTargets = [
    ['homeNav', 'Home dashboard', 'home overview inventory status quick access'],
    ['countSheetNav', 'Count sheet', 'cycle count supplier inventory import print spreadsheet count'],
    ['cigarsNav', 'Cigarette monitor', 'cigarette monitoring daily selling expiry stock log'],
    ['shelfTagNav', 'Shelf tags', 'shelf tag printing barcode price promotion'],
    ['productLookupNav', 'Product lookup', 'catalog sku barcode description product search'],
    ['masterlistNav', 'Masterlist', 'masterlist workbook upload ccd department vendor'],
    ['announcementsNav', 'Updates and announcements', 'release notes administrator publish updates'],
    ['hotlistNav', 'Hotlist', 'milk liquor cigarettes shift inventory'],
    ['creditsBtn', 'About Fuji', 'about values team contact workflow notes careers']
  ];
  const panelNavigation = { homePanel: 'homeNav', aboutPanel: 'creditsBtn', countSheetPanel: 'countSheetNav', cigarsPanel: 'cigarsNav', shelfTagPanel: 'shelfTagNav', productLookupPanel: 'productLookupNav', masterlistPanel: 'masterlistNav', announcementsPanel: 'announcementsNav', hotlistPanel: 'hotlistNav' };
  const staticEntries = [...document.querySelectorAll('#mainContent h1,#mainContent h2,#mainContent h3,#mainContent h4,#mainContent summary')].map(node => {
    let panel = node; while (panel.parentElement && panel.parentElement !== $('mainContent')) panel = panel.parentElement;
    const navId = panelNavigation[panel?.id] || 'creditsBtn';
    return {
      title: node.textContent.trim(),
      detail: node.parentElement?.innerText?.replace(/\s+/g, ' ').slice(0, 160) || 'FUJI Cycle Count workspace',
      action: () => { $(navId)?.click(); setTimeout(() => node.scrollIntoView({ behavior: 'smooth', block: 'center' }), 140); }
    };
  });
  function renderSearch(query = '') {
    const q = query.trim().toLocaleLowerCase();
    const matching = [
      ...navTargets.filter(([, title, words]) => !q || `${title} ${words}`.toLocaleLowerCase().includes(q)).map(([id, title, words]) => ({ title, detail: words, action: () => $(id)?.click() })),
      ...staticEntries.filter(entry => !q || `${entry.title} ${entry.detail}`.toLocaleLowerCase().includes(q))
    ].slice(0, 14);
    results.replaceChildren();
    if (!matching.length) {
      const empty = document.createElement('p'); empty.className = 'site-search-empty'; empty.textContent = 'No matching pages or tools. Try another search.'; results.append(empty); return;
    }
    matching.forEach(entry => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'site-search-result'; button.setAttribute('role', 'option');
      const title = document.createElement('strong'); title.textContent = entry.title;
      const detail = document.createElement('small'); detail.textContent = entry.detail;
      button.append(title, detail); button.addEventListener('click', () => { searchDialog.close(); entry.action(); }); results.append(button);
    });
  }
  const openSearch = () => { searchInput.value = ''; renderSearch(); searchDialog.showModal(); searchInput.focus(); };
  $('siteSearchTrigger')?.addEventListener('click', openSearch);
  $('aboutSearch')?.addEventListener('click', openSearch);
  searchInput?.addEventListener('input', () => renderSearch(searchInput.value));
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (!searchDialog.open) $('siteSearchTrigger')?.click(); }
  });

  document.querySelectorAll('[data-password-toggle]').forEach(button => button.addEventListener('click', () => {
    const field = $(button.dataset.passwordToggle); const reveal = field.type === 'password';
    field.type = reveal ? 'text' : 'password'; button.textContent = reveal ? 'Hide' : 'Show';
    button.setAttribute('aria-pressed', String(reveal)); button.setAttribute('aria-label', `${reveal ? 'Hide' : 'Show'} password`);
  }));
  const createPassword = $('authNewPassword');
  if (createPassword) {
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'password-toggle'; toggle.dataset.passwordToggle = 'authNewPassword'; toggle.textContent = 'Show'; toggle.setAttribute('aria-label', 'Show password'); toggle.setAttribute('aria-pressed', 'false');
    const wrapper = document.createElement('span'); wrapper.className = 'password-field'; createPassword.replaceWith(wrapper); wrapper.append(createPassword, toggle);
    toggle.addEventListener('click', () => { const reveal = createPassword.type === 'password'; createPassword.type = reveal ? 'text' : 'password'; toggle.textContent = reveal ? 'Hide' : 'Show'; toggle.setAttribute('aria-pressed', String(reveal)); toggle.setAttribute('aria-label', `${reveal ? 'Hide' : 'Show'} password`); });
  }

  const confirmDialog = $('confirmDialog');
  let settleConfirmation;
  window.fujiConfirm = (message, title = 'Are you sure?') => new Promise(resolve => {
    $('confirmHeading').textContent = title; $('confirmMessage').textContent = message; settleConfirmation = resolve; confirmDialog.showModal(); $('confirmCancel').focus();
  });
  $('confirmCancel').addEventListener('click', () => { confirmDialog.close(); settleConfirmation?.(false); settleConfirmation = null; });
  $('confirmAccept').addEventListener('click', () => { confirmDialog.close(); settleConfirmation?.(true); settleConfirmation = null; });
  confirmDialog.addEventListener('cancel', () => { settleConfirmation?.(false); settleConfirmation = null; });

  const cookieBanner = $('cookieBanner');
  let cookieChoice = null; try { cookieChoice = localStorage.getItem(cookieKey); } catch {}
  if (!cookieChoice) cookieBanner.hidden = false;
  const saveCookieChoice = choice => { try { localStorage.setItem(cookieKey, choice); } catch {} cookieBanner.hidden = true; };
  $('cookieAccept').addEventListener('click', () => saveCookieChoice('accepted'));
  $('cookieEssential').addEventListener('click', () => saveCookieChoice('essential-only'));

  $('newsletterForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const email = $('newsletterEmail').value.trim().toLowerCase();
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(newsletterKey) || '[]'); } catch {}
    if (!saved.includes(email)) saved.push(email);
    try { localStorage.setItem(newsletterKey, JSON.stringify(saved)); } catch {}
    $('newsletterStatus').textContent = 'Thanks! Your interest is saved in this browser. No email is sent.';
    $('newsletterForm').classList.add('is-subscribed');
    $('newsletterForm').querySelector('button[type="submit"]').textContent = 'Signed up';
    $('newsletterForm').querySelector('button[type="submit"]').disabled = true;
  });

  function addCopyButtons(scope = document) {
    scope.querySelectorAll('pre code').forEach(code => {
      const pre = code.closest('pre'); if (!pre || pre.querySelector('.copy-code-button')) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'copy-code-button'; button.textContent = 'Copy'; button.setAttribute('aria-label', 'Copy code snippet');
      button.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(code.innerText); button.textContent = 'Copied'; setTimeout(() => { button.textContent = 'Copy'; }, 1500); }
        catch { button.textContent = 'Copy unavailable'; }
      });
      pre.append(button);
    });
  }
  addCopyButtons();
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) addCopyButtons(node); }))).observe(document.body, { childList: true, subtree: true });

  function addUtm(link) {
    if (link.dataset.utmProcessed) return;
    let url; try { url = new URL(link.href, location.href); } catch { return; }
    if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) return;
    if (!url.searchParams.has('utm_source')) url.searchParams.set('utm_source', 'fuji_cycle_count');
    if (!url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', 'website');
    if (!url.searchParams.has('utm_campaign')) url.searchParams.set('utm_campaign', 'outbound_link');
    const tracked = url.toString(); if (tracked !== link.href) link.href = tracked;
    link.dataset.utmProcessed = 'true';
  }
  document.querySelectorAll('a[href]').forEach(addUtm);
  new MutationObserver(records => records.forEach(record => {
    if (record.type === 'attributes') { if (record.target.matches('a[href]')) { delete record.target.dataset.utmProcessed; addUtm(record.target); } return; }
    record.addedNodes.forEach(node => { if (node.nodeType !== 1) return; if (node.matches('a[href]')) addUtm(node); node.querySelectorAll?.('a[href]').forEach(addUtm); });
  })).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });

  const enteringObserver = new MutationObserver(records => records.forEach(record => {
    if (record.attributeName !== 'hidden' || record.target.hidden || !record.target.matches('main section')) return;
    record.target.classList.remove('site-entering'); void record.target.offsetWidth; record.target.classList.add('site-entering');
  }));
  enteringObserver.observe($('mainContent'), { attributes: true, subtree: true, attributeFilter: ['hidden'] });

  document.addEventListener('click', event => {
    const contact = event.target.closest('#floatingContact');
    if (contact) { event.preventDefault(); $('creditsBtn')?.click(); setTimeout(() => $('about-contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120); }
  });
  document.addEventListener('authchange', () => { document.querySelector('.skip-link')?.setAttribute('href', document.body.classList.contains('auth-logged-out') ? '#loginTitle' : '#mainContent'); });
  addEventListener('load', () => document.body.classList.add('site-loaded'), { once: true });
})();
