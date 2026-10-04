(function(root){
  function parseDateOnly(value){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
    if(!match)throw new Error('Enter a valid expiry date.');
    const year=Number(match[1]);
    const month=Number(match[2]);
    const day=Number(match[3]);
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new Error('Enter a valid expiry date.');
    return date;
  }

  function checkExpiry({expiryDate,minimumDays,now=new Date()}){
    const expiry=parseDateOnly(expiryDate);
    if(String(minimumDays??'').trim()==='')throw new Error('Enter a minimum remaining shelf-life threshold of zero or more whole days.');
    const threshold=Number(minimumDays);
    if(!Number.isInteger(threshold)||threshold<0)throw new Error('Enter a minimum remaining shelf-life threshold of zero or more whole days.');
    const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
    const daysRemaining=Math.floor((expiry.getTime()-today)/86400000);
    const expired=daysRemaining<=0;
    const belowThreshold=!expired&&daysRemaining<threshold;
    return {
      decision:expired?'reject-expired':belowThreshold?'reject-shelf-life':'accept',
      daysRemaining,
      minimumDays:threshold,
      expiryDate:String(expiryDate)
    };
  }

  const api={checkExpiry};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.CigarExpiryUtils=api;
})(typeof window!=='undefined'?window:globalThis);
