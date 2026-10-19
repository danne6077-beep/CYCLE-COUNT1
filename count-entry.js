(()=>{
  const byId=id=>document.getElementById(id);
  const panel=byId('countEntryPanel');
  const pageSize=50;
  const reasons=[['','Choose a reason'],['damaged','Damaged stock'],['missing','Missing item'],['extra','Unlisted item found'],['unit-mismatch','Unit or pack mismatch'],['count-error','Counting error'],['other','Other']];
  let sessions=[];
  let activeSession=null;
  let visibleEntries=[];
  let page=1;
  let saveTimer=0;
  const actor=()=>window.fujiCurrentUser?.name||window.fujiCurrentUser?.email||'This device';
  const escape=window.FujiSafeText.escapeHtml;
  const fmt=value=>value===null||value===undefined?'':String(value);

  function sortedSessions(){return [...sessions].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))}
  function refreshSessionChoices(){
    const select=byId('countSessionSelect');
    const previous=activeSession?.id||select.value;
    select.replaceChildren(new Option('Select a saved session',''),...sortedSessions().map(session=>new Option(`${session.store||'Unassigned store'} · ${session.date||'No date'} · ${session.status} · ${session.entries?.length||0} items`,session.id)));
    if(previous&&sessions.some(session=>session.id===previous))select.value=previous;
    byId('resumeCountSession').disabled=!select.value;
  }
  async function saveSession(message='Saved locally'){
    if(!activeSession)return;
    activeSession.updatedAt=new Date().toISOString();
    byId('countEntrySaveStatus').textContent='Saving…';
    clearTimeout(saveTimer);
    return new Promise(resolve=>{saveTimer=setTimeout(async()=>{
      try{await window.fujiCountStorage.write(activeSession);sessions=sessions.filter(session=>session.id!==activeSession.id);sessions.push(activeSession);refreshSessionChoices();byId('countEntrySaveStatus').textContent=message;document.dispatchEvent(new CustomEvent('count-session-updated',{detail:CountEntryUtils.summarizeSession(activeSession)}));resolve(true)}
      catch(error){byId('countEntrySaveStatus').textContent='Could not save. Export a backup before leaving.';console.error('Count session save failed:',error);resolve(false)}
    },240)});
  }
  function statusInfo(entry){
    if(entry.decision==='approved')return ['approved','Approved variance'];
    if(entry.decision==='recount')return ['recount','Flagged for recount'];
    if(entry.status==='needs-expected')return ['needs-expected','Needs expected qty'];
    if(entry.status==='pending')return ['pending',entry.counted===null?'Not counted':'Needs expected qty'];
    if(entry.status==='matched')return ['matched','Matched'];
    if(entry.status==='within-tolerance')return ['within-tolerance','Within tolerance'];
    return ['recount','Recount needed'];
  }
  function filteredEntries(){
    const term=byId('countEntrySearch').value.trim().toLowerCase();
    const filter=byId('countEntryFilter').value;
    return (activeSession?.entries||[]).map((entry,index)=>({entry,index})).filter(({entry})=>{
      if(term&&!`${entry.sku} ${entry.barcode} ${entry.locator} ${entry.supplier} ${entry.description}`.toLowerCase().includes(term))return false;
      if(filter==='pending'&&entry.counted!==null&&entry.counted!==undefined)return false;
      if(filter==='recount'&&!(entry.status==='recount'&&entry.decision!=='approved'))return false;
      if(filter==='done'&&(entry.counted===null||entry.counted===undefined))return false;
      return true;
    });
  }
  function renderAudit(){
    const list=byId('countEntryAuditList');list.replaceChildren();
    const events=[];
    (activeSession?.entries||[]).forEach(entry=>entry.audit?.forEach(event=>events.push({...event,sku:entry.sku})));
    (activeSession?.audit||[]).forEach(event=>events.push(event));
    events.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
    if(!events.length){const li=document.createElement('li');li.textContent='No edits recorded yet.';list.append(li);return}
    events.slice(0,250).forEach(event=>{const li=document.createElement('li');li.textContent=`${new Date(event.at).toLocaleString()} · ${event.actor} · ${event.sku?`SKU ${event.sku} · `:''}${event.field}: ${fmt(event.previous)||'blank'} → ${fmt(event.next)||'blank'}`;list.append(li)});
  }
  function render(){
    refreshSessionChoices();
    const body=byId('countEntryRows');body.replaceChildren();
    const summary=activeSession?CountEntryUtils.summarizeSession(activeSession):null;
    byId('countEntryEmpty').hidden=Boolean(!activeSession||summary.total===0);
    if(!activeSession){
      byId('countEntryProgress').textContent='No count session selected';byId('countEntryReviewSummary').textContent='Start a session from validated inventory.';byId('countEntrySaveStatus').textContent='Saved locally';
      byId('exportCountReport').disabled=true;byId('printCountReport').disabled=true;byId('completeCountSession').disabled=true;byId('countEntryPageLabel').textContent='Page 1 of 1';byId('countEntryPrevious').disabled=true;byId('countEntryNext').disabled=true;renderAudit();return;
    }
    const pages=Math.max(1,Math.ceil(visibleEntries.length/pageSize));page=Math.max(1,Math.min(page,pages));
    const current=visibleEntries.slice((page-1)*pageSize,page*pageSize);
    current.forEach(({entry,index},rowPosition)=>{
      const [status,statusLabel]=statusInfo(entry);
      const tr=document.createElement('tr');tr.dataset.entryId=entry.id;
      const reasonOptions=reasons.map(([value,label])=>`<option value="${escape(value)}" ${entry.reason===value?'selected':''}>${escape(label)}</option>`).join('');
      const discrepancy=entry.variance!==null&&entry.variance!==0;
      const decisionButtons=discrepancy?`<div class="count-entry-row-actions"><button type="button" class="secondary-button" data-entry-decision="approved" data-entry-id="${escape(entry.id)}">Approve</button><button type="button" class="secondary-button" data-entry-decision="recount" data-entry-id="${escape(entry.id)}">Recount</button></div>`:'—';
      tr.innerHTML=`<td><div class="count-entry-item"><strong>${escape(entry.description||'Unnamed item')}</strong><small>SKU ${escape(entry.sku||'—')} · UPC ${escape(entry.barcode||'—')}<br>${escape(entry.locator||'No locator')} · ${escape(entry.supplier||'Unassigned supplier')} · source row ${escape(entry.sourceRow)}</small></div></td><td><input type="number" min="0" step="1" inputmode="numeric" aria-label="Expected quantity for SKU ${escape(entry.sku)}" data-entry-field="expected" data-entry-id="${escape(entry.id)}" value="${escape(fmt(entry.expected))}"></td><td><input type="number" min="0" step="1" inputmode="numeric" aria-label="Counted quantity for SKU ${escape(entry.sku)}" data-entry-field="counted" data-entry-id="${escape(entry.id)}" data-row-position="${rowPosition}" value="${escape(fmt(entry.counted))}" ${activeSession.status.startsWith('completed')?'disabled':''}></td><td class="count-entry-variance">${entry.variance===null?'—':`${entry.variance>0?'+':''}${entry.variance}${entry.variancePct===null?'':` · ${entry.variancePct.toFixed(1)}%`}`}</td><td><span class="count-entry-status" data-status="${status}">${statusLabel}</span></td><td><select aria-label="Variance reason for SKU ${escape(entry.sku)}" data-entry-field="reason" data-entry-id="${escape(entry.id)}">${reasonOptions}</select><input class="count-entry-note" type="text" maxlength="500" placeholder="Optional note" aria-label="Count note for SKU ${escape(entry.sku)}" data-entry-field="note" data-entry-id="${escape(entry.id)}" value="${escape(entry.note||'')}"></td><td>${decisionButtons}</td>`;
      body.append(tr);
    });
    const start=visibleEntries.length?(page-1)*pageSize+1:0;
    byId('countEntryEmpty').hidden=visibleEntries.length>0;
    byId('countEntryProgress').textContent=`${summary.counted.toLocaleString()} of ${summary.total.toLocaleString()} items counted · ${activeSession.store||'Unassigned store'} · ${activeSession.date||'No date'}`;
    byId('countEntryReviewSummary').textContent=`${summary.matched} matched · ${summary.withinTolerance} within tolerance · ${summary.recount} need review · ${summary.missingExpected} missing expected quantity`;
    byId('countEntryPageLabel').textContent=`Showing ${start}–${Math.min(start+current.length-1,visibleEntries.length)} of ${visibleEntries.length} · Page ${page} of ${pages}`;
    byId('countEntryPrevious').disabled=page===1;byId('countEntryNext').disabled=page===pages;
    byId('countTolerance').value=String(activeSession.tolerance??0);
    byId('exportCountReport').disabled=false;byId('printCountReport').disabled=false;
    byId('completeCountSession').disabled=activeSession.status.startsWith('completed');
    byId('completeCountSession').textContent=activeSession.status.startsWith('completed')?'Session completed':'Complete session';
    byId('completeCountSession').title=summary.recount?`${summary.recount} variance(s) need review`:'';
    renderAudit();
  }
  function openPanel(){
    document.querySelectorAll('.page-shell > section').forEach(section=>{section.hidden=section!==panel});
    byId('introRow').hidden=true;byId('stepper').hidden=true;
    document.querySelectorAll('#primaryNavigation [aria-current="page"]').forEach(nav=>nav.removeAttribute('aria-current'));
    byId('countSheetNav').setAttribute('aria-current','page');
    panel.hidden=false;document.getElementById('mainContent').focus();byId('currentPageTitle').textContent='Count Entry';
  }
  async function startSession(){
    if(!items.length){window.toast('Import inventory before starting a physical count.');return}
    const session=CountEntryUtils.createSession(items,{store:byId('storeField').value||window.fujiWorkspaceSettings?.storeName,date:byId('dateField').value,tolerance:0,source:readLocalCycleData().source||''});
    try{await window.fujiCountStorage.write(session)}catch(error){window.toast(`Could not save this count session: ${error.message||'local storage is unavailable'}`);return}
    sessions.push(session);activeSession=session;openPanel();visibleEntries=filteredEntries();page=1;render();document.dispatchEvent(new CustomEvent('count-session-updated',{detail:CountEntryUtils.summarizeSession(session)}));
  }
  async function openSavedSession(id){
    if(!sessions.some(session=>session.id===id))sessions=await window.fujiCountStorage.readAll();
    activeSession=sessions.find(session=>session.id===id)||null;
    if(activeSession){visibleEntries=filteredEntries();page=1;openPanel();render()}
  }
  function backToValidation(){
    panel.hidden=true;byId('introRow').hidden=false;byId('stepper').hidden=false;
    document.querySelectorAll('.page-shell > section').forEach(section=>{if(section.id!=='countEntryPanel'&&['homePanel','aboutPanel','cigarsPanel','shelfTagPanel','productLookupPanel','masterlistPanel','announcementsPanel','hotlistPanel','countSheetPanel'].includes(section.id))section.hidden=true});
    showStep(2);byId('countSheetNav').setAttribute('aria-current','page');byId('currentPageTitle').textContent='Count Sheet';
  }
  function updateField(field,id,value){
    try{CountEntryUtils.updateLine(activeSession,id,field,value,actor());visibleEntries=filteredEntries();render();void saveSession()}
    catch(error){window.toast(error.message);render()}
  }
  async function exportCsv(){
    if(!activeSession)return;
    const blob=new Blob([CountEntryUtils.toCsv(activeSession)],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`count-session-${activeSession.date||'report'}.csv`;link.click();URL.revokeObjectURL(url);
  }
  byId('startPhysicalCount').addEventListener('click',()=>void startSession());
  byId('startAnotherCount').addEventListener('click',async()=>{if(!items.length){window.toast('Load inventory before starting a new session.');return}if(activeSession?.status==='open'&&!await (window.fujiConfirm?.('A new session will leave this open session saved. Continue?','Start another count')??Promise.resolve(window.confirm('Start another count session?'))))return;await startSession()});
  byId('resumeCountSession').addEventListener('click',()=>void openSavedSession(byId('countSessionSelect').value));
  byId('countSessionSelect').addEventListener('change',()=>{byId('resumeCountSession').disabled=!byId('countSessionSelect').value});
  byId('backCountEntry').addEventListener('click',backToValidation);
  byId('countEntrySearch').addEventListener('input',()=>{page=1;visibleEntries=filteredEntries();render()});
  byId('countEntryFilter').addEventListener('change',()=>{page=1;visibleEntries=filteredEntries();render()});
  byId('countEntryRows').addEventListener('change',event=>{const control=event.target.closest('[data-entry-field]');if(control&&activeSession)updateField(control.dataset.entryField,control.dataset.entryId,control.value)});
  byId('countEntryRows').addEventListener('keydown',event=>{
    if(event.key!=='Enter'||!event.target.matches('[data-entry-field="counted"]'))return;
    event.preventDefault();const next=byId('countEntryRows').querySelector(`[data-row-position="${Number(event.target.dataset.rowPosition)+1}"]`);if(next)next.focus();else if(page<Math.ceil(visibleEntries.length/pageSize)){page++;render();byId('countEntryRows').querySelector('[data-entry-field="counted"]')?.focus()}
  });
  byId('countEntryRows').addEventListener('click',event=>{
    const button=event.target.closest('[data-entry-decision]');if(!button||!activeSession)return;
    try{CountEntryUtils.decideLine(activeSession,button.dataset.entryId,button.dataset.entryDecision,actor());render();void saveSession()}
    catch(error){window.toast(error.message)}
  });
  byId('countTolerance').addEventListener('change',event=>{
    if(!activeSession)return;try{CountEntryUtils.setTolerance(activeSession,event.target.value,actor());visibleEntries=filteredEntries();render();void saveSession('Tolerance and counts saved')}
    catch(error){window.toast(error.message);event.target.value=String(activeSession.tolerance??0)}
  });
  byId('countEntryPrevious').addEventListener('click',()=>{page=Math.max(1,page-1);render()});
  byId('countEntryNext').addEventListener('click',()=>{page++;render()});
  byId('exportCountReport').addEventListener('click',()=>void exportCsv());
  byId('printCountReport').addEventListener('click',()=>{document.body.classList.add('print-count-entry');window.print()});
  window.addEventListener('afterprint',()=>document.body.classList.remove('print-count-entry'));
  byId('completeCountSession').addEventListener('click',async()=>{
    if(!activeSession)return;
    try{CountEntryUtils.finishSession(activeSession,actor());await saveSession('Session completed and saved');render();window.toast('Count session completed')}
    catch(error){window.toast(error.message)}
  });
  byId('countSheetNav').addEventListener('click',()=>{panel.hidden=true});
  document.addEventListener('count-sessions-updated',async()=>{try{sessions=await window.fujiCountStorage.readAll();if(activeSession)activeSession=sessions.find(session=>session.id===activeSession.id)||activeSession;refreshSessionChoices();render()}catch(error){console.error('Could not refresh saved count sessions:',error)}});
  window.fujiOpenCountEntry=id=>{if(id)return void openSavedSession(id);if(activeSession){openPanel();render()}else void startSession()};
  window.fujiGetCountSummary=()=>activeSession?CountEntryUtils.summarizeSession(activeSession):null;
  window.fujiGetActiveCountSession=()=>activeSession;
  (async()=>{try{sessions=await window.fujiCountStorage.readAll();refreshSessionChoices();byId('countEntrySaveStatus').textContent='Saved locally'}catch(error){byId('countEntrySaveStatus').textContent='Local session storage is unavailable';console.error('Could not load count sessions:',error)}})();
})();
