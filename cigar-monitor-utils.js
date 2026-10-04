(function(root){
  const fieldNames=['beginning','withdrawal','sales','jdaSales','ending'];

  function normalizeHeader(value){
    return String(value??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  }

  function findHeaderIndex(rows){
    return rows.findIndex(row=>{
      const headers=(row||[]).map(normalizeHeader);
      return headers.includes('SKU')&&headers.some(value=>value==='DESCRIPTION'||value==='DESRIPTION');
    });
  }

  function findDateValue(rows,headerIndex,dateColumn){
    const dateRow=rows[headerIndex-5]||[];
    const value=dateRow[dateColumn];
    if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString().slice(0,10);
    if(typeof value==='number'&&Number.isFinite(value)){
      const date=new Date(Date.UTC(1899,11,30)+Math.round(value)*86400000);
      return date.toISOString().slice(0,10);
    }
    const text=String(value??'').trim();
    const iso=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
    if(iso)return`${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;
    const local=/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
    if(local)return`${local[3]}-${local[1].padStart(2,'0')}-${local[2].padStart(2,'0')}`;
    return'';
  }

  function readMetadata(rows,headerIndex,startColumn,label){
    const rowOffsets={TRANS:0,CS1:2,CS2:3,BAG:4,FMCG:5};
    const rowIndex=headerIndex-6+rowOffsets[label];
    const row=rows[rowIndex]||[];
    for(let column=startColumn+1;column<startColumn+5;column++){
      const value=row[column];
      if(value!==null&&value!==undefined&&String(value).trim()!=='')return String(value).trim();
    }
    return'';
  }

  function numericCell(value,sku,date,field){
    if(value===null||value===undefined||String(value).trim()==='')return null;
    const number=typeof value==='number'?value:Number(String(value).replace(/,/g,'').trim());
    if(!Number.isFinite(number))throw new Error(`Invalid ${field} value for SKU ${sku} on ${date}.`);
    return number;
  }

  function parseSellingSheetRows(rows){
    if(!Array.isArray(rows))throw new Error('The SELLING sheet could not be read.');
    const headerIndex=findHeaderIndex(rows);
    if(headerIndex<6)throw new Error('Could not find the SELLING sheet headers (SKU and DESCRIPTION).');
    const headers=(rows[headerIndex]||[]).map(normalizeHeader);
    const skuColumn=headers.indexOf('SKU');
    const descriptionColumn=headers.findIndex(value=>value==='DESCRIPTION'||value==='DESRIPTION');
    const upcColumn=headers.indexOf('UPC');
    const totalColumn=headers.indexOf('TOTAL');
    const expiryColumn=headers.indexOf('EXPIRY');
    const products=[];
    for(let index=headerIndex+1;index<rows.length;index++){
      const row=rows[index]||[];
      const sku=String(row[skuColumn]??'').trim();
      if(!sku||normalizeHeader(sku)==='SKU')continue;
      products.push({
        sku,
        description:String(row[descriptionColumn]??'').trim(),
        upc:upcColumn>=0?String(row[upcColumn]??'').trim():'',
        total:totalColumn>=0?row[totalColumn]??'':'',
        expiry:expiryColumn>=0?row[expiryColumn]??'':''
      });
    }
    if(!products.length)throw new Error('The SELLING sheet does not contain any products.');

    const records=[];
    const headerRow=rows[headerIndex]||[];
    for(let startColumn=0;startColumn<headerRow.length;startColumn++){
      if(normalizeHeader(headerRow[startColumn])!=='BEG')continue;
      const date=findDateValue(rows,headerIndex,startColumn);
      if(!date)continue;
      const items=products.map(product=>{
        const row=rows.find((candidate,rowIndex)=>rowIndex>headerIndex&&String((candidate||[])[skuColumn]??'').trim()===product.sku)||[];
        return{
          sku:product.sku,
          beginning:numericCell(row[startColumn],product.sku,date,'BEG'),
          withdrawal:numericCell(row[startColumn+1],product.sku,date,'W'),
          sales:numericCell(row[startColumn+2],product.sku,date,'SALES'),
          jdaSales:numericCell(row[startColumn+3],product.sku,date,'JDA_S'),
          ending:numericCell(row[startColumn+4],product.sku,date,'ENDING')
        };
      });
      records.push({
        date,
        transaction:readMetadata(rows,headerIndex,startColumn,'TRANS'),
        cs1:readMetadata(rows,headerIndex,startColumn,'CS1'),
        cs2:readMetadata(rows,headerIndex,startColumn,'CS2'),
        bag:readMetadata(rows,headerIndex,startColumn,'BAG'),
        fmcg:readMetadata(rows,headerIndex,startColumn,'FMCG'),
        items
      });
    }
    return{products,records};
  }

  function escapeCsv(value){
    const text=String(value??'');
    return/[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
  }

  const api={fieldNames,parseSellingSheetRows,escapeCsv};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.CigarMonitorUtils=api;
})(typeof window!=='undefined'?window:globalThis);
