let pendingCombinedPrint=[];
let pendingCombinedPrintSignature='';
let pendingCombinedPrintScope='';
let importedCountSheetRows=[];
let importedCountSheetFileName='';
let importedCountSheetPrintActive=false;
let selectedImportedCountSheetGroups=new Set();
let importedCountSheetPreviewReady=false;

function showPrintToast(message='Print dialog closed.'){
  const toast=$('#printToast');
  if(!toast)return;
  const text=toast.querySelector('p');
  if(text)text.textContent=message;
  clearTimeout(showPrintToast.dismissTimer);
  clearTimeout(showPrintToast.hideTimer);
  toast.hidden=false;
  toast.classList.add('show');
  showPrintToast.dismissTimer=setTimeout(dismissPrintToast,3500);
}

function dismissPrintToast(){
  const toast=$('#printToast');
  if(!toast)return;
  clearTimeout(showPrintToast.dismissTimer);
  clearTimeout(showPrintToast.hideTimer);
  toast.classList.remove('show');
  showPrintToast.hideTimer=setTimeout(()=>toast.hidden=true,260);
}

function getSelectedGroupsForPrint(){
  const printed=getPrintedCombinedSuppliers();
  return getSelectedPrintOptions().filter(value=>!printed.has(value));
}

function prepareCountSheetPrint(){
  if(document.body.classList.contains('print-shelftag'))return;
  if(!$('shelfTagPanel')?.hidden&&!$('shelfStep5')?.hidden&&typeof shelfPreparePrint==='function'){
    shelfPreparePrint();
    return;
  }
  if(typeof applyLayout==='function')applyLayout(false);
  if(importedCountSheetPrintActive){
    renderImportedCountSheetTemplate();
    document.body.classList.add('print-imported-count-sheet');
  }else if(typeof renderCountSheet==='function')renderCountSheet();
  Object.values(panels).forEach(panel=>panel.hidden=true);
  $('countSheetPanel').hidden=false;
  document.body.classList.add('print-count-sheet');
}
function finishCountSheetPrint(){
  if(!document.body.classList.contains('print-count-sheet'))return;
  document.body.classList.remove('print-count-sheet');
  document.body.classList.remove('print-imported-count-sheet');
  if(importedCountSheetPrintActive){
    importedCountSheetPrintActive=false;
    showPrintToast(`Print dialog opened for ${importedCountSheetFileName} · ${importedCountSheetRows.length} rows.`);
    return;
  }
  const printedGroups=pendingCombinedPrint;
  const signature=pendingCombinedPrintSignature;
  const scopeKey=pendingCombinedPrintScope;
  pendingCombinedPrint=[];
  pendingCombinedPrintSignature='';
  pendingCombinedPrintScope='';
  if(!printedGroups.length)return;
  if(markCombinedSuppliersPrinted(printedGroups,signature,scopeKey)){
    showPrintToast(`${printedGroups.length} selected ${printedGroups.length===1?'group':'groups'} marked as printed. Choose another or use Reset Printed.`);
  }else if(signature!==getInventoryPrintSignature()){
    showPrintToast('Inventory changed while printing. Print status was not updated; generate the sheets again.');
  }else{
    showPrintToast('Could not save print status. Check browser storage and try again.');
  }
}
function printPreparedCountSheet(action){
  prepareCountSheetPrint();
  pendingCombinedPrint=getSelectedGroupsForPrint();
  pendingCombinedPrintSignature=getInventoryPrintSignature();
  pendingCombinedPrintScope=getPrintStatusScopeKey();
  const supplier=$('supplierFilter')?.value||'all';
  if(typeof persistLocalCycleData==='function')persistLocalCycleData(action,supplier==='all'?'All suppliers':supplier);
  requestAnimationFrame(()=>window.print());
}
$('printSheetBtn').onclick=()=>printPreparedCountSheet('Print requested');
$('exportSheetBtn').onclick=()=>printPreparedCountSheet('PDF export requested');
window.addEventListener('beforeprint',prepareCountSheetPrint);
window.addEventListener('afterprint',finishCountSheetPrint);
$('#printToast .print-toast__close')?.addEventListener('click',dismissPrintToast);

async function readImportedCountSheet(file){
  const extension=file.name.split('.').pop()?.toLowerCase();
  let rows;
  if(extension==='csv')rows=CountSheetImport.rowsFromMatrix(CountSheetImport.parseCsv(await file.text().then(text=>text.replace(/^\uFEFF/,''))));
  else{
    if(!['xls','xlsx','xlsm'].includes(extension))throw new Error('Choose an Excel (.xls, .xlsx, .xlsm) or CSV (.csv) file.');
    if(typeof XLSX==='undefined')throw new Error('Excel support is unavailable. Reload the page and try again.');
    const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
    const firstSheet=workbook.SheetNames[0];
    if(!firstSheet)throw new Error('The Excel file does not contain a worksheet.');
    const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet],{header:1,defval:'',raw:false,blankrows:false});
    rows=CountSheetImport.rowsFromMatrix(matrix);
  }
  return CountSheetImport.mapImportedRows(rows);
}

let importedCountSheetSort={field:'',direction:1};

function renderImportedCountSheetTable(){
  const target=$('manualCountSheetTablePreview');
  if(!target||!importedCountSheetRows.length)return;
  const fields=[
    ['supplier','SUPPLIER'],
    ['locator','LOCATOR'],
    ['sku','SKU'],
    ['barcode','UPC'],
    ['description','DESCRIPTION']
  ];
  target.innerHTML=`<div class="manual-import-preview-heading"><strong>IMPORTED ROWS PREVIEW</strong><span>${importedCountSheetRows.length.toLocaleString()} rows · select a column to sort</span></div><div class="manual-import-table-wrap"><table><thead><tr><th>#</th>${fields.map(([field,label])=>`<th><button type="button" data-import-sort="${field}">${label}${importedCountSheetSort.field===field?(importedCountSheetSort.direction===1?' ↑':' ↓'):''}</button></th>`).join('')}</tr></thead><tbody>${importedCountSheetRows.map((row,index)=>`<tr><td>${index+1}</td>${fields.map(([field])=>`<td>${escapeSheetText(row[field]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  target.hidden=false;
  target.querySelectorAll('[data-import-sort]').forEach(button=>button.addEventListener('click',()=>{
    const field=button.dataset.importSort;
    importedCountSheetSort={field,direction:importedCountSheetSort.field===field?-importedCountSheetSort.direction:1};
    importedCountSheetRows.sort((left,right)=>String(left[field]||'').localeCompare(String(right[field]||''),undefined,{numeric:true,sensitivity:'base'})*importedCountSheetSort.direction);
    renderImportedCountSheetTable();
    if(importedCountSheetPreviewReady)generateImportedCountSheetPreview(false);
  }));
}

function getManualCountSheetFilteredRows(){
  const ccd=$('manualCountSheetCcd').value;
  const department=$('manualCountSheetDepartment').value;
  const supplier=$('manualCountSheetSupplier').value;
  const category=$('manualCountSheetCategory').value;
  return importedCountSheetRows.filter(row=>
    (ccd==='all'||String(row.ccdNo||'').trim()===ccd)&&
    (department==='all'||String(row.departmentCode||'').trim()===department)&&
    (supplier==='all'||CountSheetFilters.normalizeSupplier(row)===supplier)&&
    (category==='all'||CountSheetFilters.normalizeCategory(row)===category)
  );
}

function getManualCountSheetGroupOptions(rows=getManualCountSheetFilteredRows()){
  const mode=$('manualCountSheetGroupMode').value;
  if(mode==='category')return [...new Set(rows.map(CountSheetFilters.normalizeCategory))].sort();
  if(mode==='supplier-category')return [...new Set(rows.map(row=>`${CountSheetFilters.normalizeSupplier(row)} - ${CountSheetFilters.normalizeCategory(row)}`))].sort();
  return [...new Set(rows.map(CountSheetFilters.normalizeSupplier))].sort();
}

function updateManualCountSheetSelect(id,values,allLabel){
  const select=$(id);
  const previous=select.value;
  select.replaceChildren(new Option(allLabel,'all'),...values.map(value=>new Option(value,value)));
  select.value=values.includes(previous)?previous:'all';
}

function syncManualCountSheetFilters(resetSelection=false){
  if(!importedCountSheetRows.length)return;
  const currentCcd=$('manualCountSheetCcd').value;
  const ccds=[...new Set(importedCountSheetRows.map(row=>String(row.ccdNo||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  updateManualCountSheetSelect('manualCountSheetCcd',ccds,'All CCDs');
  const selectedCcd=$('manualCountSheetCcd').value;
  const ccdRows=importedCountSheetRows.filter(row=>selectedCcd==='all'||String(row.ccdNo||'').trim()===selectedCcd);
  const departments=[...new Set(ccdRows.map(row=>String(row.departmentCode||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  updateManualCountSheetSelect('manualCountSheetDepartment',departments,'All departments');
  const selectedDepartment=$('manualCountSheetDepartment').value;
  const departmentRows=ccdRows.filter(row=>selectedDepartment==='all'||String(row.departmentCode||'').trim()===selectedDepartment);
  const suppliers=[...new Set(departmentRows.map(CountSheetFilters.normalizeSupplier))].sort();
  updateManualCountSheetSelect('manualCountSheetSupplier',suppliers,'All suppliers');
  const selectedSupplier=$('manualCountSheetSupplier').value;
  const supplierRows=departmentRows.filter(row=>selectedSupplier==='all'||CountSheetFilters.normalizeSupplier(row)===selectedSupplier);
  const categories=[...new Set(supplierRows.map(CountSheetFilters.normalizeCategory))].sort();
  updateManualCountSheetSelect('manualCountSheetCategory',categories,'All categories');

  const options=getManualCountSheetGroupOptions(getManualCountSheetFilteredRows());
  const preserved=resetSelection?[]:options.filter(option=>selectedImportedCountSheetGroups.has(option));
  selectedImportedCountSheetGroups=new Set(resetSelection?options:preserved);
  syncManualCountSheetGroupList(options);
}

function syncManualCountSheetGroupList(options=getManualCountSheetGroupOptions()){
  const list=$('manualCountSheetGroupList');
  list.replaceChildren();
  if(!options.length){
    const empty=document.createElement('p');
    empty.className='supplier-selection-empty';
    empty.textContent='No groups match these filters.';
    list.appendChild(empty);
    return;
  }
  const actions=document.createElement('div');
  actions.className='supplier-selection-actions';
  const selectAll=document.createElement('button');
  selectAll.type='button';
  selectAll.className='supplier-selection-action';
  selectAll.textContent='Select All';
  selectAll.addEventListener('click',()=>{selectedImportedCountSheetGroups=new Set(options);syncManualCountSheetGroupList(options);invalidateManualCountSheetPreview()});
  const clearAll=document.createElement('button');
  clearAll.type='button';
  clearAll.className='supplier-selection-action';
  clearAll.textContent='Clear All';
  clearAll.addEventListener('click',()=>{selectedImportedCountSheetGroups.clear();syncManualCountSheetGroupList(options);invalidateManualCountSheetPreview()});
  actions.append(selectAll,clearAll);
  list.appendChild(actions);
  options.forEach(option=>{
    const button=document.createElement('button');
    button.type='button';
    const selected=selectedImportedCountSheetGroups.has(option);
    button.className=`supplier-combine-option${selected?' is-selected':''}`;
    button.dataset.selection=option;
    button.setAttribute('aria-pressed',String(selected));
    button.textContent=option;
    button.addEventListener('click',()=>{
      if(selectedImportedCountSheetGroups.has(option))selectedImportedCountSheetGroups.delete(option);
      else selectedImportedCountSheetGroups.add(option);
      syncManualCountSheetGroupList(options);
      invalidateManualCountSheetPreview();
    });
    list.appendChild(button);
  });
}

function invalidateManualCountSheetPreview(message='Filters changed. Generate a new preview to update the count sheet.'){
  importedCountSheetPreviewReady=false;
  $('manualCountSheetPages').replaceChildren();
  $('manualCountSheetPages').hidden=true;
  $('generateImportedCountSheetPreviewBtn').disabled=!importedCountSheetRows.length||!selectedImportedCountSheetGroups.size;
  $('printImportedCountSheetBtn').disabled=true;
  $('exportImportedCountSheetBtn').disabled=true;
  if(importedCountSheetRows.length)toast(message);
}

function renderImportedCountSheetTemplate(){
  const target=$('manualCountSheetPages');
  if(!target||!importedCountSheetRows.length)return false;
  let rows=getManualCountSheetFilteredRows();
  const mode=$('manualCountSheetGroupMode').value;
  const selectedOptions=[...selectedImportedCountSheetGroups];
  if(!rows.length||!selectedOptions.length)return false;
  if(mode==='supplier')rows=rows.filter(row=>selectedOptions.includes(CountSheetFilters.normalizeSupplier(row)));
  else if(mode==='category')rows=rows.filter(row=>selectedOptions.includes(CountSheetFilters.normalizeCategory(row)));
  else rows=rows.filter(row=>selectedOptions.includes(`${CountSheetFilters.normalizeSupplier(row)} - ${CountSheetFilters.normalizeCategory(row)}`));
  if(!rows.length)return false;
  const supplierOptions=[...new Set(rows.map(CountSheetFilters.normalizeSupplier))];
  const categoryOptions=[...new Set(rows.map(CountSheetFilters.normalizeCategory))];
  const printMode=mode==='category'?'category':'supplier';
  const groupMode=mode==='supplier-category'?'supplier-category':mode;
  const renderSelections=mode==='category'?selectedOptions:supplierOptions.filter(supplier=>{
    if(mode==='supplier')return selectedOptions.includes(supplier);
    return selectedOptions.some(option=>option.startsWith(`${supplier} - `));
  });
  const selectedCombinedGroups=$('manualCountSheetCombineMode').value==='combined'
    ?[mode==='category'?'ALL_CATEGORIES_COMBINED':mode==='supplier-category'?'ALL_SUPPLIERS_AND_CATEGORIES_COMBINED':'ALL_SUPPLIERS_COMBINED']
    :selectedOptions;
  renderCountSheet(false,{
    items:rows,
    target,
    imported:true,
    printMode,
    groupMode,
    ccd:$('manualCountSheetCcd').value,
    department:$('manualCountSheetDepartment').value,
    selectedPrintOptions:renderSelections,
    selectedCombinedGroups,
    combineMode:$('manualCountSheetCombineMode').value,
    sortOrder:$('manualCountSheetSortOrder').value
  });
  target.hidden=false;
  return target.querySelectorAll('.reference-sheet').length>0;
}

function generateImportedCountSheetPreview(showToast=true){
  if(!importedCountSheetRows.length||!selectedImportedCountSheetGroups.size){
    toast('Upload a file and select at least one group before generating a preview.');
    return false;
  }
  importedCountSheetPreviewReady=renderImportedCountSheetTemplate();
  $('printImportedCountSheetBtn').disabled=!importedCountSheetPreviewReady;
  $('exportImportedCountSheetBtn').disabled=!importedCountSheetPreviewReady;
  if(!importedCountSheetPreviewReady){
    toast('No imported rows match the selected filters and groups.');
    return false;
  }
  if(showToast)toast(`Preview generated · ${$('manualCountSheetPages').querySelectorAll('.reference-sheet').length} count sheet(s)`);
  return true;
}

function renderImportedCountSheet(){
  $('manualCountSheetFileName').textContent=`Loaded: ${importedCountSheetFileName} · ${importedCountSheetRows.length.toLocaleString()} rows`;
  syncManualCountSheetFilters(true);
  renderImportedCountSheetTable();
  $('manualCountSheetPages').replaceChildren();
  $('manualCountSheetPages').hidden=true;
  importedCountSheetPreviewReady=false;
}

const manualCountSheetFileInput=$('manualCountSheetFileInput');
const manualCountSheetUploadButton=$('uploadManualCountSheetBtn');
const manualCountSheetPrintButton=$('printImportedCountSheetBtn');
const manualCountSheetExportButton=$('exportImportedCountSheetBtn');
const manualCountSheetGenerateButton=$('generateImportedCountSheetPreviewBtn');
manualCountSheetUploadButton?.addEventListener('click',()=>manualCountSheetFileInput?.click());
manualCountSheetGenerateButton?.addEventListener('click',()=>generateImportedCountSheetPreview());
['manualCountSheetCcd','manualCountSheetDepartment','manualCountSheetSupplier','manualCountSheetCategory'].forEach(id=>$(id).addEventListener('change',()=>{
  syncManualCountSheetFilters();
  invalidateManualCountSheetPreview();
}));
['manualCountSheetGroupMode','manualCountSheetCombineMode'].forEach(id=>$(id).addEventListener('change',()=>{
  syncManualCountSheetFilters();
  invalidateManualCountSheetPreview();
}));
$('manualCountSheetSortOrder').addEventListener('change',()=>{
  if(importedCountSheetPreviewReady){
    toast('Updating count-sheet row order…');
    generateImportedCountSheetPreview(false);
  }
});
manualCountSheetFileInput?.addEventListener('change',async()=>{
  const file=manualCountSheetFileInput.files?.[0];
  if(!file)return;
  manualCountSheetPrintButton.disabled=true;
  manualCountSheetExportButton.disabled=true;
  importedCountSheetRows=[];
  selectedImportedCountSheetGroups.clear();
  importedCountSheetPreviewReady=false;
  importedCountSheetFileName='';
  $('manualCountSheetPages').replaceChildren();
  $('manualCountSheetPages').hidden=true;
  $('manualCountSheetTablePreview').replaceChildren();
  $('manualCountSheetTablePreview').hidden=true;
  $('manualCountSheetFileName').textContent='Loading file…';
  try{
    toast(`Reading ${file.name}…`);
    await new Promise(resolve=>requestAnimationFrame(resolve));
    importedCountSheetRows=await readImportedCountSheet(file);
    importedCountSheetFileName=file.name;
    importedCountSheetSort={field:'',direction:1};
    renderImportedCountSheet();
    manualCountSheetPrintButton.disabled=false;
    manualCountSheetExportButton.disabled=false;
    toast(`Loaded ${file.name} · ${importedCountSheetRows.length.toLocaleString()} rows`);
  }catch(error){
    $('manualCountSheetFileName').textContent='No valid file loaded';
    if(typeof toast==='function')toast(`Could not load file: ${error.message}`);
    else showPrintToast(`Could not load file: ${error.message}`);
  }finally{
    manualCountSheetFileInput.value='';
  }
});
function printImportedCountSheet(){
  if(!importedCountSheetRows.length){
    if(typeof toast==='function')toast('Upload a valid Excel or CSV file first.');
    return;
  }
  importedCountSheetPrintActive=true;
  prepareCountSheetPrint();
  requestAnimationFrame(()=>window.print());
}
manualCountSheetPrintButton?.addEventListener('click',printImportedCountSheet);
manualCountSheetExportButton?.addEventListener('click',printImportedCountSheet);
