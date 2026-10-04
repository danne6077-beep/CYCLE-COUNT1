(()=>{
  const form=$('cigarExpiryForm');
  const result=$('cigarExpiryResult');
  const status=$('cigarExpiryStatus');

  function showResult(entry){
    result.className='cigars-result';
    result.replaceChildren();
    const expiry=document.createElement('strong');
    expiry.textContent=new Intl.DateTimeFormat(undefined,{dateStyle:'long',timeZone:'UTC'})
      .format(new Date(`${entry.expiryDate}T00:00:00Z`));
    const details=document.createElement('p');
    details.textContent=`${entry.manufacturer} · Manufactured ${new Intl.DateTimeFormat(undefined,{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${entry.manufacturingDate}T00:00:00Z`))}`;
    result.append(expiry,details);
  }

  form.addEventListener('submit',event=>{
    event.preventDefault();
    status.textContent='';
    try{
      const entry=CigarExpiryUtils.decodeBatchCode($('cigarBatchCode').value);
      showResult(entry);
      status.textContent='Expiry date generated.';
    }catch(error){
      result.className='cigars-empty-result';
      result.textContent='No expiry date was generated.';
      status.textContent=error.message;
    }
  });
})();
