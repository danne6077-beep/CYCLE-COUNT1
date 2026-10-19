const DB='fuji-shopper-v1';
let connection;
export async function database() {
  if(!connection) connection=new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB,1);
    r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('catalog');};
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  return connection;
}
export async function read(key,store='state') {
  const db=await database();
  return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
export async function write(key,value,store='state') {
  const db=await database();
  return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
}
export async function clearStore(store) {
  const db=await database();
  return new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).clear();t.oncomplete=resolve;t.onerror=()=>reject(t.error);});
}
export async function deleteLocalData() {
  if(connection){(await connection).close();connection=null;}
  await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(DB);r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Close other FUJI shopper tabs and try again.'));});
  for(const key of await caches.keys()) if(key.startsWith('fuji-shopper')) await caches.delete(key);
  localStorage.removeItem('fuji-shopper-theme');
}
