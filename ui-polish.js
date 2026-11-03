/* Presentation and accessible labels only. Inventory and workflow state stay in their existing modules. */
(() => {
  const $ = id => document.getElementById(id);
  const ns = 'http://www.w3.org/2000/svg';
  function icon(name) {
    const data = window.FujiLucideIcons[name] || window.FujiLucideIcons.Info;
    function build([tag, attrs, children = []]) {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      children.forEach(child => node.append(build(child)));
      return node;
    }
    const svg = build(data);
    svg.setAttribute('class', 'ui-icon'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false'); svg.setAttribute('stroke-width', '1.75');
    return svg;
  }
  const navIcons = {homeNav:'Home',countSheetNav:'FileText',cigarsNav:'Cigarette',shelfTagNav:'Tag',productLookupNav:'ScanBarcode',masterlistNav:'Database',hotlistNav:'Flame',announcementsNav:'Megaphone',settingsBtn:'SlidersHorizontal',creditsBtn:'CircleHelp',authProfileBtn:'User',authHeaderLogoutBtn:'LogOut',siteSearchTrigger:'Search',resetBtn:'RotateCcw',helpAssistantTrigger:'CircleHelp'};
  const names = {shelfTagNav:'Shelf Tags',announcementsNav:'Announcements',creditsBtn:'About us'};
  Object.entries(navIcons).forEach(([id,name]) => {
    const button = $(id); if (!button) return;
    button.querySelector('svg,[aria-hidden="true"]')?.remove();
    if (id === 'hotlistNav') { button.textContent = ''; const span = document.createElement('span'); span.textContent = 'Hotlist'; button.append(span); }
    button.prepend(icon(name));
    if (names[id]) button.querySelector('span:last-child').textContent = names[id];
    button.title = button.getAttribute('aria-label') || button.textContent.trim();
  });
  const workflows = [
    ['count','FileText','Count Sheet','Import a workbook, check variances, and print clean count sheets.'],
    ['cigars','Cigarette','Cigarette Monitor','Track cigarette stock and movement.'],
    ['shelf','Tag','Shelf Tags','Print yellow retail price tags and white shelf tags.'],
    ['lookup','ScanBarcode','Product Lookup','Find any SKU by name, code, or barcode.'],
    ['masterlist','Database','Masterlist','Browse the full item masterlist.'],
    ['hotlist','Flame','Hotlist','Keep priority SKUs in one place.'],
    ['updates','Megaphone','Announcements','Notices and updates for the team.']
  ];
  const cards = document.querySelector('.home-feature-grid');
  workflows.forEach(([key,name,title,copy]) => {
    const card = document.querySelector(`.home-feature-${key}`); if (!card) return;
    card.querySelector('.home-feature-icon').replaceChildren(icon(name));
    card.querySelector('h3').textContent = title; card.querySelector('p').textContent = copy;
    card.querySelector('.home-feature-index')?.remove(); cards.append(card);
    card.classList.add('ui-workflow-enter');card.addEventListener('animationend',()=>card.classList.remove('ui-workflow-enter'),{once:true});
  });
  const overview=document.createElement('ol');overview.className='ui-count-overview';
  [['FileText','Import your workbook'],['ListChecks','Review inventory'],['Printer','Configure and print']].forEach(([name,label])=>{const li=document.createElement('li');li.append(icon(name),label);overview.append(li)});
  document.querySelector('.home-feature-count p').after(overview);
  document.querySelectorAll('.home-stat-icon').forEach((node,i) => node.replaceChildren(icon(['Database','ListChecks','Clock'][i])));
  // Keep the original logo and name nodes so Settings continues to update them.
  const loginBrand = document.querySelector('.login-brand');
  if (loginBrand) document.querySelector('.login-visual').prepend(loginBrand);
  const skip = document.querySelector('.skip-link');
  function skipTarget() {
    const loggedOut = $('appShell').hidden;
    const main = loggedOut ? $('loginPage') : $('mainContent');
    main.tabIndex = -1; skip.href = `#${main.id}`;
  }
  document.addEventListener('authchange', skipTarget); skipTarget();
  $('loginTitle').parentElement.querySelector('p:last-child').textContent = 'Sign in to open your count workspace.';
  const copy = new Map([
    ['Sign In Online','Sign in'],['Open Device Workspace','Sign in on this device'],['Sign In Locally','Sign in on this device'],
    ['Local Machine Login','This device'],['Online Cloud Login','Cloud account'],['Log Out','Log out'],
    ['Shelftag / PP Tag Printing Workflow','Shelf Tags'],['Cigarette monitoring','Cigarette Monitor'],
    ['Masterlist View','Masterlist'],['Choose Mode','Choose mode'],['Change Mode','Change mode'],
    ['Generate Preview','Generate preview'],['Configure Layout','Configure layout'],['Validate & Edit','Validate and edit'],
    ['DEC v2.0.7','v2.0.7'],['No inventory rows match your search.','No items match this view. Clear the search to see all inventory.'],
    ['No items match this view.','No items match this view. Clear the search or choose All items.'],
    ['Could not load updates. Check your connection or contact an administrator.','Could not load announcements. Check your connection, then open Announcements again.']
  ]);
  const symbolNames = {'↑':'Upload','↥':'Upload','↓':'Download','⬇':'Download','⇩':'Download','⌕':'Search','▦':'FileText','▤':'Tag','▥':'Database','▧':'Megaphone','◉':'Cigarette','◷':'Clock','⌁':'Clipboard','＋':'Plus','+':'Plus','×':'X','✕':'X','✖':'X','✓':'Check','✔':'Check','⚠':'CircleAlert','⎙':'Printer','☰':'Menu','↗':'ArrowUpRight','→':'ArrowRight','←':'ArrowLeft','‹':'ChevronLeft','›':'ChevronRight','⌄':'ChevronDown','✉':'Mail','✦':'Info','★':'Info','…':'Info'};
  symbolNames['↻']='RotateCcw';symbolNames['↺']='RotateCcw';
  Object.assign(symbolNames,{'✎':'Pencil','✳':'Info','⚙':'SlidersHorizontal','🥛':'Milk','🚬':'Cigarette','🍾':'Wine'});
  const symbols = /[↑↥↓⬇⇩⌕▦▤▥▧◉◷⌁＋✕✖✓✔⚠⎙☰↗→←‹›⌄✉✦★↻↺✎✳⚙]|\p{Extended_Pictographic}(?:\uFE0F)?/gu;
  const paper = '.spr-sheet,.reference-sheet,.count-sheet-page,.count-tag,.shelf-print-sheet,.tag-sheet,.spr-measurement';
  function replaceText(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(`svg,script,style,textarea,option,code,pre,${paper}`)) return;
    // Product data and audit entries are content, not icons.
    if (parent.closest('td,#countEntryAuditList') && !parent.closest('button,.count-entry-status')) return;
    const trimmed = node.data.trim();
    if (copy.has(trimmed)) { node.data = node.data.replace(trimmed,copy.get(trimmed)); return; }
    if (/^[+×…]$/.test(trimmed) && parent.closest('button')) {
      const name = symbolNames[trimmed]; parent.setAttribute('aria-label',parent.getAttribute('aria-label') || parent.title || ({Plus:'Add item',X:'Close',Info:'More actions'}[name]));
      node.replaceWith(icon(name)); return;
    }
    if (trimmed === 'i' && parent.matches('.note-icon')) { node.replaceWith(icon('Info')); return; }
    if (trimmed === '?' && parent.matches('[aria-hidden="true"]')) { node.replaceWith(icon('CircleHelp')); return; }
    if (!symbols.test(node.data)) { symbols.lastIndex = 0; return; } symbols.lastIndex = 0;
    const fragment = document.createDocumentFragment(); let start = 0;
    for (const match of node.data.matchAll(symbols)) {
      fragment.append(node.data.slice(start,match.index));
      let name = symbolNames[match[0]] || 'Info';
      if (parent.closest('#backToTop')) name = 'ArrowUp';
      else if (parent.closest('[data-master-sort]')) name = match[0]==='↑'?'ArrowUp':'ArrowDown';
      else if (/download|export/i.test(parent.closest('button,a')?.textContent || '')) name = 'Download';
      fragment.append(icon(name)); start = match.index + match[0].length;
    }
    fragment.append(node.data.slice(start)); node.replaceWith(fragment);
  }
  function decorate(root) {
    if (root.nodeType === Node.TEXT_NODE) { replaceText(root); return; }
    if (!root.querySelectorAll || root.closest?.(`svg,${paper}`)) return;
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceText);
    root.querySelectorAll('button svg:not(.ui-icon),a svg:not(.ui-icon)').forEach(svg=>{
      if(svg.closest(paper))return;
      const button=svg.closest('button,a'),label=`${button.id} ${button.getAttribute('aria-label')||''} ${button.textContent}`;
      const matches=[[/close|cancel/i,'X'],[/print/i,'Printer'],[/download|export/i,'Download'],[/upload|import/i,'Upload'],[/search/i,'Search'],[/reset/i,'RotateCcw'],[/settings/i,'SlidersHorizontal'],[/delete/i,'Trash2'],[/edit/i,'Pencil'],[/copy/i,'Copy'],[/external|visit/i,'ArrowUpRight'],[/back|previous/i,'ArrowLeft'],[/login|sign in|next/i,'ArrowRight']];
      svg.replaceWith(icon(matches.find(([pattern])=>pattern.test(label))?.[1]||'ChevronDown'));
    });
  }
  const controlIcons = {chooseFile:'Upload',uploadSprCountSheet:'Upload',downloadSprExcelTemplate:'Download',downloadSprCsvTemplate:'Download',printSprCountSheet:'Printer',exportSprCountSheet:'Download',sampleBtn:'Download',uploadManualCountSheetBtn:'Upload',printImportedCountSheetBtn:'Printer',exportImportedCountSheetBtn:'Download',printSheetBtn:'Printer',exportSheetBtn:'Download',exportCountReport:'Download',printCountReport:'Printer',sprResetLayout:'RotateCcw',sprDeletePreset:'Trash2'};
  Object.entries(controlIcons).forEach(([id,name]) => { const button = $(id); if (button) { button.replaceChildren(document.createTextNode(button.textContent.replace(/[↓⎙↑]/g,'').trim())); button.prepend(icon(name),' '); } });
  document.querySelector('.store-switcher-mark')?.replaceWith(icon('Database'));
  $('chooseSprCountSheetMode').title = 'SPR mode: upload SKU, barcode, and description for a portrait count sheet. No locator or CCD required.';
  $('sprCountSheetHeading').title = $('chooseSprCountSheetMode').title;
  document.querySelector('[data-shelf-type="yellow"]')?.setAttribute('title','PP tag: the yellow retail price tag format.');
  // Existing actions remain available; only one is visually primary in each step.
  ['countSheetBtn','goGenerate','printImportedCountSheetBtn'].forEach(id => $(id)?.classList.add('ui-secondary-action'));
  $('countSheetBtn').classList.add('ui-duplicate-preview');
  $('emptyState')?.classList.add('ui-empty'); $('countEntryEmpty')?.classList.add('ui-empty');
  const summary = document.createElement('div'); summary.className = 'ui-count-metrics'; summary.setAttribute('aria-label','Count summary');
  document.querySelector('.count-entry-summary').prepend(summary);
  function refreshSummary() {
    const session = window.fujiGetActiveCountSession?.(); const totals = window.fujiGetCountSummary?.();
    summary.hidden = !session; if (!session) return;
    // Read quantities already calculated by the count engine; never write to the session.
    const entries = session.entries || [];
    const values = [['Items',totals.total],['Matched',totals.matched],['Short',entries.filter(e=>e.variance!==null&&e.variance<0).length],['Over',entries.filter(e=>e.variance!==null&&e.variance>0).length],['Net variance',entries.reduce((n,e)=>n+(Number(e.variance)||0),0)]];
    summary.replaceChildren(...values.map(([label,value])=>{ const box=document.createElement('div'),name=document.createElement('small'),number=document.createElement('strong'); name.textContent=label;number.textContent=String(value);box.append(name,number);return box; }));
  }
  document.addEventListener('count-session-updated',refreshSummary); refreshSummary();
  // The count toolbar precedes the table, with the existing summary above it.
  document.querySelector('.count-entry-summary').after(document.querySelector('.count-entry-session-toolbar'));
  const stepList = document.createElement('ol'); stepList.className = 'ui-workflow-progress'; stepList.setAttribute('aria-label','Count sheet workflow');
  ['Import Excel','Validate and edit','Configure layout'].forEach((text,index)=>{const li=document.createElement('li'),span=document.createElement('span');span.textContent=String(index+1);li.append(span,text);stepList.append(li)});
  $('countEntryPanel').querySelector('header').after(stepList);
  function refreshPresentation() {
    if (!$('homePanel').hidden && $('currentPageTitle').textContent !== 'Home') $('currentPageTitle').textContent = 'Home';
    const dark = document.documentElement.dataset.theme === 'dark';
    const theme = $('themeToggle'); const themeSvg = theme.querySelector('svg');
    if (themeSvg?.dataset.themeIcon !== String(dark)) { const svg=icon(dark?'Sun':'Moon');svg.dataset.themeIcon=String(dark);themeSvg?.remove();theme.prepend(svg); }
    document.querySelectorAll('.count-entry-status').forEach(status=>{
      if (status.querySelector('svg')) return;
      const entry = window.fujiGetActiveCountSession?.()?.entries.find(e=>e.id===status.closest('tr').dataset.entryId);
      if (status.dataset.status==='recount' && entry?.variance) { const original=document.createElement('span'),visual=document.createElement('span');status.title=status.textContent;original.className='ui-status-original';original.textContent=status.textContent;visual.className='ui-status-visual';visual.textContent=entry.variance<0?'Short':'Over';status.dataset.uiVariance=entry.variance<0?'short':'over';status.replaceChildren(original,visual); }
      status.prepend(icon(status.dataset.status==='matched'?'Check':'CircleAlert'));
    });
    const pager=$('countEntryPageLabel')?.parentElement;
    pager?.classList.toggle('ui-pagination-single',/Page 1 of 1\s*$/.test($('countEntryPageLabel').textContent));
    $('masterlistPageLabel')?.parentElement.classList.toggle('ui-pagination-single',/Page 1 of 1\s*$/.test($('masterlistPageLabel').textContent));
    document.querySelectorAll('.other-sheet-pagination').forEach(p=>p.classList.toggle('ui-pagination-single',/Page 1 of 1/.test(p.textContent)));
    const currentStep = $('countEntryPanel').hidden ? 0 : 1;
    [...stepList.children].forEach((li,index)=>{ li.dataset.state=index<currentStep?'done':index===currentStep?'current':'upcoming';if(index===currentStep)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');if(index<currentStep&&!li.querySelector('svg'))li.querySelector('span').replaceChildren(icon('Check')); });
    const heading=$('confirmHeading'),accept=$('confirmAccept');
    const actions=[[/delete/i,'Delete'],[/clear/i,'Clear'],[/reset/i,'Reset'],[/replace/i,'Replace'],[/log out|sign out/i,'Log out']];
    const action=actions.find(([pattern])=>pattern.test(`${heading.textContent} ${$('confirmMessage').textContent}`));
    const label=action?.[1]||'Continue';if(accept.textContent!==label)accept.textContent=label;
    document.querySelectorAll('[aria-busy="true"] .primary-button').forEach(button=>{ if(!button.querySelector('.ui-loading-icon')){const svg=icon('LoaderCircle');svg.classList.add('ui-loading-icon');button.prepend(svg);} });
    document.querySelectorAll('.ui-loading-icon').forEach(svg=>{if(!svg.closest('[aria-busy="true"]'))svg.remove();});
  }
  decorate(document.body); refreshPresentation();
  let scheduled = false;
  const observer = new MutationObserver(records=>{
    observer.disconnect();
    records.forEach(record=>{if(record.type==='characterData')replaceText(record.target);record.addedNodes.forEach(decorate);});
    observe();
    if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;observer.disconnect();refreshPresentation();observe();});}
  });
  function observe(){observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','aria-busy']});observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});}
  observe();
})();
