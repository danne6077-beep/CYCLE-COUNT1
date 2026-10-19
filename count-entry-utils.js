(function(root){
  const quantities=root.CountSessionUtils||(typeof require==='function'?require('./count-session-utils.js'):null);
  const text=value=>String(value??'');
  function auditEntry(field,previous,next,actor,at){return {field,previous:previous??null,next:next??null,actor:text(actor)||'This device',at:at||new Date().toISOString()}}
  function createSession(items,metadata={},options={}){
    if(!Array.isArray(items)||!items.length)throw new Error('Import at least one inventory item before starting a count.');
    const id=options.id||`count-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const createdAt=options.now||new Date().toISOString();
    const tolerance=quantities.readQuantity(metadata.tolerance??0,'Variance tolerance');
    return {
      schemaVersion:1,id,status:'open',store:text(metadata.store).trim(),date:text(metadata.date).trim(),
      source:text(metadata.source).trim(),tolerance,createdAt,updatedAt:createdAt,completedAt:null,
      entries:items.map((item,index)=>{
        const expectedSource=item.expectedQty??item.expected??item.onHandQty??null;
        let expected=null;
        try{expected=quantities.readQuantity(expectedSource,'Expected quantity')}catch{}
        return {id:String(index),sourceRow:item._sourceRow||index+2,supplier:text(item.supplier),locator:text(item.locator),sku:text(item.sku),barcode:text(item.barcode),description:text(item.description),expected,counted:null,variance:null,variancePct:null,status:expected===null?'needs-expected':'pending',decision:'pending',reason:'',note:'',audit:[]};
      })
    };
  }
  function updateLine(session,lineId,field,value,actor,at){
    if(!['expected','counted','reason','note'].includes(field))throw new Error('Unsupported count field.');
    const entry=session.entries.find(item=>item.id===String(lineId));
    if(!entry)throw new Error('Count line was not found.');
    let next=value;
    if(field==='expected'||field==='counted')next=quantities.readQuantity(value,field==='expected'?'Expected quantity':'Counted quantity');
    else next=text(value).trim().slice(0,field==='reason'?80:500);
    if(entry[field]===next)return session;
    entry.audit.push(auditEntry(field,entry[field],next,actor,at));
    entry[field]=next;
    if(field==='counted'||field==='expected'){
      entry.decision='pending';
      if(entry.expected===null)Object.assign(entry,{variance:null,variancePct:null,status:'needs-expected'});
      else Object.assign(entry,quantities.calculateVariance(entry.expected,entry.counted,session.tolerance));
      if(entry.counted===null&&entry.expected!==null)entry.status='pending';
    }
    session.updatedAt=at||new Date().toISOString();
    if(session.status!=='open')session.status='open';
    session.completedAt=null;
    return session;
  }
  function decideLine(session,lineId,decision,actor,at){
    if(!['approved','recount'].includes(decision))throw new Error('Choose approve or recount.');
    const entry=session.entries.find(item=>item.id===String(lineId));
    if(!entry)throw new Error('Count line was not found.');
    if(entry.variance===null||entry.variance===0)throw new Error('Only a counted variance can be reviewed.');
    if(decision==='approved'&&!entry.reason)throw new Error('Choose a reason before approving this variance.');
    const previous=entry.decision;
    entry.decision=decision;
    entry.audit.push(auditEntry('decision',previous,decision,actor,at));
    session.updatedAt=at||new Date().toISOString();
    session.status='open';session.completedAt=null;
    return session;
  }
  function setTolerance(session,value,actor,at){
    const next=quantities.readQuantity(value,'Variance tolerance');
    if(next===null)throw new Error('Variance tolerance is required.');
    if(next===session.tolerance)return session;
    const previous=session.tolerance;session.tolerance=next;
    session.entries.forEach(entry=>{
      if(entry.expected!==null){
        const decision=entry.decision;
        Object.assign(entry,quantities.calculateVariance(entry.expected,entry.counted,next));
        entry.decision=decision==='approved'&&entry.variance!==0?'approved':entry.status==='recount'?'pending':entry.status;
      }
    });
    session.audit=session.audit||[];session.audit.push(auditEntry('tolerance',previous,next,actor,at));
    session.updatedAt=at||new Date().toISOString();session.status='open';session.completedAt=null;
    return session;
  }
  function summarizeSession(session){
    const entries=session?.entries||[];
    return {
      total:entries.length,
      counted:entries.filter(entry=>entry.counted!==null&&entry.counted!==undefined).length,
      missingExpected:entries.filter(entry=>entry.expected===null||entry.expected===undefined).length,
      matched:entries.filter(entry=>entry.status==='matched').length,
      withinTolerance:entries.filter(entry=>entry.status==='within-tolerance').length,
      recount:entries.filter(entry=>(entry.status==='recount'||entry.decision==='recount')&&entry.decision!=='approved').length,
      approved:entries.filter(entry=>entry.decision==='approved').length,
      pending:entries.filter(entry=>entry.status==='pending'||entry.status==='needs-expected').length
    };
  }
  function finishSession(session,actor,at){
    const summary=summarizeSession(session);
    if(summary.counted!==summary.total||summary.missingExpected)throw new Error('Enter an expected and counted quantity for every item before completing this session.');
    if(summary.recount)throw new Error('Resolve each variance with a reason or flag it for recount before completing the session.');
    session.status=summary.approved?'completed-with-approvals':'completed';
    session.completedAt=at||new Date().toISOString();session.updatedAt=session.completedAt;
    session.audit=session.audit||[];session.audit.push(auditEntry('status','open',session.status,actor,session.completedAt));
    return session;
  }
  function toCsv(session){
    const quote=value=>{
      let safe=text(value);
      if(/^[\u0000-\u0020]*[=+@]/.test(safe)||/^[\u0000-\u0020]*-(?=\D)/.test(safe))safe=`'${safe}`;
      return `"${safe.replace(/"/g,'""')}"`;
    };
    const headers=['Store','Date','Status','Supplier','Locator','SKU','UPC','Description','Expected','Counted','Variance','Variance %','Review','Reason','Notes'];
    const rows=(session.entries||[]).map(entry=>[
      session.store,session.date,entry.status,entry.supplier,entry.locator,entry.sku,entry.barcode,entry.description,
      entry.expected??'',entry.counted??'',entry.variance??'',entry.variancePct===null?'':Number(entry.variancePct).toFixed(1),entry.decision,entry.reason,entry.note
    ]);
    return [headers,...rows].map(row=>row.map(quote).join(',')).join('\r\n');
  }
  const api={createSession,updateLine,decideLine,setTolerance,summarizeSession,finishSession,toCsv};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.CountEntryUtils=api;
})(typeof window!=='undefined'?window:globalThis);
