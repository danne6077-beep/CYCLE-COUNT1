import {read,write} from '../storage.js';
import {pesos} from './normalize.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const questions=['Pinakamurang bigas','Cheapest cooking oil','Magkano ang itlog?','May ₱500 ako, ano mabibili?','Compare Coke vs Pepsi','Ano ang promo ngayon?'];
export function createAssistant(hooks){
 let worker,ready=false,preparing,busy=false,messages=[],options={language:'auto',julian:true},context={},sequence=0,opener,loaded=false;
 const pending=new Map(),products=new Map();
 const panel=document.createElement('dialog');panel.id='fuji-chat';panel.className='fuji-chat';panel.setAttribute('aria-label','Ask FUJI / Tanungin si FUJI');
 panel.innerHTML=`<header class="fuji-chat-head"><div><p class="eyebrow">YOUR OFFLINE SHOPPING COMPANION</p><h2>Ask FUJI <span aria-hidden="true">✦</span></h2><p id="chat-ready" role="status">Preparing saved catalog…</p></div><button type="button" class="chat-icon" data-chat-close aria-label="Close Ask FUJI">×</button></header><div class="chat-preferences"><label>Language / Wika <select id="chat-language"><option value="auto">Auto</option><option value="en">English</option><option value="tl">Tagalog</option></select></label><label class="chat-egg"><input id="chat-julian" type="checkbox" checked> Julian mode <span>(inside joke)</span></label><button type="button" class="chat-link" data-chat-clear>Clear chat</button></div><div class="chat-scroll"><section class="chat-intro"><span class="chat-mark" aria-hidden="true">F<span>✦</span></span><h3>A little help. A better basket.</h3><p>English, Tagalog o Taglish—ask about the saved Hypermart items, prices and your basket. No online AI, account or message uploads.</p><div id="chat-initial" class="chat-quick">${questions.map(q=>`<button type="button" data-chat-prompt="${esc(q)}">${esc(q)}</button>`).join('')}</div></section><div id="chat-log" class="chat-log" role="log" aria-label="Conversation with FUJI" aria-live="polite" aria-relevant="additions" aria-atomic="false"></div><p id="chat-busy" class="chat-busy" role="status" hidden>FUJI is checking the saved catalog / Tinitingnan ni FUJI ang catalog…</p><div id="chat-error" class="chat-error" role="alert" hidden><p></p><button type="button" data-chat-retry>Retry / Subukan muli</button></div></div><footer class="chat-compose"><form id="chat-form"><label class="sr-only" for="chat-input">Ask FUJI a question / Magtanong kay FUJI</label><textarea id="chat-input" rows="1" placeholder="Ask / Magtanong…" maxlength="500" required></textarea><button type="submit" class="chat-send" aria-label="Send question">↑</button></form><span id="chat-count" hidden>0 / 500</span><p class="chat-disclaimer">Prices may not always be accurate. Estimate only. Final prices are confirmed at the cashier.</p></footer>`;
 document.body.append(panel);
 const launcher=document.createElement('button');launcher.id='chat-launcher';launcher.className='chat-launcher';launcher.type='button';launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-controls','fuji-chat');launcher.textContent='✦ Ask FUJI';launcher.addEventListener('click',open);document.body.append(launcher);
 const $=selector=>panel.querySelector(selector);
 function status(text){$('#chat-ready').textContent=text;}
 function showError(error){$('#chat-error').hidden=false;$('#chat-error p').textContent=error.message||'Offline assistant could not start. Connect once to prepare the catalog, then retry.';}
 function request(type,payload={}){
  return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});worker.postMessage({id,type,...payload});});
 }
 async function load(){if(loaded)return;const [saved,prefs,focus]=await Promise.all([read('chat-history'),read('chat-settings'),read('chat-context')]);messages=Array.isArray(saved)?saved.slice(-200):[];if(prefs)options={...options,...prefs};context=focus||{};$('#chat-language').value=options.language;$('#chat-julian').checked=options.julian;for(const message of messages)for(const p of message.response?.cards||[])products.set(p.sku,p);loaded=true;}
 async function prepare(){
  if(ready)return;if(preparing)return preparing;
  preparing=(async()=>{
   await load();status('Preparing saved catalog…');$('#chat-error').hidden=true;
   if(!worker){worker=new Worker(new URL('./worker.js?v=chat1',import.meta.url),{type:'module'});worker.onmessage=event=>{const data=event.data,job=pending.get(data.id);if(!job)return;pending.delete(data.id);if(data.error)job.reject(new Error(data.error));else job.resolve(data);};worker.onerror=()=>{const error=new Error('The offline worker could not start. Reconnect once and retry.');for(const job of pending.values())job.reject(error);pending.clear();worker.terminate();worker=null;ready=false;showError(error);};}
   const result=await request('init',{context});ready=true;$('.chat-egg').hidden=!result.enableJulian;
   if('serviceWorker' in navigator){await navigator.serviceWorker.ready;status(`Offline ready ✓ · ${result.count.toLocaleString()} saved items`);}else status(`Saved catalog ready · ${result.count.toLocaleString()} items; offline page installation is unavailable in this browser.`);
  })().catch(error=>{ready=false;showError(error);throw error;}).finally(()=>{preparing=null;});return preparing;
 }
 async function persist(){messages=messages.slice(-200);await Promise.all([write('chat-history',messages),write('chat-context',context),write('chat-settings',options)]);}
 const localLabel=(r,en,tl)=>r.lang==='en'?en:tl;
 function productTable(r){
  if(!r.table?.rows?.length)return '';
  const rows=r.table.rows,product=r.table.kind==='products';
  return `<div class="chat-table-wrap" tabindex="0"><table class="chat-table"><caption>${localLabel(r,'Saved catalog breakdown','Detalye mula sa na-save na catalog')}</caption><thead><tr><th scope="col">#</th><th scope="col">${localLabel(r,'Item','Item')}</th><th scope="col">${localLabel(r,product?'Size (label)':'Qty',product?'Sukat (pangalan)':'Dami')}</th><th scope="col">${localLabel(r,'Price','Presyo')}</th><th scope="col">${localLabel(r,product?'Unit cost (label)':'Subtotal',product?'Unit cost (pangalan)':'Subtotal')}</th></tr></thead><tbody>${rows.map((p,i)=>`<tr><th scope="row">${i+1}</th><td>${esc(p.name)}<small>SKU ${esc(p.id)}</small></td><td>${product?esc(p.size||localLabel(r,'Not listed','Walang nakalista')):p.quantity}</td><td>${p.priceCentavos==null?localLabel(r,'Unknown','Hindi alam'):pesos(p.priceCentavos)}</td><td>${product?p.unitPrice?pesos(p.unitPrice.displayCentavos)+' / '+esc(p.unitPrice.displayUnit):localLabel(r,'Unknown','Hindi alam'):p.subtotalCentavos==null?localLabel(r,'Unknown','Hindi alam'):pesos(p.subtotalCentavos)}</td></tr>`).join('')}</tbody></table></div>`;
 }
 function renderMessage(message){
  const time=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(message.time)),r=message.response;
  if(message.role==='user')return `<article class="message user" aria-label="You"><p>${esc(message.text)}</p><time datetime="${esc(message.time)}">${time}</time></article>`;
  return `<article class="message assistant" data-chat-intent="${esc(r.intent)}" aria-label="FUJI answer"><div class="chat-author">FUJI <span>· Offline catalog assistant</span></div><p class="chat-answer">${esc(r.text)}</p>${productTable(r)}${r.cards?.length?`<div class="chat-products">${r.cards.map(p=>`<section class="chat-product"><div><small>${esc(p.category)} · SKU ${esc(p.sku)}</small><h4>${esc(p.name)}</h4><p class="chat-price">${p.priceCentavos==null?localLabel(r,'Price unavailable','Walang presyo'):pesos(p.priceCentavos)}</p><p>${esc(p.parsedSize?.label||localLabel(r,'Size not listed','Walang nakalistang sukat'))}${p.parsedSize?' · '+localLabel(r,'from product name; verify pack','mula sa pangalan; tiyakin ang pack'):''}</p>${p.unitPrice?`<p class="chat-unit-price">${pesos(p.unitPrice.displayCentavos)} / ${esc(p.unitPrice.displayUnit)} · ${localLabel(r,'label estimate','tantiya sa pangalan')}</p>`:''}${p.aisle?`<p>${esc(p.aisle)}</p>`:''}</div><button type="button" data-chat-add="${esc(p.sku)}" aria-label="${localLabel(r,'Add','Idagdag')} ${esc(p.name)} ${localLabel(r,'to basket','sa basket')}">${localLabel(r,'Add to basket','Idagdag sa basket')} +</button></section>`).join('')}</div>`:''}<div class="chat-response-actions">${(r.actions||[]).filter(a=>!a.auto).map((a,i)=>`<button type="button" data-chat-effect="${esc(message.id)}:${i}">${esc(a.label)}</button>`).join('')}<button type="button" data-chat-copy="${esc(message.id)}">${localLabel(r,'Copy answer','Kopyahin ang sagot')}</button></div><div class="chat-quick">${(r.quickReplies||[]).slice(0,4).map(q=>`<button type="button" data-chat-prompt="${esc(q)}">${esc(q)}</button>`).join('')}</div><time datetime="${esc(message.time)}">${time}</time></article>`;
 }
 function append(message){$('#chat-log').insertAdjacentHTML('beforeend',renderMessage(message));const last=$('#chat-log').lastElementChild;last?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
 function restoreHistory(){$('#chat-log').setAttribute('aria-live','off');$('#chat-log').innerHTML=messages.map(renderMessage).join('');requestAnimationFrame(()=>$('#chat-log').setAttribute('aria-live','polite'));}
 async function open(){
  if(panel.open)return;opener=document.activeElement;panel.showModal();launcher.hidden=true;await load();restoreHistory();prepare().catch(()=>{});if(matchMedia('(min-width:800px)').matches)$('#chat-input').focus();
 }
 function close(){panel.close();}
 panel.addEventListener('close',()=>{launcher.hidden=false;if(opener?.isConnected)opener.focus();});
 function viewport(){if(!panel.open)return;const height=window.visualViewport?.height||innerHeight;panel.style.setProperty('--chat-height',height+'px');panel.style.setProperty('--chat-top',(window.visualViewport?.offsetTop||0)+'px');}
 window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);panel.addEventListener('toggle',viewport);
 function mutate(type,payload){
  const before=hooks.snapshot();let done=false;
  if(type==='basket-add'){const p=products.get(payload.sku);if(p)done=hooks.add(p,payload.quantity||1)!==false;}
  if(type==='basket-remove')done=hooks.remove(payload.sku,payload.quantity||1)!==false;
  if(type==='confirm-clear'){if(!window.confirm('Clear all items from your basket? / Alisin ang lahat ng laman ng basket?'))return;hooks.clear();done=true;}
  if(done){hooks.notify('Basket updated / Na-update ang basket.',()=>hooks.restore(before));let change=$('#chat-basket-change');if(!change){change=document.createElement('div');change.id='chat-basket-change';change.className='chat-basket-change';change.setAttribute('role','status');$('.chat-compose').prepend(change);}change.replaceChildren(document.createTextNode('Basket updated / Na-update ang basket. '));const undo=document.createElement('button');undo.type='button';undo.textContent='Undo / Ibalik';undo.addEventListener('click',()=>{hooks.restore(before);change.replaceChildren(document.createTextNode('Basket change undone / Naibalik ang basket.'));});change.append(undo);}
 }
 async function send(value){
  const question=String(value??'').trim().slice(0,500);if(!question||busy)return;
  busy=true;$('#chat-input').value='';$('#chat-count').hidden=true;$('#chat-busy').hidden=false;$('.chat-send').disabled=true;
  const user={id:crypto.randomUUID(),role:'user',text:question,time:new Date().toISOString()};messages.push(user);append(user);
  try{await prepare();const state=hooks.getState(),result=await request('query',{question,options:{...options,basket:state.cart,budget:state.budget,day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}}),response=result.response;
   for(const p of response.cards||[])products.set(p.sku,p);context=response.context||{};
   const message={id:crypto.randomUUID(),role:'assistant',response,time:new Date().toISOString(),elapsedMs:result.elapsedMs};messages.push(message);append(message);
   for(const action of response.actions||[])if(action.auto)mutate(action.type,action.payload);
   await persist();
  }catch(error){showError(error);}finally{busy=false;$('#chat-busy').hidden=true;$('.chat-send').disabled=false;}
 }
 $('#chat-form').addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();send($('#chat-input').value);});
 $('#chat-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#chat-form').requestSubmit();}});
 $('#chat-input').addEventListener('input',()=>{const count=$('#chat-input').value.length;$('#chat-count').textContent=count+' / 500';$('#chat-count').hidden=count<400;});
 $('#chat-language').addEventListener('change',()=>{options.language=$('#chat-language').value;write('chat-settings',options).catch(showError);});
 $('#chat-julian').addEventListener('change',()=>{options.julian=$('#chat-julian').checked;write('chat-settings',options).catch(showError);});
 panel.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-chat-close'))close();
  if(button.dataset.chatPrompt)send(button.dataset.chatPrompt);
  if(button.dataset.chatAdd)mutate('basket-add',{sku:button.dataset.chatAdd,quantity:1});
  if(button.dataset.chatEffect){const [id,i]=button.dataset.chatEffect.split(':'),message=messages.find(m=>m.id===id),action=message?.response.actions[+i];if(action)mutate(action.type,action.payload);}
  if(button.dataset.chatCopy){const message=messages.find(m=>m.id===button.dataset.chatCopy);try{await navigator.clipboard.writeText(message.response.text+'\n'+(message.response.table?.rows||[]).map(p=>p.name+' '+(p.priceCentavos==null?'Unknown':pesos(p.priceCentavos))).join('\n'));hooks.notify('Answer copied / Nakopya ang sagot.');}catch{hooks.notify('Copy unavailable. Select the answer text to copy it.');}}
  if(button.hasAttribute('data-chat-clear')&&window.confirm('Clear saved chat history on this device? / Burahin ang na-save na usapan?')){messages=[];context={};restoreHistory();if(worker){worker.terminate();worker=null;ready=false;}await persist();prepare().catch(()=>{});}
  if(button.hasAttribute('data-chat-retry')){if(worker){worker.terminate();worker=null;}ready=false;prepare().catch(()=>{});}
 });
 return {open,send,prepare,destroy(){worker?.terminate();worker=null;for(const job of pending.values())job.reject(new Error('Assistant closed.'));pending.clear();ready=false;}};
}
