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
export async function read(key,store='state'){
 const id=tag(key,store);if(memory.has(id))return structuredClone(memory.get(id));
 try{const db=await database();return await new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}catch(error){degraded(error);return undefined;}
}
export async function write(key,value,store='state'){
 memory.set(tag(key,store),structuredClone(value));
 try{const db=await database();await new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});return true;}catch(error){degraded(error);return false;}
}
export async function remove(key,store='state'){
 memory.delete(tag(key,store));try{const db=await database();await new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).delete(key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}catch(error){degraded(error);}
}
export async function clearStore(store){
 for(const key of memory.keys())if(key.startsWith(store+'|'))memory.delete(key);
 try{const db=await database();await new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).clear();t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}catch(error){degraded(error);}
}
export async function deleteLocalData(){
 memory.clear();if(connection){(await connection).close();connection=null;}
 if(!unavailable)await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(DB);r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Close other FUJI shopper tabs and try again.'));});
 try{for(const key of await caches.keys())if(key.startsWith('fuji-shopper'))await caches.delete(key);}catch{}
 try{localStorage.removeItem('fuji-shopper-theme');}catch{}
}
