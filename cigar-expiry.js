(()=>{
  const storageKey='fuji-cigar-expiry-checks-v1';
  const form=$('cigarExpiryForm');
  const result=$('cigarExpiryResult');
  const status=$('cigarExpiryStatus');
  const historyBody=$('cigarExpiryHistory');
  const historyCount=$('cigarExpiryHistoryCount');

  function readHistory(){
    const raw=localStorage.getItem(storageKey);
    if(!raw)return [];
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed))throw new Error('Saved expiry-check history is not in a supported format.');
    return parsed;
  }

  function addCell(row,value){
    const cell=document.createElement('td');
    cell.textContent=String(value??'');
    row.append(cell);
  }

  function renderHistory(){
    try{
      const history=readHistory();
      historyCount.textContent=`${history.length} ${history.length===1?'check':'checks'}`;
      historyBody.replaceChildren();
      if(!history.length){
        const row=document.createElement('tr');
        const cell=document.createElement('td');
        cell.colSpan=8;
        cell.textContent='No checks saved yet.';
        row.append(cell);
        historyBody.append(row);
        return;
      }
      history.forEach(entry=>{
        const row=document.createElement('tr');
        row.className=`cigars-history-${entry.decision}`;
        addCell(row,new Date(entry.checkedAt).toLocaleString());
        addCell(row,entry.manufacturer);
        addCell(row,entry.batchCode||'—');
        addCell(row,entry.skuBarcode||'—');
        addCell(row,entry.expiryDate);
        addCell(row,entry.daysRemaining);
        addCell(row,entry.minimumDays);
        addCell(row,entry.decisionLabel);
        historyBody.append(row);
      });
    }catch(error){
      historyCount.textContent='Unavailable';
      historyBody.replaceChildren();
      const row=document.createElement('tr');
      const cell=document.createElement('td');
      cell.colSpan=8;
      cell.textContent=`Could not read saved checks: ${error.message}`;
      row.append(cell);
      historyBody.append(row);
    }
  }

  function showResult(entry){
    result.className=`cigars-result cigars-result-${entry.decision}`;
    result.replaceChildren();
    const title=document.createElement('strong');
    title.textContent=entry.decisionLabel;
    const details=document.createElement('dl');
    [
      ['Expiry date',entry.expiryDate],
      ['Days remaining',`${entry.daysRemaining} days`],
      ['Minimum required',`${entry.minimumDays} days`]
    ].forEach(([label,value])=>{
      const term=document.createElement('dt');
      term.textContent=label;
      const description=document.createElement('dd');
      description.textContent=value;
      details.append(term,description);
    });
    result.append(title,details);
  }

  function saveCheck(entry){
    const history=readHistory();
    history.unshift(entry);
    localStorage.setItem(storageKey,JSON.stringify(history.slice(0,100)));
  }

  form.addEventListener('submit',event=>{
    event.preventDefault();
    status.textContent='';
    try{
      const manufacturer=$('cigarManufacturer').value;
      const batchCode=$('cigarBatchCode').value.trim();
      const skuBarcode=$('cigarSkuBarcode').value.trim();
      if(!manufacturer)throw new Error('Select a manufacturer.');
      if(!batchCode&&!skuBarcode)throw new Error('Enter a batch code or SKU / barcode to identify the delivery.');
      const check=CigarExpiryUtils.checkExpiry({
        expiryDate:$('cigarExpiryDate').value,
        minimumDays:$('cigarMinimumDays').value
      });
      const decisionLabel=check.decision==='accept'
        ?'ACCEPT / RECEIVE'
        :check.decision==='reject-expired'
          ?'REJECT / EXPIRED'
          :'REJECT / BELOW MINIMUM SHELF LIFE';
      const entry={
        ...check,
        manufacturer,
        batchCode,
        skuBarcode,
        manufacturingDate:$('cigarManufacturingDate').value,
        decisionLabel,
        checkedAt:new Date().toISOString()
      };
      showResult(entry);
      try{
        saveCheck(entry);
        renderHistory();
        status.textContent='Decision saved to this browser.';
      }catch(error){
        status.textContent=`Decision calculated, but history could not be saved: ${error.message}`;
      }
    }catch(error){
      result.className='cigars-empty-result';
      result.textContent='No receiving decision was made.';
      status.textContent=error.message;
    }
  });

  $('clearCigarExpiryForm').addEventListener('click',()=>{
    form.reset();
    result.className='cigars-empty-result';
    result.textContent='Enter a verified expiry date and required shelf-life threshold to check a delivery.';
    status.textContent='';
    $('cigarManufacturer').focus();
  });

  renderHistory();
})();
