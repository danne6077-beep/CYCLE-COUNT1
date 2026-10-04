(function(root){
  function toIsoDate(year,month,day){
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
    return date.toISOString().slice(0,10);
  }

  function getExpiryDate(manufacturingDate){
    const [year,month,day]=manufacturingDate.split('-').map(Number);
    const expiryYear=year+1;
    const lastDay=new Date(Date.UTC(expiryYear,month,0)).getUTCDate();
    return toIsoDate(expiryYear,month,Math.min(day,lastDay));
  }

  function decodeBatchCode(input){
    const code=String(input??'').trim().toUpperCase();
    if(!code)throw new Error('Enter a cigarette batch code.');

    const pmftcMatch=/^([A-Z])([A-Z0-9])(\d{2})(\d)(\d{3})[A-Z0-9]{2}$/.exec(code);
    let manufacturer;
    let manufacturingDate;

    if(pmftcMatch){
      manufacturer='PMFTC';
      const yearDigit=Number(pmftcMatch[4]);
      const year=2020+yearDigit;
      const dayOfYear=Number(pmftcMatch[5]);
      const yearStart=Date.UTC(year,0,1);
      const daysInYear=(Date.UTC(year+1,0,1)-yearStart)/86400000;
      if(dayOfYear<1||dayOfYear>daysInYear)throw new Error('The PMFTC batch code contains an invalid production day.');
      const date=new Date(yearStart+(dayOfYear-1)*86400000);
      manufacturingDate=toIsoDate(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate());
    }else{
      const jtiMatch=/^[A-Z0-9]([A-L])([A-J])(\d{2})[A-Z0-9]{3}$/.exec(code);
      if(!jtiMatch)throw new Error('Code format not recognized. Enter a JTI code (e.g. 6EF27C52) or PMFTC code (e.g. MB23619110).');
      manufacturer='JTI';
      const month=jtiMatch[1].charCodeAt(0)-64;
      const year=2021+jtiMatch[2].charCodeAt(0)-65;
      manufacturingDate=toIsoDate(year,month,Number(jtiMatch[3]));
      if(!manufacturingDate)throw new Error('The JTI batch code contains an invalid production date.');
    }

    return {
      manufacturer,
      manufacturingDate,
      expiryDate:getExpiryDate(manufacturingDate)
    };
  }

  const api={decodeBatchCode};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.CigarExpiryUtils=api;
})(typeof window!=='undefined'?window:globalThis);
