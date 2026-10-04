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

  const api={parseCsv,rowsFromMatrix};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  global.CountSheetImport=api;
}(typeof window!=='undefined'?window:globalThis));
