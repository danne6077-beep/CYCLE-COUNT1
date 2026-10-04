let pendingCombinedPrint=[];
let pendingCombinedPrintSignature='';
let importedCountSheetRows=[];
let importedCountSheetFileName='';

function showPrintToast(message='Count sheet sent to printer successfully.'){
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

function getSelectedSuppliersForPrint(){
  if($('supplierGroupingMode')?.value==='all')return [];
  const selected=getSelectedCombinedSuppliers();
  const printed=getPrintedCombinedSuppliers();
  const options=getCombinedGroupOptions();
  return selected.filter(value=>options.includes(value)&&!printed.has(value));
}

function prepareCountSheetPrint(){
  if(document.body.classList.contains('print-imported-count-sheet'))return;
  if(document.body.classList.contains('print-shelftag'))return;
  if(!$('shelfTagPanel')?.hidden&&!$('shelfStep5')?.hidden&&typeof shelfPreparePrint==='function'){
    shelfPreparePrint();
    return;
  }
  if(typeof applyLayout==='function')applyLayout(false);
  if(typeof renderCountSheet==='function')renderCountSheet();
  Object.values(panels).forEach(panel=>panel.hidden=true);
  $('countSheetPanel').hidden=false;
  document.body.classList.add('print-count-sheet');
}
function finishCountSheetPrint(){
  if(!document.body.classList.contains('print-count-sheet'))return;
  document.body.classList.remove('print-count-sheet');
  if(!pendingCombinedPrint.length)return;
  showPrintToast();
}
function printPreparedCountSheet(action){
  prepareCountSheetPrint();
  pendingCombinedPrint=getSelectedSuppliersForPrint();
  pendingCombinedPrintSignature=getInventoryPrintSignature();
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
  if(extension==='csv')return CountSheetImport.rowsFromMatrix(CountSheetImport.parseCsv(await file.text().then(text=>text.replace(/^\uFEFF/,''))));
  if(!['xls','xlsx','xlsm'].includes(extension))throw new Error('Choose an Excel (.xls, .xlsx, .xlsm) or CSV (.csv) file.');
  if(typeof XLSX==='undefined')throw new Error('Excel support is unavailable. Reload the page and try again.');
  const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
  const firstSheet=workbook.SheetNames[0];
  if(!firstSheet)throw new Error('The Excel file does not contain a worksheet.');
  const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet],{header:1,defval:'',raw:false,blankrows:false});
  return CountSheetImport.rowsFromMatrix(matrix);
}

function renderImportedCountSheet(){
  const target=$('manualCountSheetPages');
  const headers=Object.keys(importedCountSheetRows[0]||{});
  if(!target||!headers.length)return;
  const tableHeaders=headers.map(header=>`<th>${escapeSheetText(header)}</th>`).join('');
  const tableRows=importedCountSheetRows.map((row,index)=>`<tr><td>${index+1}</td>${headers.map(header=>`<td>${escapeSheetText(row[header])}</td>`).join('')}</tr>`).join('');
  target.innerHTML=`<article class="manual-import-page"><header><h2>IMPORTED COUNT SHEET</h2><p>${escapeSheetText(importedCountSheetFileName)} · ${importedCountSheetRows.length} rows</p></header><table><thead><tr><th>#</th>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table></article>`;
  target.hidden=false;
}

const manualCountSheetFileInput=$('manualCountSheetFileInput');
const manualCountSheetUploadButton=$('uploadManualCountSheetBtn');
const manualCountSheetPrintButton=$('printImportedCountSheetBtn');
manualCountSheetUploadButton?.addEventListener('click',()=>manualCountSheetFileInput?.click());
manualCountSheetFileInput?.addEventListener('change',async()=>{
  const file=manualCountSheetFileInput.files?.[0];
  if(!file)return;
  manualCountSheetPrintButton.disabled=true;
  importedCountSheetRows=[];
  importedCountSheetFileName='';
  $('manualCountSheetPages').replaceChildren();
  $('manualCountSheetPages').hidden=true;
  $('manualCountSheetFileName').textContent='Loading file…';
  try{
    importedCountSheetRows=await readImportedCountSheet(file);
    importedCountSheetFileName=file.name;
    renderImportedCountSheet();
    manualCountSheetPrintButton.disabled=false;
    $('manualCountSheetFileName').textContent=`Loaded: ${file.name}`;
    showPrintToast(`Loaded ${file.name} successfully.`);
  }catch(error){
    $('manualCountSheetFileName').textContent='No valid file loaded';
    if(typeof toast==='function')toast(`Could not load file: ${error.message}`);
    else showPrintToast(`Could not load file: ${error.message}`);
  }finally{
    manualCountSheetFileInput.value='';
  }
});
manualCountSheetPrintButton?.addEventListener('click',()=>{
  if(!importedCountSheetRows.length){
    if(typeof toast==='function')toast('Upload a valid Excel or CSV file first.');
    return;
  }
  renderImportedCountSheet();
  document.body.classList.add('print-imported-count-sheet');
  requestAnimationFrame(()=>window.print());
});
window.addEventListener('afterprint',()=>{
  document.body.classList.remove('print-imported-count-sheet');
});
