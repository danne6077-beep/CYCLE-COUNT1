(() => {
  const storageKey = 'fuji-cigarette-monitor-v1';
  const $ = id => document.getElementById(id);
  const form = $('cigarDailyForm');
  const fileInput = $('cigarSellingFile');
  const rows = $('cigarDailyRows');
  const status = $('cigarDailyStatus');
  const importStatus = $('cigarImportStatus');
  const dateInput = $('cigarLogDate');
  const summaryView = $('cigarDailySummary');
  const fieldIds = {transaction:'cigarTransaction', cs1:'cigarCs1', cs2:'cigarCs2', bag:'cigarBag', fmcg:'cigarFmcg'};
  const data = CigarMonitorData;
  const {localDate, validDate, addDays, ending, variance, totals, hasEntry, parseQuantity, formatNumber, formatSigned} = data;
  const inputKeys = Object.keys(data.inputFields);
  const tabs = [
    [$('cigarMonitorTab'), $('cigarMonitorWorkspace')],
    [$('cigarExpiryTab'), $('cigarExpiryWorkspace')],
    [$('cigarTrendsTab'), $('cigarTrendsWorkspace')]
  ];
  let state = {products:[], records:[]};
  let knownStorage;
  let initialDate = localDate();
  let drafts = {};
  let loadedDate = '';
  let edits;
  let activeProducts = [];
  let savedItems = new Map();
  let previousItems = new Map();
  let editsStored = true;
  let savePending = false;
  let pendingBackup;
  let trends;

  function setStatus(message, isError = false){
    status.textContent = message;
    status.classList.toggle('is-error',isError);
  }

  function showEntryForm(){
    form.hidden = false;
    summaryView.hidden = true;
  }

  function getSavedRecord(date){
    return state.records.find(record => record.date === date);
  }

  function persistState(snapshot = state, nextDrafts = drafts){
    try{
      if(localStorage.getItem(storageKey) !== knownStorage) throw new Error('The log changed in another tab. Refresh to load those entries.');
      const draftDate = Object.hasOwn(nextDrafts,loadedDate) ? loadedDate : undefined;
      const serialized = JSON.stringify({...snapshot, drafts:nextDrafts, draftDate});
      localStorage.setItem(storageKey,serialized);
      knownStorage = serialized;
    }catch(error){
      throw new Error('Could not save cigarette monitoring data in this browser: '+error.message);
    }
  }

  function draftHasEdits(){
    return Object.keys(edits.fields).length > 0 || Object.keys(edits.items).length > 0;
  }

  function saveDraft(){
    const nextDrafts = {...drafts};
    if(draftHasEdits()) nextDrafts[loadedDate] = edits;
    else delete nextDrafts[loadedDate];
    drafts = nextDrafts;
    try{
      persistState();
      editsStored = true;
      setStatus(draftHasEdits() ? 'Draft saved on this device.' : 'No unsaved changes.');
    }catch(error){
      editsStored = false;
      setStatus(error.message+' The draft is still open in this tab.',true);
    }
  }

  function loadDate(date){
    const saved = getSavedRecord(date);
    const previous = state.records.findLast(record => record.date < date);
    const stored = data.own(drafts,date);
    const productMap = new Map(state.products.map(product => [product.sku,product]));
    for(const sku of [...(saved?.items ?? []).map(item => item.sku), ...Object.keys(stored?.items ?? {})]){
      if(!productMap.has(sku)) productMap.set(sku,{sku});
    }
    activeProducts = [...productMap.values()];
    savedItems = new Map((saved?.items ?? []).map(item => [item.sku,item]));
    previousItems = new Map((previous?.items ?? []).map(item => [item.sku,item]));
    edits = {fields:{...stored?.fields}, items:Object.assign(Object.create(null),structuredClone(stored?.items ?? {}))};
    loadedDate = date;
    dateInput.value = date;
    for(const [field,id] of Object.entries(fieldIds)){
      $(id).value = edits.fields[field] ?? saved?.[field] ?? '';
    }
    showEntryForm();
    renderProducts();
    updateTotals();
    $('cigarSaveDay').disabled = !activeProducts.length;
    $('cigarSaveDay').textContent = saved ? 'Update daily entry' : 'Save daily entry';
    if(!editsStored && stored) setStatus('The draft could not be saved. Keep this tab open and back up your data.',true);
    else setStatus(stored ? 'Unsaved draft restored.' : saved ? 'Loaded saved entry for this date.' : activeProducts.length ?
      'Beginning counts carry forward from the previous saved day.' : 'Import a SELLING workbook to start.');
  }

  function figures(sku){
    const saved = savedItems.get(sku);
    const fields = data.own(edits.items,sku) ?? {};
    const values = {};
    for(const key of inputKeys){
      const original = saved ? saved[key] : key === 'beginning' ? previousItems.get(sku)?.ending : null;
      values[key] = fields[key] ?? (original == null ? '' : String(original));
    }
    return values;
  }

  function rowData(sku, validate = false){
    const values = figures(sku);
    const fields = data.own(edits.items,sku) ?? {};
    const item = {sku};
    for(const [key,value] of Object.entries(values)){
      const quantity = parseQuantity(value);
      if(validate && value !== '' && Object.hasOwn(fields,key) && !Number.isSafeInteger(quantity)){
        throw new Error(data.inputFields[key]+' must be a whole number for SKU '+sku+'.');
      }
      item[key] = quantity;
    }
    item.entered = ['withdrawal','sales','jdaSales'].some(key => item[key] !== null) ||
      (item.beginning !== null && (Object.hasOwn(fields,'beginning') || hasEntry(savedItems.get(sku) ?? {})));
    const saved = savedItems.get(sku);
    const changedStock = ['beginning','withdrawal','sales'].some(key => Object.hasOwn(fields,key));
    item.ending = saved && !changedStock ? saved.ending ?? null : ending(item);
    if(saved && !Object.keys(fields).length && hasEntry(saved)) item.entered = true;
    return item;
  }

  function addCell(row, value, className = ''){
    const cell = row.insertCell();
    cell.className = className;
    cell.textContent = value ?? '—';
    return cell;
  }

  function computedCell(cell, value, alert, signed = false){
    cell.textContent = signed ? formatSigned(value) : formatNumber(value);
    cell.classList.toggle('cigar-figure-alert',alert);
  }

  function updateComputedRow(row, item){
    const difference = variance(item);
    computedCell(row.cells[7],difference,difference !== null && difference !== 0,true);
    computedCell(row.cells[8],item.ending,item.ending < 0);
  }

  function updateTotals(){
    const figures = totals(activeProducts.map(product => rowData(product.sku)));
    $('cigarTotalSales').textContent = formatNumber(figures.sales);
    $('cigarTotalJda').textContent = formatNumber(figures.jdaSales);
    computedCell($('cigarTotalVariance'),figures.variance,Boolean(figures.variance),true);
    $('cigarEnteredCount').textContent = formatNumber(figures.entered);
  }

  function renderProducts(){
    const term = $('cigarItemSearch').value.trim().toLocaleLowerCase();
    const enteredOnly = $('cigarEnteredOnly').checked;
    const products = activeProducts.filter(product =>
      (!enteredOnly || rowData(product.sku).entered) &&
      [product.sku,product.description,product.upc].join(' ').toLocaleLowerCase().includes(term));
    $('cigarProductCount').textContent = activeProducts.length ?
      formatNumber(products.length)+' of '+formatNumber(activeProducts.length)+' products' : 'No products loaded';
    rows.replaceChildren();
    if(!products.length){
      addCell(rows.insertRow(), !activeProducts.length ? 'Import a SELLING sheet to load cigarette products.' :
        enteredOnly ? 'No matching SKUs have entries. Turn off the filter to enter more figures.' :
        'No products match this search.').colSpan = 9;
      return;
    }
    for(const product of products){
      const row = rows.insertRow();
      const values = figures(product.sku);
      [product.sku,product.description,product.upc].forEach(value => addCell(row,value || '—'));
      for(const [key,label] of Object.entries(data.inputFields)){
        const input = document.createElement('input');
        input.type = 'number';
        input.step = 'any';
        input.inputMode = 'numeric';
        input.autocomplete = 'off';
        input.setAttribute('aria-label',label+' for '+product.sku+' '+(product.description ?? ''));
        input.dataset.sku = product.sku;
        input.dataset.field = key;
        input.value = values[key];
        addCell(row,'').append(input);
      }
      addCell(row,'','cigar-figure');
      addCell(row,'','cigar-figure');
      updateComputedRow(row,rowData(product.sku));
    }
  }

  function renderSummary(record){
    $('cigarSummaryHeading').textContent = data.dateLabel(record.date,{dateStyle:'full'});
    const metadata = Object.entries(data.metadata).filter(([key]) => record[key] !== '' && record[key] != null)
      .map(([key,label]) => label+': '+record[key]);
    $('cigarSummaryMetadata').textContent = metadata.join(' · ') || 'No transaction details were entered.';
    const figures = totals(record.items);
    const stats = [
      ['SKUs with entries',formatNumber(figures.entered)], ['Total SALES',formatNumber(figures.sales)],
      ['Total JDA_S',formatNumber(figures.jdaSales)], ['Total variance',formatSigned(figures.variance)]
    ];
    $('cigarSummaryStats').replaceChildren(...stats.map(([label,value]) => {
      const card = document.createElement('div');
      const caption = document.createElement('span');
      const number = document.createElement('strong');
      caption.textContent = label;
      number.textContent = value;
      card.append(caption,number);
      return card;
    }));
    const productMap = new Map(state.products.map(product => [product.sku,product]));
    const summaryRows = $('cigarSummaryRows');
    summaryRows.replaceChildren();
    for(const item of record.items){
      const row = summaryRows.insertRow();
      addCell(row,item.sku);
      addCell(row,productMap.get(item.sku)?.description || '—');
      for(const key of inputKeys) addCell(row,formatNumber(item[key]));
      const difference = variance(item);
      computedCell(addCell(row,'','cigar-figure'),difference,Boolean(difference),true);
      computedCell(addCell(row,'','cigar-figure'),item.ending,item.ending < 0);
    }
    $('cigarSummaryNote').textContent = 'Saved on this device for '+formatNumber(record.items.length)+' products.';
    form.hidden = true;
    summaryView.hidden = false;
  }

  function confirmAction(message,title){
    return window.fujiConfirm?.(message,title) ?? Promise.resolve(window.confirm(message));
  }

  async function saveDay(event){
    event.preventDefault();
    if(savePending) return;
    savePending = true;
    try{
      if(!validDate(dateInput.value)) throw new Error('Choose a date before saving.');
      if(!activeProducts.length) throw new Error('Import a SELLING workbook before saving daily entries.');
      const record = {date:loadedDate, items:activeProducts.map(product => rowData(product.sku,true))};
      for(const [field,id] of Object.entries(fieldIds)) record[field] = $(id).value.trim();
      if(getSavedRecord(record.date) && !await confirmAction('Replace the saved daily entry for '+record.date+' with these figures?','Overwrite daily entry')) return;
      const nextState = {...state, records:[...state.records.filter(existing => existing.date !== record.date),record]
        .sort((left,right) => left.date.localeCompare(right.date))};
      const nextDrafts = {...drafts};
      delete nextDrafts[record.date];
      persistState(nextState,nextDrafts);
      state = nextState;
      drafts = nextDrafts;
      editsStored = true;
      loadDate(record.date);
      renderSummary(record);
      $('cigarEditDay').focus();
    }catch(error){
      setStatus(error.message,true);
    }finally{
      savePending = false;
    }
  }

  function toIsoDate(value){
    if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString().slice(0,10);
    if(typeof value==='number'&&Number.isFinite(value))return new Date(Date.UTC(1899,11,30)+Math.round(value)*86400000).toISOString().slice(0,10);
    const text=String(value??'').trim();
    const iso=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
    if(iso)return`${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;
    const local=/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
    return local?`${local[3]}-${local[1].padStart(2,'0')}-${local[2].padStart(2,'0')}`:'';
  }

  async function importSellingSheet(){
    const file=fileInput.files?.[0];
    if(!file)return;
    if(!window.XLSX){
      importStatus.textContent='Workbook support did not load. Refresh the page and try again.';
      fileInput.value='';
      return;
    }
    importStatus.textContent=`Reading ${file.name} on this device…`;
    try{
      const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
      const sheetName=workbook.SheetNames.find(name=>name.trim().toUpperCase()==='SELLING');
      if(!sheetName)throw new Error('This workbook does not contain a sheet named SELLING.');
      const sourceRows=XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,raw:true,defval:null});
      const imported=CigarMonitorUtils.parseSellingSheetRows(sourceRows);
      const incomingDates=new Set(imported.records.map(record=>record.date));
      if(incomingDates.size&&state.records.some(record=>incomingDates.has(record.date))&&!window.confirm('This workbook includes dates already saved here. Replace only those matching daily entries and keep other dates?'))return;
      const existing=new Map(state.records.map(record=>[record.date,record]));
      imported.records.forEach(record=>{
        record.date=toIsoDate(record.date)||record.date;
        existing.set(record.date,record);
      });
      const nextState={products:imported.products,records:[...existing.values()].sort((left,right)=>left.date.localeCompare(right.date))};
      persistState(nextState);
      state=nextState;
      importStatus.textContent=`Imported ${imported.products.length} products and ${imported.records.length} dated entries from ${file.name}.`;
      $('cigarLogDate').value=localDate();
      loadDate($('cigarLogDate').value);
    }catch(error){
      importStatus.textContent=error.message||'Could not import the SELLING sheet.';
      setStatus('Import failed. Your previously saved log was not replaced.',true);
    }finally{
      fileInput.value='';
    }
  }

  function download(contents,type,filename){
    const url = URL.createObjectURL(new Blob([contents],{type}));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  }

  function showCsvDialog(range){
    $('cigarCsvFrom').value = range?.from ?? '';
    $('cigarCsvTo').value = range?.to ?? '';
    $('cigarCsvStatus').textContent = state.records.length ? 'Leave either date blank to export without that limit.' : 'There are no saved daily entries to export.';
    $('cigarCsvDownload').disabled = !state.records.length;
    $('cigarCsvDialog').showModal();
  }

  function exportCsv(event){
    event.preventDefault();
    const from = $('cigarCsvFrom').value, to = $('cigarCsvTo').value;
    if(from && to && from > to){
      $('cigarCsvStatus').textContent = 'Choose an end date on or after the start date.';
      return;
    }
    const matching = state.records.filter(record => (!from || record.date >= from) && (!to || record.date <= to));
    if(!matching.length){
      $('cigarCsvStatus').textContent = 'There are no saved entries in this range.';
      return;
    }
    const headings = ['Date','TRANS#','CS1','CS2','BAG','FMCG','SKU','DESCRIPTION','UPC','TOTAL','EXPIRY','BEG','W','SALES','JDA_S','ENDING'];
    const lines = [headings.map(CigarMonitorUtils.escapeCsv).join(',')];
    const products = new Map(state.products.map(product => [product.sku,product]));
    for(const record of matching){
      for(const item of record.items){
        const product = products.get(item.sku) ?? {};
        lines.push([
          record.date,record.transaction,record.cs1,record.cs2,record.bag,record.fmcg,
          item.sku,product.description,product.upc,product.total,product.expiry,
          item.beginning,item.withdrawal,item.sales,item.jdaSales,item.ending
        ].map(CigarMonitorUtils.escapeCsv).join(','));
      }
    }
    download('\uFEFF'+lines.join('\r\n'),'text/csv;charset=utf-8','cigarette-monitor-'+localDate()+'.csv');
    $('cigarCsvDialog').close();
  }

  function backUp(){
    const backup = {format:'fuji-cigarette-monitor', version:1, exportedAt:new Date().toISOString(), ...state, drafts};
    download(JSON.stringify(backup,null,2),'application/json','cigarette-monitor-'+localDate()+'.json');
  }

  async function previewBackup(event){
    const input = event.target;
    const file = input.files?.[0];
    if(!file) return;
    pendingBackup = undefined;
    $('cigarRestoreConfirm').disabled = true;
    $('cigarRestorePreview').textContent = 'Reading backup…';
    $('cigarRestoreDialog').showModal();
    try{
      const backup = data.validateBackup(JSON.parse(await file.text()));
      if(!$('cigarRestoreDialog').open) return;
      pendingBackup = backup;
      const dates = backup.records.map(record => record.date).sort();
      const count = (length,singular) => formatNumber(length)+' '+singular+(length === 1 ? '' : 's');
      $('cigarRestorePreview').textContent = [
        count(backup.products.length,'product'), count(dates.length,'saved day'),
        count(Object.keys(backup.drafts).length,'draft'), dates.length ? dates[0]+' to '+dates.at(-1) : ''
      ].filter(Boolean).join(' · ');
      $('cigarRestoreConfirm').disabled = false;
    }catch(error){
      $('cigarRestorePreview').textContent = error instanceof SyntaxError ? 'This file is not valid JSON.' : error.message;
    }finally{
      input.value = '';
    }
  }

  function restoreBackup(event){
    event.preventDefault();
    if(!pendingBackup) return;
    const nextState = {products:pendingBackup.products, records:[...pendingBackup.records].sort((a,b) => a.date.localeCompare(b.date))};
    const nextDrafts = pendingBackup.drafts;
    try{
      persistState(nextState,nextDrafts);
      state = nextState;
      drafts = nextDrafts;
      editsStored = true;
      loadDate(loadedDate);
      $('cigarRestoreDialog').close();
      $('cigarDataStatus').textContent = 'Cigarette Monitor backup restored.';
      trends.render();
    }catch(error){
      $('cigarRestorePreview').textContent = error.message;
    }
  }

  function openDay(date, mode){
    loadDate(date);
    selectTab(0);
    if(mode === 'view' && getSavedRecord(date)){
      renderSummary(getSavedRecord(date));
      $('cigarEditDay').focus();
    }else dateInput.focus();
  }

  async function deleteDay(date){
    if(!await confirmAction('Delete the saved entry for '+date+'? Any unsaved draft for this date will be kept.','Delete daily entry')) return;
    const nextState = {...state, records:state.records.filter(record => record.date !== date)};
    try{
      persistState(nextState);
      state = nextState;
      if(loadedDate === date) loadDate(date);
      $('cigarDataStatus').textContent = 'Deleted saved entry for '+date+'.';
      trends.render();
      $('cigarHistoryHeading').focus();
    }catch(error){
      $('cigarDataStatus').textContent = error.message;
    }
  }

  async function startOver(){
    if(!await confirmAction('Discard any unsaved edits for '+loadedDate+'? Saved entries stay in your log.','Start over')) return;
    const nextDrafts = {...drafts};
    delete nextDrafts[loadedDate];
    try{
      persistState(state,nextDrafts);
      drafts = nextDrafts;
      editsStored = true;
      openDay(loadedDate,'edit');
      setStatus('Daily entry reset.');
    }catch(error){
      setStatus(error.message,true);
    }
  }

  function selectTab(index, focus = false){
    tabs.forEach(([tab,panel],i) => {
      tab.setAttribute('aria-selected',String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panel.hidden = i !== index;
    });
    if(index === 2) trends.render();
    if(focus) tabs[index][0].focus();
  }

  try{
    knownStorage = localStorage.getItem(storageKey);
    if(knownStorage){
      const parsed = JSON.parse(knownStorage);
      if(!Array.isArray(parsed.products) || !Array.isArray(parsed.records)) throw new Error('Saved cigarette monitoring data has an invalid format.');
      state = {products:parsed.products, records:[...parsed.records].sort((left,right) => left.date.localeCompare(right.date))};
      if(parsed.drafts && typeof parsed.drafts === 'object' && !Array.isArray(parsed.drafts)) drafts = parsed.drafts;
      if(validDate(parsed.draftDate) && Object.hasOwn(drafts,parsed.draftDate)) initialDate = parsed.draftDate;
    }
  }catch(error){
    importStatus.textContent = 'Could not read saved cigarette monitoring data: '+error.message;
  }
  loadDate(initialDate);
  dateInput.addEventListener('change',() => {
    if(validDate(dateInput.value)) loadDate(dateInput.value);
    else dateInput.value = loadedDate;
  });
  $('cigarItemSearch').addEventListener('input',renderProducts);
  $('cigarEnteredOnly').addEventListener('change',renderProducts);
  form.addEventListener('input',event => {
    const input = event.target;
    if(input.dataset.field){
      const {sku,field} = input.dataset;
      (edits.items[sku] ??= {})[field] = input.value;
      updateComputedRow(input.closest('tr'),rowData(sku));
      updateTotals();
    }else{
      const key = Object.keys(fieldIds).find(field => fieldIds[field] === input.id);
      if(!key) return;
      edits.fields[key] = input.value;
    }
    saveDraft();
  });
  rows.addEventListener('focusout',event => {
    const row = event.target.closest('tr');
    if(!$('cigarEnteredOnly').checked || !event.target.dataset.sku || row.contains(event.relatedTarget) || rowData(event.target.dataset.sku).entered) return;
    row.hidden = true;
    $('cigarProductCount').textContent = formatNumber(rows.querySelectorAll('tr:not([hidden])').length)+' of '+formatNumber(activeProducts.length)+' products';
  });
  rows.addEventListener('keydown',event => {
    if(!['Enter','Tab'].includes(event.key) || !event.target.dataset.field || event.ctrlKey || event.altKey || event.metaKey) return;
    const column = event.target.closest('td').cellIndex;
    const visibleRows = [...rows.querySelectorAll('tr:not([hidden])')];
    const rowIndex = visibleRows.indexOf(event.target.closest('tr'));
    const direction = event.shiftKey ? -1 : 1;
    const next = visibleRows[rowIndex+direction]?.cells[column].firstElementChild;
    const wrap = event.key === 'Tab' && visibleRows[direction === 1 ? 0 : visibleRows.length-1]?.cells[column+direction]?.querySelector('input');
    const target = next || wrap;
    if(target || event.key === 'Enter') event.preventDefault();
    if(target){target.focus();target.select();}
  });
  form.addEventListener('submit',saveDay);
  fileInput.addEventListener('change',importSellingSheet);
  $('cigarExportCsv').addEventListener('click',() => showCsvDialog());
  $('cigarCsvForm').addEventListener('submit',exportCsv);
  $('cigarCsvCancel').addEventListener('click',() => $('cigarCsvDialog').close());
  $('cigarBackup').addEventListener('click',backUp);
  $('cigarRestore').addEventListener('click',() => $('cigarRestoreFile').click());
  $('cigarRestoreFile').addEventListener('change',previewBackup);
  $('cigarRestoreForm').addEventListener('submit',restoreBackup);
  $('cigarRestoreCancel').addEventListener('click',() => $('cigarRestoreDialog').close());
  $('cigarEditDay').addEventListener('click',() => {showEntryForm();dateInput.focus();});
  $('cigarNewDay').addEventListener('click',() => openDay(addDays(loadedDate,1),'edit'));
  $('cigarStartOver').addEventListener('click',startOver);
  $('resetBtn').addEventListener('click',event => {
    if(!event.isTrusted || $('cigarsPanel').hidden) return;
    event.stopImmediatePropagation();
    startOver();
  },true);

  trends = CigarTrends({
    getState:() => state, openDay, deleteDay, exportCsv:showCsvDialog
  });
  tabs.forEach(([tab],index) => {
    tab.addEventListener('click',() => selectTab(index));
    tab.addEventListener('keydown',event => {
      const next = {ArrowLeft:(index+tabs.length-1)%tabs.length, ArrowRight:(index+1)%tabs.length, Home:0, End:tabs.length-1}[event.key];
      if(next === undefined) return;
      event.preventDefault();
      selectTab(next,true);
    });
  });
})();
