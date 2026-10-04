let pendingCombinedPrint=[];
let pendingCombinedPrintSignature='';

function showPrintToast(message='Count sheet sent to printer successfully.'){
  const toast=$('#printToast');
  if(!toast)return;
  const text=toast.querySelector('p');
  if(text)text.textContent=message;
  toast.hidden=false;
  toast.classList.add('show');
  clearTimeout(showPrintToast.dismissTimer);
  showPrintToast.dismissTimer=setTimeout(()=>{
    toast.classList.remove('show');
    setTimeout(()=>toast.hidden=true,260);
  },3500);
}

function dismissPrintToast(){
  const toast=$('#printToast');
  if(!toast)return;
  toast.classList.remove('show');
  setTimeout(()=>toast.hidden=true,260);
}

function getSelectedSuppliersForPrint(){
  if($('supplierGroupingMode')?.value==='all')return [];
  const selected=getSelectedCombinedSuppliers();
  const printed=getPrintedCombinedSuppliers();
  const options=getCombinedGroupOptions();
  return selected.filter(value=>options.includes(value)&&!printed.has(value));
}

function prepareCountSheetPrint(){
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
  showPrintToast(`Printed ${pendingCombinedPrint.length} group${pendingCombinedPrint.length>1?'s':''} successfully.`);
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
