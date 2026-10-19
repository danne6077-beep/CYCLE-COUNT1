(() => {
  const $ = (id) => document.getElementById(id);
  const shell = $('appShell');
  const oldHeader = shell?.querySelector('.topbar');
  const main = $('mainContent');
  if (!shell || !oldHeader || !main) return;

  const layout = document.createElement('div');
  layout.className = 'app-layout';
  oldHeader.before(layout);
  const sidebar = document.createElement('aside');
  sidebar.className = 'app-sidebar';
  sidebar.id = 'appSidebar';
  sidebar.setAttribute('aria-label', 'Workspace navigation');
  const content = document.createElement('div');
  content.className = 'app-content';
  layout.append(sidebar, content);
  content.append(oldHeader, main);

  const brand = document.createElement('div');
  brand.className = 'sidebar-brand';
  brand.innerHTML = '<img src="logo.jpg" alt="" width="32" height="32"><span><strong>FUJI</strong><small>Inventory workspace</small></span>';
  const store = document.createElement('button');
  store.className = 'store-switcher';
  store.type = 'button';
  store.innerHTML = '<img class="store-switcher-mark" src="logo.jpg" alt="" width="26" height="26"><span class="store-switcher-copy"><strong id="sidebarStoreName">Current store</strong><small>Local workspace</small></span><span class="store-switcher-chevron" aria-hidden="true">⌄</span>';
  store.title = 'Edit current store details';
  store.addEventListener('click', () => { $('settingsBtn')?.click(); document.querySelector('[data-settings-tab="identity"]')?.click(); });
  sidebar.append(brand, store);

  const collapse = document.createElement('button');
  collapse.type = 'button'; collapse.className = 'sidebar-collapse';
  collapse.setAttribute('aria-label', 'Collapse sidebar'); collapse.title = 'Collapse sidebar'; collapse.textContent = '‹';
  sidebar.append(collapse);
  const primary = $('primaryNavigation');
  if (primary) { primary.className = 'sidebar-primary'; sidebar.append(primary); }
  const utility = $('utilityNavigation');
  const divider = document.createElement('div'); divider.className = 'sidebar-divider'; divider.setAttribute('role', 'separator'); sidebar.append(divider);
  const footerNav = document.createElement('nav'); footerNav.className = 'sidebar-footer'; footerNav.setAttribute('aria-label', 'Account and help');
  const profile = $('authProfileBtn'); const logout = $('authHeaderLogoutBtn'); const updates = $('announcementsNav'); const settings = $('settingsBtn'); const about = $('creditsBtn'); const reset = $('resetBtn'); const theme = $('themeToggle'); const search = $('siteSearchTrigger');
  [updates, about, settings, theme, profile, logout].forEach(button => { if (button) footerNav.append(button); });
  const designLink = document.createElement('a'); designLink.className = 'nav-button design-link'; designLink.href = 'design/'; designLink.title = 'Open design system'; designLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h4"/></svg><span>Design system</span>'; footerNav.append(designLink);
  sidebar.append(footerNav);
  const tools = document.createElement('div'); tools.className = 'topbar-tools';
  const title = document.createElement('div'); title.className = 'topbar-page-title'; title.innerHTML = '<span class="topbar-context">FUJI INVENTORY WORKSPACE</span><h1 id="currentPageTitle">Home</h1>';
  const topActions = document.createElement('div'); topActions.className = 'topbar-actions';
  const help = document.createElement('button'); help.type = 'button'; help.className = 'nav-button'; help.id = 'helpAssistantTrigger'; help.title = 'Help assistant'; help.setAttribute('aria-label', 'Open help assistant'); help.innerHTML = '<span aria-hidden="true">?</span><span>Help</span>';
  footerNav.append(help);
  const drawerToggle = document.createElement('button'); drawerToggle.type = 'button'; drawerToggle.className = 'nav-button drawer-toggle'; drawerToggle.setAttribute('aria-label', 'Open navigation'); drawerToggle.setAttribute('aria-expanded', 'false'); drawerToggle.innerHTML = '<span aria-hidden="true">☰</span>';
  drawerToggle.addEventListener('click', () => { const open = !shell.classList.contains('sidebar-open'); setDrawer(open); drawerToggle.setAttribute('aria-expanded', String(open)); drawerToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); });
  [drawerToggle, search, reset].forEach(button => { if (button) topActions.append(button); });
  tools.append(title, topActions);
  const mobileMenu = $('mobileMenuToggle');
  oldHeader.replaceChildren(tools);
  if (mobileMenu) { mobileMenu.hidden = true; }
  theme?.setAttribute('title', 'Toggle color theme');
  const skipLink = document.querySelector('.skip-link');
  function updateSkipLink() { if (skipLink) skipLink.href = shell.hidden ? '#loginTitle' : '#mainContent'; }
  updateSkipLink(); document.addEventListener('authchange', updateSkipLink);

  const backdrop = document.createElement('button'); backdrop.type = 'button'; backdrop.className = 'sidebar-backdrop'; backdrop.setAttribute('aria-label', 'Close navigation');
  sidebar.after(backdrop);
  const userName = () => $('authProfileLabel')?.textContent?.trim() || 'local';
  const stateKey = () => `fuji-sidebar-collapsed-v1:${userName().toLowerCase()}`;
  try { if (localStorage.getItem(stateKey()) === '1') shell.classList.add('sidebar-collapsed'); } catch {}
  collapse.addEventListener('click', () => {
    shell.classList.toggle('sidebar-collapsed');
    const isCollapsed = shell.classList.contains('sidebar-collapsed');
    collapse.textContent = isCollapsed ? '›' : '‹';
    collapse.title = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
    collapse.setAttribute('aria-label', collapse.title);
    try { localStorage.setItem(stateKey(), isCollapsed ? '1' : '0'); } catch {}
  });
  const setDrawer = open => { shell.classList.toggle('sidebar-open', open); backdrop.hidden = !open; };
  let settingsReturnPanel = null;
  sidebar.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    if (settingsPage && !settingsPage.hidden && button !== settings) {
      settingsPage.hidden = true;
      const moduleNavigation = ['homeNav','countSheetNav','cigarsNav','shelfTagNav','productLookupNav','masterlistNav','announcementsNav','hotlistNav','creditsBtn'].includes(button.id);
      if (!moduleNavigation && settingsReturnPanel) settingsReturnPanel.hidden = false;
      settingsReturnPanel = null;
    }
    if (matchMedia('(max-width: 899px)').matches && button !== collapse) setDrawer(false);
    setTimeout(() => updateHeading(), 0);
  }));
  designLink.addEventListener('click', () => { if (matchMedia('(max-width: 899px)').matches) setDrawer(false); });
  backdrop.hidden = true; backdrop.addEventListener('click', () => setDrawer(false));
  addEventListener('keydown', event => { if (event.key === 'Escape') setDrawer(false); });
  addEventListener('resize', () => { if (!matchMedia('(max-width: 899px)').matches) setDrawer(false); });

  const settingsHub = document.querySelector('#modalBackdrop .settings-hub');
  const settingsPage = document.createElement('div'); settingsPage.id = 'settingsPage'; settingsPage.className = 'settings-page-screen'; settingsPage.hidden = true;
  settingsPage.setAttribute('aria-labelledby', 'settingsTitle');
  if (settingsHub) {
    main.prepend(settingsPage); settingsPage.append(settingsHub);
    settingsHub.classList.add('settings-page-layout'); settingsHub.setAttribute('role', 'region'); settingsHub.removeAttribute('aria-modal');
  }
  function closeSettingsPage() { if (settingsPage) settingsPage.hidden = true; if (settingsReturnPanel) settingsReturnPanel.hidden = false; settingsReturnPanel = null; updateHeading(); }
  settings?.addEventListener('click', event => { event.preventDefault(); $('modalBackdrop').hidden = true; settingsReturnPanel = [...main.children].find(section => section.matches?.('section') && !section.hidden) || null; if (settingsReturnPanel) settingsReturnPanel.hidden = true; settingsPage.hidden = false; document.querySelector('.settings-tab.active')?.focus(); updateHeading(); });
  $('closeModal')?.addEventListener('click', closeSettingsPage);
  $('saveSettings')?.addEventListener('click', closeSettingsPage);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && settingsPage && !settingsPage.hidden) { closeSettingsPage(); settings?.focus(); } });

  function updateHeading() {
    const current = document.querySelector('#primaryNavigation [aria-current="page"]');
    const activePanel = [...main.children].find(section => section.matches('section') && !section.hidden);
    const heading = settingsPage && !settingsPage.hidden ? 'Settings' : (activePanel?.querySelector('h1')?.textContent?.trim() || current?.querySelector('span')?.textContent?.trim() || 'Home');
    const h1 = $('currentPageTitle'); if (h1) h1.textContent = heading;
    const storeInput = $('storeField'); const storeName = $('settingsStoreName')?.value || storeInput?.value;
    const storeLabel = $('sidebarStoreName'); if (storeLabel) storeLabel.textContent = storeName?.trim() || 'Current store';
  }
  document.querySelectorAll('#primaryNavigation button').forEach(button => button.addEventListener('click', () => setTimeout(updateHeading, 0)));
  document.querySelectorAll('[data-home-open]').forEach(button => button.addEventListener('click', () => setTimeout(updateHeading, 0)));
  $('saveSettings')?.addEventListener('click', () => setTimeout(updateHeading, 0));
  addEventListener('storage', updateHeading); updateHeading();

  function renderHomeOperations(announcements = null) {
    const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
    const history = read('fuji-cycle-count-local-history-v1');
    const current = read('fuji-cycle-count-local-data-v1') || {};
    const summary = $('dataSummary')?.textContent || '';
    const countMatch = summary.match(/(\d+) inventory rows/);
    const rows = Number(countMatch?.[1] || $('homeItemCount')?.textContent || (Array.isArray(current.items) ? current.items.length : 0));
    const pending = $('homePendingPrint'); const pendingDetail = $('homePendingPrintDetail');
    if (pending) pending.textContent = rows ? `Count sheet · ${rows.toLocaleString()} rows` : 'No count sheet prepared';
    if (pendingDetail) pendingDetail.textContent = rows ? ($('printSheetBtn')?.disabled ? 'Inventory loaded; continue through validation and layout.' : 'Ready for print preview and supplier review.') : 'Import an inventory file to start a count workflow.';
    const imports = Array.isArray(history) ? history.filter(item => item.action === 'Inventory imported') : [];
    if ($('homeRecentImports')) $('homeRecentImports').textContent = imports.length ? imports[0].details?.split(' · ')[0] || 'Recent workbook' : 'No recent imports';
    if ($('homeRecentImportsDetail')) $('homeRecentImportsDetail').textContent = imports.length ? `${imports.length} saved import${imports.length === 1 ? '' : 's'} · ${new Date(imports[0].time).toLocaleDateString()}` : 'Imports saved in this browser will appear here.';
    const storeName = $('storeField')?.value?.trim();
    if ($('homeOpenSessions')) $('homeOpenSessions').textContent = rows ? (storeName || 'Count session open') : (storeName ? storeName : 'No active session');
    if ($('homeOpenSessionsDetail')) $('homeOpenSessionsDetail').textContent = rows ? `${$('dateField')?.value || 'Date not set'} · ${rows.toLocaleString()} rows in this browser` : 'Store and date details are kept in this browser.';
    if (announcements && $('homeAnnouncements')) {
      $('homeAnnouncements').textContent = announcements.length ? `${announcements.length} update${announcements.length === 1 ? '' : 's'}` : 'No new announcements';
      $('homeAnnouncementsDetail').textContent = announcements.length ? `Latest: ${announcements[0].title || 'Workspace update'}` : 'Workspace notices from your administrator.';
    }
    const sidebarStore = $('sidebarStoreName'); if (sidebarStore) sidebarStore.textContent = storeName || $('settingsStoreName')?.value?.trim() || 'Current store';
  }
  renderHomeOperations();
  document.addEventListener('announcements-updated', event => renderHomeOperations(event.detail?.announcements || []));
  document.addEventListener('authchange', () => renderHomeOperations());
  document.querySelectorAll('#primaryNavigation button,[data-home-open="countSheetNav"]').forEach(button => button.addEventListener('click', () => setTimeout(renderHomeOperations, 50)));
  $('storeField')?.addEventListener('change', () => renderHomeOperations());

  const helpDialog = document.createElement('dialog');
  helpDialog.id = 'helpAssistantDialog'; helpDialog.className = 'help-assistant-dialog'; helpDialog.setAttribute('aria-labelledby', 'helpAssistantTitle');
  helpDialog.innerHTML = '<header><div><p class="section-kicker">OFFLINE HELP + OPTIONAL AI</p><h2 id="helpAssistantTitle">How can we help?</h2></div><button type="button" class="help-close" aria-label="Close help">×</button></header><p class="help-intro">Search device help, or ask an online AI provider after enabling consent in Settings. Inventory is never sent by this assistant.</p><label class="help-search-label" for="helpAssistantSearch">Search help topics</label><input id="helpAssistantSearch" type="search" placeholder="Try “import”, “print”, or “SKU”" autocomplete="off"><div class="help-suggestions"><button type="button">How do I import a file?</button><button type="button">Why were rows flagged?</button><button type="button" data-feedback-open>Report a problem</button></div><div id="helpAssistantResults" class="help-results" aria-live="polite"></div><section class="help-ai-panel"><h3>Ask FUJI</h3><label for="helpAiQuestion">Question for the AI assistant</label><textarea id="helpAiQuestion" rows="2" maxlength="3000" placeholder="Ask about importing, grouping, or count practices"></textarea><div class="help-ai-actions"><button type="button" class="primary-button" id="helpAiAsk">Ask FUJI</button><button type="button" class="secondary-button" id="helpAiStop" hidden>Stop</button><span id="helpAiStatus" role="status" aria-live="polite">Enable AI question sharing in Settings to start.</span></div><div id="helpAiAnswer" class="help-ai-answer" aria-live="polite"></div></section><footer><small>Offline guide searches stay on this device. Online AI receives your typed question and recent chat only.</small><button type="button" class="secondary-button" id="helpFeedbackButton">Submit feedback</button></footer>';
  document.body.append(helpDialog);
  const docs = [
    ['Import a count sheet','import spreadsheet CSV Excel columns SKU UPC description quantity vendor','1. Choose Count Sheet. 2. Select Import inventory and choose a CSV or Excel workbook. 3. Match the SKU, description, quantity, and supplier columns, then review the imported row count. Keep a backup of your original file.'],
    ['Locator prefixes','locator SA- BA- WH- unassigned supplier','Use SA-, BA-, or WH- prefixes to identify locator groups. Rows without a recognized locator remain unassigned. Correct the locator on the row before generating the print layout.'],
    ['Validation errors and fixes','validation errors warnings missing SKU UPC quantity fix rows','Review the highlighted row and correct its SKU, product description, quantity, or locator in the imported data. Check whether spreadsheet headers were mapped to the right columns, then re-import if the source columns are incorrect.'],
    ['CCD and department filters','CCD department filter masterlist','Open Masterlist and use the CCD or department filters to narrow the uploaded workbook. Clear a filter to show all matching records.'],
    ['Print modes and paper','print count sheet paper margins landscape letter legal preview PDF','Open Configure Layout to choose the print layout, paper size, orientation, and margins. Generate the preview and inspect page breaks before printing. Print preview uses a light paper style regardless of the workspace theme.'],
    ['Export a PDF','PDF export save print count sheet','Generate the count sheet, then choose Export PDF or Print and select Save as PDF in the browser print dialog. Verify paper size and orientation before saving.'],
    ['Print status','print status suppliers printed reset count sheet','Use the supplier print status controls in the generated count sheet. Printed status is kept in the local browser session; confirm the selected supplier before resetting status.'],
    ['Shelf Tag','shelf tag price barcode promo print','Open Shelf Tag, choose the tag format, add product and price information, then preview and print. Check barcode readability and physical paper dimensions before printing a full batch.'],
    ['Product Lookup','product lookup search SKU UPC barcode description','Open Product Lookup and search by SKU, barcode/UPC, or product description. Try a shorter description if the full name returns no results.'],
    ['Masterlist','masterlist workbook upload CCD department vendor','Open Masterlist and import your workbook. Search or filter the displayed rows by CCD, department, SKU, and vendor. Workbook data is read in this browser.'],
    ['Cigarette Monitor','cigarette monitor selling workbook expiry daily stock','Open Cigarette Monitor to import the SELLING workbook and record daily stock figures. Expiry Lookup accepts supported JTI or PMFTC batch codes. Check the local guide or supervisor for uncertain codes.'],
    ['Roles and permissions','role permissions administrator supervisor sign in','The current app supports local browser sign-in and optional Firebase online authentication. Available controls depend on the signed-in account. Ask your administrator to grant access if a control is unavailable.'],
    ['Offline and sync','offline sync cloud data browser local workspace','Count-sheet and monitoring data can be stored in the current browser. Local changes do not automatically sync to other devices. Online accounts require Firebase configuration.'],
    ['Backup and restore','backup restore JSON settings data','Open Settings, choose Data Management, and download a JSON backup. Store it securely. Use Restore backup in the same section to load a saved backup.'],
    ['Troubleshooting','troubleshoot reload browser file import print','If a tool stalls, keep a backup, reload the page, and retry with a copy of the source file. If printing looks different, verify paper size, orientation, margins, and the browser print scale. Submit feedback with the module and steps to reproduce.']
  ];
  const helpResults = $('helpAssistantResults'); const helpInput = $('helpAssistantSearch');
  function showHelp(query = '') {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = docs.map(([title, keywords, answer]) => ({ title, answer, score: terms.reduce((score, term) => score + (title.toLowerCase().includes(term) ? 4 : 0) + (keywords.toLowerCase().includes(term) ? 2 : 0) + (answer.toLowerCase().includes(term) ? 1 : 0), 0) })).filter(item => !terms.length || item.score > 0).sort((a,b) => b.score - a.score).slice(0, 5);
    helpResults.replaceChildren();
    if (!scored.length) { const p = document.createElement('p'); p.className = 'help-empty'; p.textContent = 'No matching help articles. Try a shorter search or send feedback to your administrator.'; helpResults.append(p); return; }
    scored.forEach(item => { const card = document.createElement('article'); card.className = 'help-result-card'; const h = document.createElement('h3'); h.textContent = item.title; const p = document.createElement('p'); p.textContent = item.answer; const helpful = document.createElement('div'); helpful.className = 'helpful-vote'; const label = document.createElement('span'); label.textContent = 'Was this helpful?'; const yes = document.createElement('button'); yes.textContent = 'Yes'; const no = document.createElement('button'); no.textContent = 'No'; [yes,no].forEach(btn => btn.addEventListener('click', () => { label.textContent = 'Thanks for your feedback.'; yes.disabled = no.disabled = true; })); helpful.append(label,yes,no); card.append(h,p,helpful); helpResults.append(card); });
  }
  showHelp(); $('helpAssistantTrigger')?.addEventListener('click', () => { helpDialog.showModal(); helpInput.focus(); });
  helpDialog.querySelector('.help-close').addEventListener('click', () => helpDialog.close());
  helpInput.addEventListener('input', () => showHelp(helpInput.value));
  const aiMessagesByUser = new Map(); let aiAbort = null;
  const aiConsentEnabled = () => { try { return JSON.parse(localStorage.getItem('cycle-count-workspace-settings-v1') || '{}').aiSharingConsent === true; } catch { return false; } };
  const aiMessages = () => { const id=window.fujiCurrentUser?.id||'anonymous'; if(!aiMessagesByUser.has(id))aiMessagesByUser.set(id,[]); return aiMessagesByUser.get(id); };
  const aiQuestion=$('helpAiQuestion'), aiAnswer=$('helpAiAnswer'), aiStatus=$('helpAiStatus'), aiAsk=$('helpAiAsk'), aiStop=$('helpAiStop');
  aiAsk.addEventListener('click',async()=>{
    const question=aiQuestion.value.trim(); const auth=window.fujiFirebase?.auth; const user=auth?.currentUser;
    if(!aiConsentEnabled()){aiStatus.textContent='Enable AI question sharing in Settings first.';return;}
    if(!user){aiStatus.textContent='Sign in with an online account to use Ask FUJI.';return;}
    if(!question){aiStatus.textContent='Enter a question first.';return;}
    const history=aiMessages();history.push({role:'user',content:question});while(history.length>12)history.shift();
    const responseNode=document.createElement('p');responseNode.className='help-ai-response';responseNode.textContent='';aiAnswer.append(responseNode);aiStatus.textContent='FUJI is thinking…';aiAsk.disabled=true;aiStop.hidden=false;aiAbort=new AbortController();
    try{
      const token=await user.getIdToken();const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({messages:history,consent:true}),signal:aiAbort.signal});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Ask FUJI is unavailable. Offline help remains available.');}
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',answer='';
      while(true){const{value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines)if(line.startsWith('data: ')&&line!=='data: [DONE]'){try{const part=JSON.parse(line.slice(6)).text||'';answer+=part;responseNode.textContent=answer}catch{}}}
      history.push({role:'assistant',content:answer});while(history.length>12)history.shift();aiStatus.textContent='Answer complete. Your question and answer remain in this session.';
    }catch(error){responseNode.textContent=error.name==='AbortError'?'Response stopped.':error.message;aiStatus.textContent='';}
    finally{aiAbort=null;aiAsk.disabled=false;aiStop.hidden=true;}
  });
  aiStop.addEventListener('click',()=>aiAbort?.abort());
  helpDialog.querySelectorAll('.help-suggestions button:not([data-feedback-open])').forEach(button => button.addEventListener('click', () => { helpInput.value = button.textContent; showHelp(helpInput.value); helpInput.focus(); }));
  const feedback = document.createElement('dialog'); feedback.id='localFeedbackDialog'; feedback.className='help-assistant-dialog feedback-dialog'; feedback.setAttribute('aria-labelledby','feedbackTitle'); feedback.innerHTML='<header><div><p class="section-kicker">LOCAL DRAFT</p><h2 id="feedbackTitle">Send feedback</h2></div><button type="button" class="help-close" aria-label="Close feedback">×</button></header><p class="help-intro">This static site has no shared feedback database. Save a draft on this device to review and share with your administrator.</p><form id="feedbackDraftForm"><label>Type<select name="type"><option>Bug</option><option>Idea</option><option>Question</option></select></label><label>Title<input name="title" maxlength="120" required></label><label>Details<textarea name="description" maxlength="2000" rows="5" required></textarea></label><p class="feedback-status" role="status"></p><div class="feedback-actions"><button type="button" class="secondary-button help-cancel">Cancel</button><button type="submit" class="primary-button">Save draft</button></div></form>';
  document.body.append(feedback);
  const openFeedback = () => { const q = helpInput.value.trim(); const desc = feedback.querySelector('[name="description"]'); if (q && !desc.value) desc.value = `Help question: ${q}\n\nWhat happened? `; helpDialog.close(); feedback.showModal(); };
  $('helpFeedbackButton').addEventListener('click', openFeedback); helpDialog.querySelector('[data-feedback-open]').addEventListener('click', openFeedback);
  feedback.querySelector('.help-close').addEventListener('click', () => feedback.close()); feedback.querySelector('.help-cancel').addEventListener('click', () => feedback.close());
  feedback.querySelector('form').addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const drafts = JSON.parse(localStorage.getItem('fuji-feedback-drafts-v1') || '[]'); drafts.push({ ...data, createdAt: new Date().toISOString(), module: $('currentPageTitle')?.textContent || 'Help' }); localStorage.setItem('fuji-feedback-drafts-v1', JSON.stringify(drafts)); feedback.querySelector('.feedback-status').textContent = 'Draft saved in this browser. Share it with your administrator to submit.'; event.currentTarget.reset(); });
  document.querySelectorAll('#utilityNavigation button').forEach(button => button.addEventListener('click', () => { if (matchMedia('(max-width: 899px)').matches) setDrawer(false); }));

  const searchDialog = $('siteSearchDialog'); const searchInput = $('siteSearchInput'); const searchResults = $('siteSearchResults');
  const commands = [
    { title: 'Go to Home', terms: 'home dashboard navigate', run: () => $('homeNav')?.click() },
    { title: 'Go to Count Sheet', terms: 'count sheet navigate inventory', run: () => $('countSheetNav')?.click() },
    { title: 'Go to Shelf Tag', terms: 'shelf tag navigate price label', run: () => $('shelfTagNav')?.click() },
    { title: 'Go to Product Lookup', terms: 'product lookup navigate search sku', run: () => $('productLookupNav')?.click() },
    { title: 'Go to Masterlist', terms: 'masterlist navigate workbook', run: () => $('masterlistNav')?.click() },
    { title: 'Go to Cigarette Monitor', terms: 'cigarette monitor navigate', run: () => $('cigarsNav')?.click() },
    { title: 'Import a file', terms: 'import upload file csv excel', run: () => { $('countSheetNav')?.click(); setTimeout(() => $('fileInput')?.click(), 100); } },
    { title: 'Generate count sheet preview', terms: 'generate preview layout count sheet', run: () => { $('countSheetNav')?.click(); setTimeout(() => { if ($('generateBtn')?.disabled !== true) $('generateBtn')?.click(); else $('fileInput')?.click(); }, 100); } },
    { title: 'Print the count sheet', terms: 'print printer count sheet', run: () => { $('countSheetNav')?.click(); setTimeout(() => { if (!$('printSheetBtn')?.disabled) $('printSheetBtn')?.click(); else $('fileInput')?.click(); }, 100); } },
    { title: 'Export count sheet PDF', terms: 'export pdf count sheet', run: () => { $('countSheetNav')?.click(); setTimeout(() => { if (!$('exportSheetBtn')?.disabled) $('exportSheetBtn')?.click(); else $('fileInput')?.click(); }, 100); } },
    { title: 'Open Settings', terms: 'settings preferences account', run: () => $('settingsBtn')?.click() },
    { title: 'Submit feedback', terms: 'feedback report problem idea', run: () => $('helpFeedbackButton')?.click() }
  ];
  function addCommands() {
    if (!searchResults || !searchDialog?.open) return;
    const query = (searchInput?.value || '').trim().toLowerCase();
    const matched = commands.filter(item => !query || `${item.title} ${item.terms}`.toLowerCase().includes(query));
    matched.slice(0, 8).reverse().forEach(item => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'site-search-result command-result';
      const heading = document.createElement('strong'); heading.textContent = item.title;
      const detail = document.createElement('small'); detail.textContent = 'Command · Enter to run'; button.append(heading, detail);
      button.addEventListener('click', () => { searchDialog.close(); item.run(); }); searchResults.prepend(button);
    });
  }
  $('siteSearchTrigger')?.addEventListener('click', () => setTimeout(addCommands, 0));
  searchInput?.addEventListener('input', () => setTimeout(addCommands, 0));
  const shortcutDialog = document.createElement('dialog'); shortcutDialog.className = 'help-assistant-dialog shortcut-dialog'; shortcutDialog.setAttribute('aria-labelledby', 'shortcutTitle');
  shortcutDialog.innerHTML = '<header><div><p class="section-kicker">KEYBOARD SHORTCUTS</p><h2 id="shortcutTitle">Quick navigation</h2></div><button type="button" class="help-close" aria-label="Close shortcuts">×</button></header><div class="shortcut-list"><p><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd><span>Open search and commands</span></p><p><kbd>?</kbd><span>Show keyboard shortcuts</span></p><p><kbd>Esc</kbd><span>Close dialogs or mobile navigation</span></p></div>';
  document.body.append(shortcutDialog);
  shortcutDialog.querySelector('.help-close').addEventListener('click', () => shortcutDialog.close());
  document.addEventListener('keydown', event => { if (event.key === '?' && !event.ctrlKey && !event.metaKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) && !document.querySelector('dialog[open]')) shortcutDialog.showModal(); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('/service-worker.js').catch(error => console.warn('Offline shell could not be registered:', error));
})();
