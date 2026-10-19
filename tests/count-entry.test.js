const test=require('node:test');
const assert=require('node:assert/strict');
const CountEntry=require('../count-entry-utils.js');

test('count session snapshots imported items and uses imported on-hand quantity as expected',()=>{
  const session=CountEntry.createSession([{sku:'0012',locator:'SA-A1',onHandQty:'10',description:'Milk'}],{store:'014',date:'2026-10-19'},{id:'test-1',now:'2026-10-19T00:00:00.000Z'});
  assert.equal(session.entries[0].sku,'0012');
  assert.equal(session.entries[0].expected,10);
  assert.equal(session.entries[0].status,'pending');
  assert.deepEqual(CountEntry.summarizeSession(session),{total:1,counted:0,missingExpected:0,matched:0,withinTolerance:0,recount:0,approved:0,pending:1});
});

test('count edits are validated, calculate variance, and append an audit trail',()=>{
  const session=CountEntry.createSession([{sku:'A',expectedQty:20}],{}, {id:'test-2',now:'start'});
  CountEntry.updateLine(session,'0','counted','17','Counter','counted-at');
  assert.equal(session.entries[0].variance,-3);
  assert.equal(session.entries[0].variancePct,-15);
  assert.equal(session.entries[0].status,'recount');
  assert.deepEqual(session.entries[0].audit[0],{field:'counted',previous:null,next:17,actor:'Counter',at:'counted-at'});
  assert.throws(()=>CountEntry.updateLine(session,'0','counted','1.5'),/whole number/);
});

test('missing expected quantities are reported and cannot be completed',()=>{
  const session=CountEntry.createSession([{sku:'A'}],{}, {id:'test-3'});
  CountEntry.updateLine(session,'0','counted',5);
  assert.equal(session.entries[0].status,'needs-expected');
  assert.throws(()=>CountEntry.finishSession(session),/expected and counted/);
  CountEntry.updateLine(session,'0','expected',4);
  assert.throws(()=>CountEntry.finishSession(session),/Resolve each variance/);
});

test('variance approval requires a reason and finish records who approved it',()=>{
  const session=CountEntry.createSession([{sku:'A',expectedQty:4}],{}, {id:'test-4'});
  CountEntry.updateLine(session,'0','counted',5,'Counter','one');
  assert.throws(()=>CountEntry.decideLine(session,'0','approved'),/reason/);
  CountEntry.updateLine(session,'0','reason','Damaged stock','Counter','two');
  CountEntry.decideLine(session,'0','approved','Supervisor','three');
  CountEntry.finishSession(session,'Supervisor','four');
  assert.equal(session.status,'completed-with-approvals');
  assert.equal(session.entries[0].audit.at(-1).actor,'Supervisor');
});

test('CSV export quotes cells and neutralizes spreadsheet formulas',()=>{
  const session=CountEntry.createSession([{sku:'=2+3',description:'Milk, "large"',expectedQty:1}],{}, {id:'test-5'});
  CountEntry.updateLine(session,'0','counted',1);
  const csv=CountEntry.toCsv(session);
  assert.match(csv,/"'=2\+3"/);
  assert.match(csv,/"Milk, ""large"""/);
});
