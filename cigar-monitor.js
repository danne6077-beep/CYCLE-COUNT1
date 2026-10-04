(()=>{
  const storageKey='fuji-cigarette-monitor-v1';
  const emptyState={products:[],records:[]};
  const $=id=>document.getElementById(id);
  const form=$('cigarDailyForm');
  const fileInput=$('cigarSellingFile');
  const rows=$('cigarDailyRows');
  const status=$('cigarDailyStatus');
  const importStatus=$('cigarImportStatus');
  const fieldIds={transaction:'cigarTransaction',cs1:'cigarCs1',cs2:'cigarCs2',bag:'cigarBag',fmcg:'cigarFmcg'};
  const monitorTab=$('cigarMonitorTab');
  const expiryTab=$('cigarExpiryTab');
  const monitorWorkspace=$('cigarMonitorWorkspace');
  const expiryWorkspace=$('cigarExpiryWorkspace');
  const summaryView=$('cigarDailySummary');
  const fieldColumns=[
    {key:'beginning',label:'BEG'},
    {key:'withdrawal',label:'W'},
    {key:'sales',label:'SALES'},
    {key:'jdaSales',label:'JDA_S'},
    {key:'ending',label:'ENDING'}
  ];
  let state={...emptyState};
  let draft={};
  let loadedDate='';
  let dirty=false;

  function localDate(){
    const date=new Date();
    return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function setStatus(message,isError=false){
    status.textContent=message;
    status.classList.toggle('is-error',isError);
  }

  function showEntryForm(){
    form.hidden=false;
    summaryView.hidden=true;
  }

  function nextDate(dateValue){
    const date=new Date(`${dateValue}T00:00:00`);
    date.setDate(date.getDate()+1);
    return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function getSavedRecord(date){
    return state.records.find(record=>record.date===date)||null;
  }

  function latestPreviousRecord(date){
    return state.records.filter(record=>record.date<date).sort((left,right)=>right.date.localeCompare(left.date))[0]||null;
  }

  function valueText(value){
    return value===null||value===undefined?'':String(value);
  }

  function getDraftForDate(date){
    const saved=getSavedRecord(date);
    const previous=latestPreviousRecord(date);
    const savedItems=new Map((saved?.items||[]).map(item=>[item.sku,item]));
    const previousItems=new Map((previous?.items||[]).map(item=>[item.sku,item]));
    return Object.fromEntries(state.products.map(product=>{
      const current=savedItems.get(product.sku);
      const last=previousItems.get(product.sku);
      const values={};
      fieldColumns.forEach(({key})=>{
        values[key]=valueText(current?.[key]??(key==='beginning'?last?.ending??'':''));
      });
      return[product.sku,values];
    }));
  }

  function readRecordFields(record){
    Object.entries(fieldIds).forEach(([field,id])=>{$(id).value=record?.[field]||''});
  }

  function loadDate(date){
    const record=getSavedRecord(date);
    draft=getDraftForDate(date);
    readRecordFields(record);
    loadedDate=date;
    dirty=false;
    showEntryForm();
    renderProducts();
    $('cigarSaveDay').textContent=record?'Update daily entry':'Save daily entry';
    setStatus(record?'Loaded saved entry for this date.':state.products.length?'New day ready. Beginning counts carry forward from the latest earlier saved day.':'Import a SELLING workbook to start.');
  }

  function summaryValue(value){
    return value===null||value===undefined?'—':String(value);
  }

  function renderSummary(record){
    $('cigarSummaryHeading').textContent=new Intl.DateTimeFormat(undefined,{dateStyle:'full'}).format(new Date(`${record.date}T00:00:00`));
    const metadata=[['TRANS#',record.transaction],['CS1',record.cs1],['CS2',record.cs2],['BAG',record.bag],['FMCG',record.fmcg]]
      .filter(([,value])=>value)
      .map(([label,value])=>`${label}: ${value}`);
    $('cigarSummaryMetadata').textContent=metadata.length?metadata.join(' · '):'No transaction details were entered.';
    const countEntered=record.items.filter(item=>fieldColumns.some(({key})=>item[key]!==null&&item[key]!==undefined)).length;
    const totals=Object.fromEntries(fieldColumns.map(({key,label})=>{
      const numbers=record.items.map(item=>item[key]).filter(value=>typeof value==='number'&&Number.isFinite(value));
      return[label,numbers.length?numbers.reduce((sum,value)=>sum+value,0):'—'];
    }));
    const stats=[
      ['Products entered',`${countEntered} / ${record.items.length}`],
      ['Total sales',totals.SALES],
      ['JDA sales',totals.JDA_S],
      ['Ending stock',totals.ENDING]
    ];
    const statsContainer=$('cigarSummaryStats');
    statsContainer.replaceChildren();
    stats.forEach(([label,value])=>{
      const card=document.createElement('div');
      const caption=document.createElement('span');
      caption.textContent=label;
      const number=document.createElement('strong');
      number.textContent=String(value);
      card.append(caption,number);
      statsContainer.append(card);
    });
    const productBySku=new Map(state.products.map(product=>[product.sku,product]));
    const summaryRows=$('cigarSummaryRows');
    summaryRows.replaceChildren();
    record.items.forEach(item=>{
      const row=summaryRows.insertRow();
      const product=productBySku.get(item.sku)||{};
      [item.sku,product.description,...fieldColumns.map(({key})=>summaryValue(item[key]))].forEach(value=>{
        const cell=row.insertCell();
        cell.textContent=value||'—';
      });
    });
    $('cigarSummaryNote').textContent=`Saved locally in this browser for ${record.items.length} products. Use “Enter new day” to start the next date with beginning counts carried forward from these ending counts.`;
    form.hidden=true;
    summaryView.hidden=false;
  }

  function renderProducts(){
    const term=$('cigarItemSearch').value.trim().toLocaleLowerCase();
    const products=state.products.filter(product=>`${product.sku} ${product.description} ${product.upc}`.toLocaleLowerCase().includes(term));
    $('cigarProductCount').textContent=state.products.length?`${products.length} of ${state.products.length} products`: 'No products loaded';
    rows.replaceChildren();
    if(!state.products.length){
      const row=rows.insertRow();
      const cell=row.insertCell();
      cell.colSpan=8;
      cell.textContent='Import a SELLING sheet to load cigarette products.';
      return;
    }
    if(!products.length){
      const row=rows.insertRow();
      const cell=row.insertCell();
      cell.colSpan=8;
      cell.textContent='No products match this search.';
      return;
    }
    products.forEach(product=>{
      const row=rows.insertRow();
      [product.sku,product.description,product.upc].forEach(value=>{
        const cell=row.insertCell();
        cell.textContent=value||'—';
      });
      fieldColumns.forEach(({key,label})=>{
        const cell=row.insertCell();
        const input=document.createElement('input');
        input.type='number';
        input.step='1';
        input.inputMode='numeric';
        input.autocomplete='off';
        input.setAttribute('aria-label',`${label} for ${product.sku} ${product.description}`);
        input.dataset.sku=product.sku;
        input.dataset.field=key;
        input.value=draft[product.sku]?.[key]||'';
        input.addEventListener('input',()=>{
          draft[product.sku][key]=input.value;
          dirty=true;
          setStatus('Unsaved changes.');
        });
        cell.append(input);
      });
    });
  }

  function persistState(snapshot=state){
    try{
      localStorage.setItem(storageKey,JSON.stringify(snapshot));
    }catch(error){
      throw new Error(`Could not save cigarette monitoring data in this browser: ${error.message}`);
    }
  }

  function readNumber(value,sku,field){
    if(value.trim()==='')return null;
    const number=Number(value);
    if(!Number.isInteger(number))throw new Error(`${field} must be a whole number for SKU ${sku}.`);
    return number;
  }

  function saveDay(event){
    event.preventDefault();
    const date=$('cigarLogDate').value;
    if(!date){
      setStatus('Choose a date before saving.',true);
      return;
    }
    if(!state.products.length)throw new Error('Import a SELLING workbook before saving daily entries.');
    const items=state.products.map(product=>{
      const values=draft[product.sku]||{};
      return{
        sku:product.sku,
        beginning:readNumber(values.beginning||'',product.sku,'BEG'),
        withdrawal:readNumber(values.withdrawal||'',product.sku,'W'),
        sales:readNumber(values.sales||'',product.sku,'SALES'),
        jdaSales:readNumber(values.jdaSales||'',product.sku,'JDA_S'),
        ending:readNumber(values.ending||'',product.sku,'ENDING')
      };
    });
    const record={
      date,
      transaction:$('cigarTransaction').value.trim(),
      cs1:$('cigarCs1').value.trim(),
      cs2:$('cigarCs2').value.trim(),
      bag:$('cigarBag').value.trim(),
      fmcg:$('cigarFmcg').value.trim(),
      items
    };
    const nextState={
      products:state.products,
      records:[...state.records.filter(existing=>existing.date!==date),record]
        .sort((left,right)=>left.date.localeCompare(right.date))
    };
    try{
      persistState(nextState);
      state=nextState;
      loadedDate=date;
      dirty=false;
      setStatus(`Saved ${date} for ${items.length} products in this browser.`);
      renderSummary(record);
    }catch(error){
      setStatus(error.message,true);
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

  function exportCsv(){
    if(!state.records.length){
      setStatus('There are no saved daily entries to export.',true);
      return;
    }
    const headings=['Date','TRANS#','CS1','CS2','BAG','FMCG','SKU','DESCRIPTION','UPC','TOTAL','EXPIRY','BEG','W','SALES','JDA_S','ENDING'];
    const lines=[headings.map(CigarMonitorUtils.escapeCsv).join(',')];
    state.records.forEach(record=>{
      record.items.forEach(item=>{
        const product=state.products.find(entry=>entry.sku===item.sku)||{};
        lines.push([
          record.date,record.transaction,record.cs1,record.cs2,record.bag,record.fmcg,
          item.sku,product.description,product.upc,product.total,product.expiry,
          item.beginning,item.withdrawal,item.sales,item.jdaSales,item.ending
        ].map(CigarMonitorUtils.escapeCsv).join(','));
      });
    });
    const blob=new Blob([`\uFEFF${lines.join('\r\n')}`],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=`cigarette-monitor-${localDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  $('cigarLogDate').value=localDate();
  try{
    const saved=localStorage.getItem(storageKey);
    if(saved){
      const parsed=JSON.parse(saved);
      if(!Array.isArray(parsed.products)||!Array.isArray(parsed.records))throw new Error('Saved cigarette monitoring data has an invalid format.');
      state=parsed;
    }
  }catch(error){
    importStatus.textContent=`Could not read saved cigarette monitoring data: ${error.message}`;
  }
  loadDate($('cigarLogDate').value);
  $('cigarLogDate').addEventListener('change',()=>{
    if(dirty&&!window.confirm('Discard unsaved changes for this date?')){
      $('cigarLogDate').value=loadedDate;
      return;
    }
    loadDate($('cigarLogDate').value);
  });
  $('cigarItemSearch').addEventListener('input',renderProducts);
  form.addEventListener('input',event=>{
    if(event.target.id!=='cigarItemSearch'){
      dirty=true;
      setStatus('Unsaved changes.');
    }
  });
  form.addEventListener('submit',event=>{
    try{saveDay(event)}catch(error){event.preventDefault();setStatus(error.message,true)}
  });
  fileInput.addEventListener('change',importSellingSheet);
  $('cigarExportCsv').addEventListener('click',exportCsv);
  $('cigarEditDay').addEventListener('click',showEntryForm);
  $('cigarNewDay').addEventListener('click',()=>{
    const date=nextDate(loadedDate);
    $('cigarLogDate').value=date;
    loadDate(date);
    $('cigarLogDate').focus();
  });
  monitorTab.addEventListener('click',()=>{
    monitorTab.setAttribute('aria-selected','true');
    expiryTab.setAttribute('aria-selected','false');
    monitorWorkspace.hidden=false;
    expiryWorkspace.hidden=true;
  });
  expiryTab.addEventListener('click',()=>{
    monitorTab.setAttribute('aria-selected','false');
    expiryTab.setAttribute('aria-selected','true');
    monitorWorkspace.hidden=true;
    expiryWorkspace.hidden=false;
  });
})();
