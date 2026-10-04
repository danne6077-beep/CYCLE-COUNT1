(function(global){
  function parseCsv(text){
    const rows=[];
    let row=[];
    let field='';
    let quoted=false;
    for(let index=0;index<text.length;index++){
      const character=text[index];
      if(quoted){
        if(character==='"'&&text[index+1]==='"'){field+='"';index++}
        else if(character==='"')quoted=false;
        else field+=character;
      }else if(character==='"'&&field==='')quoted=true;
      else if(character===','){row.push(field);field=''}
      else if(character==='\n'||character==='\r'){
        row.push(field);
        if(row.some(value=>String(value).trim()))rows.push(row);
        row=[];
        field='';
        if(character==='\r'&&text[index+1]==='\n')index++;
      }else field+=character;
    }
    if(quoted)throw new Error('The CSV file has an unclosed quoted field.');
    row.push(field);
    if(row.some(value=>String(value).trim()))rows.push(row);
    return rows;
  }

  function rowsFromMatrix(matrix){
    if(!matrix.length)throw new Error('The selected file does not contain a header row.');
    const sourceHeaders=matrix[0].map(value=>String(value??'').trim());
    const columnCount=Math.max(sourceHeaders.length,...matrix.slice(1).map(row=>row.length));
    const seenHeaders=new Map();
    const headers=Array.from({length:columnCount},(_,index)=>{
      const base=sourceHeaders[index]||`Column ${index+1}`;
      const occurrences=(seenHeaders.get(base)||0)+1;
      seenHeaders.set(base,occurrences);
      return occurrences===1?base:`${base} (${occurrences})`;
    });
    const rows=matrix.slice(1)
      .filter(row=>row.some(value=>String(value??'').trim()))
      .map(row=>Object.fromEntries(headers.map((header,index)=>[header,row[index]??''])));
    if(!rows.length)throw new Error('The selected file has column headers but no data rows.');
    return rows;
  }

  const headerAliases={
    supplier:['supplier','supplier name','vendor','vendor name','principal'],
    locator:['locator','locator code','locator no','locator number','location','bin location','selling locator'],
    sku:['sku','sku no','sku number','item code','item no','item number','product code'],
    barcode:['upc','upc code','upc number','upc barcode','upc barcode number','barcode','barcode number','ean','gtin'],
    description:['description','item description','product description','product name','item name','name'],
    ccdNo:['ccd','ccd no','ccd number','ccdno'],
    departmentCode:['department code','dept code','department number','dept no'],
    department:['department','department name','dept name'],
    category:['category','subdepartment','subdept name','classification']
  };

  function normalizeHeader(value){
    return String(value??'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  }

  function mapImportedRows(rows){
    if(!Array.isArray(rows)||!rows.length)throw new Error('The selected file does not contain any data rows.');
    const sourceHeaders=Object.keys(rows[0]);
    const normalizedHeaders=new Map(sourceHeaders.map(header=>[normalizeHeader(header),header]));
    const columns=Object.fromEntries(Object.entries(headerAliases).map(([field,aliases])=>[
      field,
      aliases.map(alias=>normalizedHeaders.get(alias)).find(Boolean)
    ]));
    const read=(row,field)=>columns[field]?String(row[columns[field]]??'').trim():'';
    return rows.map(row=>({
      ...row,
      supplier:read(row,'supplier')||'Unassigned Supplier',
      locator:read(row,'locator'),
      sku:read(row,'sku'),
      barcode:read(row,'barcode'),
      description:read(row,'description'),
      ccdNo:read(row,'ccdNo'),
      departmentCode:read(row,'departmentCode'),
      department:read(row,'department'),
      category:read(row,'category')||'Imported Items'
    }));
  }

  const api={parseCsv,rowsFromMatrix,mapImportedRows};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  global.CountSheetImport=api;
}(typeof window!=='undefined'?window:globalThis));
