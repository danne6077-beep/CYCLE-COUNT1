const DB='fuji-shopper-v1';
let connection,unavailable=false;
const memory=new Map(),health={persistent:true,reason:null};
const tag=(key,store)=>store+'|'+key;
const degraded=error=>{health.persistent=false;health.reason=error?.name||'StorageUnavailable';};
export const storageStatus=()=>({...health});
export async function database(){
 if(unavailable)throw new Error('Device storage unavailable');
 if(!connection)connection=new Promise((resolve,reject)=>{try{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{for(const name of ['state','catalog'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name);};r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=null;};resolve(r.result);};r.onerror=()=>reject(r.error);}catch(error){reject(error);}}).catch(error=>{connection=null;unavailable=true;degraded(error);throw error;});return connection;
}
async function readRaw(key,store='state'){
 const id=tag(key,store);if(memory.has(id))return structuredClone(memory.get(id));
 try{const db=await database();return await new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}catch(error){degraded(error);return undefined;}
}
async function writeRaw(key,value,store='state'){
 try{const db=await database();await new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});memory.delete(tag(key,store));return true;}catch(error){memory.set(tag(key,store),structuredClone(value));degraded(error);return false;}
}
let historyWrites=Promise.resolve();
export async function read(key,store='state'){
 if(key!=='chat-history'||store!=='state')return readRaw(key,store);
 await historyWrites;const manifest=await readRaw('chat-history-manifest');
 if(!manifest?.ids)return readRaw(key,store);
 return (await Promise.all(manifest.ids.map(id=>readRaw('chat-message:'+id)))).filter(Boolean);
}
async function saveHistory(value,changedIds){
 const messages=value.slice(-200),manifest=await readRaw('chat-history-manifest'),oldIds=manifest?.ids||[],old=new Set(oldIds),dirty=changedIds?new Set(changedIds):null;
 const ids=messages.map(m=>m.id),changed=messages.filter(m=>!old.has(m.id)||!dirty||dirty.has(m.id)||memory.has(tag('chat-message:'+m.id,'state'))),removed=oldIds.filter(id=>!ids.includes(id));
 try{
  const db=await database();await new Promise((resolve,reject)=>{
   const t=db.transaction('state','readwrite'),s=t.objectStore('state');
   // Chain IDB requests: each small record serializes in its own event, while the transaction stays atomic.
   const tasks=[...changed.map(m=>()=>s.put(m,'chat-message:'+m.id)),...removed.map(id=>()=>s.delete('chat-message:'+id)),()=>s.delete('chat-history'),()=>s.put({version:1,ids},'chat-history-manifest')];let i=0;
   const next=()=>{try{if(i<tasks.length){const r=tasks[i++]();r.onsuccess=next;}}catch(error){t.abort();reject(error);}};t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);next();
  });
  for(const id of [...ids,...removed])memory.delete(tag('chat-message:'+id,'state'));memory.delete(tag('chat-history-manifest','state'));memory.delete(tag('chat-history','state'));return true;
 }catch(error){
  degraded(error);for(let i=0;i<changed.length;i++){const m=changed[i];memory.set(tag('chat-message:'+m.id,'state'),structuredClone(m));if(i%4===3)await new Promise(resolve=>setTimeout(resolve,0));}
  for(const id of removed)memory.delete(tag('chat-message:'+id,'state'));memory.set(tag('chat-history-manifest','state'),{version:1,ids});memory.delete(tag('chat-history','state'));return false;
 }
}
export function write(key,value,store='state',changedIds=null){
 if(key!=='chat-history'||store!=='state'||!Array.isArray(value))return writeRaw(key,value,store);
 const result=historyWrites.then(()=>saveHistory(value,changedIds));historyWrites=result.catch(()=>{});return result;
}
export async function remove(key,store='state'){
 memory.delete(tag(key,store));try{const db=await database();await new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).delete(key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}catch(error){degraded(error);}
}
export async function clearStore(store){
 for(const key of memory.keys())if(key.startsWith(store+'|'))memory.delete(key);
 try{const db=await database();await new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).clear();t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}catch(error){degraded(error);}
}
export async function deleteLocalData(){
 await historyWrites;
 memory.clear();if(connection){(await connection).close();connection=null;}
 if(!unavailable)await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(DB);r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Close other FUJI shopper tabs and try again.'));});
 try{for(const key of await caches.keys())if(key.startsWith('fuji-shopper'))await caches.delete(key);}catch{}
 try{localStorage.removeItem('fuji-shopper-theme');}catch{}
}
