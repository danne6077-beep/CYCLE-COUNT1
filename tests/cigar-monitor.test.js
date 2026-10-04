const test=require('node:test');
const assert=require('node:assert/strict');
const {escapeCsv,parseSellingSheetRows}=require('../cigar-monitor-utils.js');

function sampleSheet(){
  const rows=Array.from({length:11},()=>[]);
  rows[1][7]='TRANS#';
  rows[1][8]='TX-001';
  rows[3][7]='CS1:';
  rows[3][8]='A';
  rows[4][7]='CS2:';
  rows[4][8]='B';
  rows[5][7]='BAG.:';
  rows[5][8]=4;
  rows[6][7]='FMCG.:';
  rows[6][8]=2;
  rows[2][7]=new Date('2026-07-20T00:00:00.000Z');
  rows[2][12]=new Date('2026-07-21T00:00:00.000Z');
  rows[7]=['SEQ.','SKU','DESRIPTION','UPC',null,'TOTAL','EXPIRY','BEG','W','SALES','JDA_S','ENDING','BEG','W','SALES','JDA_S','ENDING'];
  rows[8]=[1,498080,'CHESTERFIELD MENTHOL',48044172,0,0,null,12,1,3,3,8,8,0,2,2,6];
  rows[9]=[2,499827,'CHESTERFIELD REMIX',48044226,16,16,null,89,null,3,3,86,86,null,2,2,84];
  return rows;
}

test('imports product data, daily stock figures, and metadata from the SELLING sheet layout',()=>{
  const parsed=parseSellingSheetRows(sampleSheet());
  assert.deepEqual(parsed.products[0],{
    sku:'498080',
    description:'CHESTERFIELD MENTHOL',
    upc:'48044172',
    total:0,
    expiry:''
  });
  assert.equal(parsed.records.length,2);
  assert.deepEqual(parsed.records[0],{
    date:'2026-07-20',
    transaction:'TX-001',
    cs1:'A',
    cs2:'B',
    bag:'4',
    fmcg:'2',
    items:[
      {sku:'498080',beginning:12,withdrawal:1,sales:3,jdaSales:3,ending:8},
      {sku:'499827',beginning:89,withdrawal:null,sales:3,jdaSales:3,ending:86}
    ]
  });
});

test('rejects a SELLING sheet without products and invalid daily quantities',()=>{
  assert.throws(()=>parseSellingSheetRows([]),/headers/);
  const rows=sampleSheet();
  rows[8][9]='three';
  assert.throws(()=>parseSellingSheetRows(rows),/Invalid SALES value for SKU 498080 on 2026-07-20/);
});

test('quotes CSV values only when needed and escapes embedded quotes',()=>{
  assert.equal(escapeCsv('Plain value'),'Plain value');
  assert.equal(escapeCsv('A, "B"'),'\"A, \"\"B\"\"\"');
});
