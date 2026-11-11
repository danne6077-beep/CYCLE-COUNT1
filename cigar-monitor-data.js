(function(root){
  const metadata = {transaction:'TRANS#', cs1:'CS1', cs2:'CS2', bag:'BAG', fmcg:'FMCG'};
  const inputFields = {beginning:'BEG', withdrawal:'W', sales:'SALES', jdaSales:'JDA_S'};
  const dayMs = 86400000;
  const numberFormat = new Intl.NumberFormat(undefined, {maximumFractionDigits:2});
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const own = (value, key) => Object.hasOwn(value, key) ? value[key] : undefined;
  const validNumber = value => typeof value === 'number' && Number.isFinite(value);

  function localDate(date = new Date()){
    return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
  }

  function validDate(value){
    if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
  }

  function addDays(value, days){
    return new Date(Date.parse(value)+days*dayMs).toISOString().slice(0,10);
  }

  function weekStart(value){
    return addDays(value, -((new Date(value).getUTCDay()+6)%7));
  }

  function parseQuantity(value){
    const text = String(value ?? '').trim();
    if(!text) return null;
    const number = Number(text.replace(/,/g,''));
    return Number.isFinite(number) ? number : null;
  }

  function ending(values){
    const {beginning, withdrawal, sales} = values;
    if(![beginning, withdrawal, sales].some(validNumber)) return null;
    return (beginning ?? 0) + (withdrawal ?? 0) - (sales ?? 0);
  }

  function variance(values){
    if(![values.sales, values.jdaSales].some(validNumber)) return null;
    return (values.sales ?? 0) - (values.jdaSales ?? 0);
  }

  function hasEntry(item){
    return item.entered ?? [...Object.keys(inputFields),'ending'].some(field => validNumber(item[field]));
  }

  function totals(items){
    let sales = null, jdaSales = null, entered = 0, mismatches = 0;
    for(const item of items){
      if(validNumber(item.sales)) sales = (sales ?? 0) + item.sales;
      if(validNumber(item.jdaSales)) jdaSales = (jdaSales ?? 0) + item.jdaSales;
      if(hasEntry(item)) entered++;
      if(variance(item)) mismatches++;
    }
    return {sales, jdaSales, variance:variance({sales,jdaSales}), entered, mismatches};
  }

  function formatNumber(value){
    return validNumber(value) ? numberFormat.format(value) : '—';
  }

  function formatSigned(value){
    return validNumber(value) && value > 0 ? '+'+formatNumber(value) : formatNumber(value);
  }

  function dateLabel(value, options = {month:'short',day:'numeric'}){
    return new Intl.DateTimeFormat(undefined,{...options,timeZone:'UTC'}).format(new Date(value));
  }

  function movingAverage(records, summaries){
    const values = [];
    let start = 0, total = 0, count = 0;
    records.forEach(({date}, index) => {
      const first = addDays(date,-6);
      while(start < index && records[start].date < first){
        const removed = summaries[start++].sales;
        if(removed !== null){total -= removed; count--;}
      }
      const sales = summaries[index].sales;
      if(sales !== null){total += sales; count++;}
      values.push(count ? total/count : null);
    });
    return values;
  }

  function latestStock(records, end){
    const stock = new Map();
    for(const record of records){
      if(record.date > end) break;
      for(const item of record.items){
        if(validNumber(item.ending)) stock.set(item.sku,item.ending);
      }
    }
    return stock;
  }

  function topSales(records){
    const salesBySku = new Map();
    for(const {items} of records){
      for(const item of items){
        if(validNumber(item.sales)) salesBySku.set(item.sku,(salesBySku.get(item.sku) ?? 0)+item.sales);
      }
    }
    return [...salesBySku].filter(([,sales]) => sales > 0).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,10);
  }

  function validateBackup(backup){
    if(!object(backup) || backup.format !== 'fuji-cigarette-monitor' || backup.version !== 1 ||
      !Array.isArray(backup.products) || !Array.isArray(backup.records) || !object(backup.drafts)){
      throw new Error('Choose a Cigarette Monitor JSON backup.');
    }
    const dates = new Set();
    const scalar = value => value == null || typeof value === 'string' || validNumber(value);
    for(const product of backup.products){
      if(!object(product) || typeof product.sku !== 'string' || !product.sku.trim() ||
        !['description','upc','total','expiry'].every(key => scalar(product[key]))){
        throw new Error('The backup contains an invalid product.');
      }
    }
    for(const record of backup.records){
      if(!object(record) || !validDate(record.date) || dates.has(record.date) || !Array.isArray(record.items) ||
        !Object.keys(metadata).every(key => scalar(record[key]))){
        throw new Error('The backup contains an invalid or duplicate daily entry.');
      }
      for(const item of record.items){
        if(!object(item) || typeof item.sku !== 'string' || !item.sku.trim() ||
          ![...Object.keys(inputFields),'ending'].every(key => item[key] == null || validNumber(item[key])) ||
          (item.entered !== undefined && typeof item.entered !== 'boolean')){
          throw new Error('The backup contains invalid SKU figures.');
        }
      }
      dates.add(record.date);
    }
    for(const [date,draft] of Object.entries(backup.drafts)){
      if(!validDate(date) || !object(draft) || !object(draft.fields) || !object(draft.items) ||
        !Object.entries(draft.fields).every(([key,value]) => Object.hasOwn(metadata,key) && typeof value === 'string')){
        throw new Error('The backup contains an invalid draft.');
      }
      for(const fields of Object.values(draft.items)){
        if(!object(fields) || !Object.entries(fields).every(([key,value]) => Object.hasOwn(inputFields,key) && typeof value === 'string')){
          throw new Error('The backup contains invalid draft figures.');
        }
      }
    }
    return backup;
  }

  const api = {metadata, inputFields, own, validNumber, localDate, validDate, addDays, weekStart, parseQuantity, ending, variance, hasEntry, totals,
    formatNumber, formatSigned, dateLabel, movingAverage, latestStock, topSales, validateBackup};
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CigarMonitorData = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
