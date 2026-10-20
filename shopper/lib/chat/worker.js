import {ChatEngine} from './engine.js';
import {hydrateSnapshot} from './snapshot.js';
import {read,write,storageStatus} from '../storage.js';
import {smartRequest,verifySmart} from './smart-shared.js';
const version=typeof __CHAT_VERSION__==='undefined'?'local':__CHAT_VERSION__;
let engine,initializing,metrics,packageInfo;
const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,20);
async function loadJSON(path){const url=new URL('../../chat-data/'+path,import.meta.url);if(version!=='local')url.searchParams.set('v',version);const r=await fetch(url);if(!r.ok)throw new Error('Saved catalog/playbooks could not be prepared. Reconnect and retry.');return r.json();}
async function initialize(){
 if(engine)return engine;if(initializing)return initializing;const coldStarted=performance.now();
 initializing=(async()=>{
  let saved=await read('chat-index','catalog'),usingOlder=false;
  if(!saved||saved.buildVersion!==version||version==='local'){
   try{const [snapshot,aliases,manifest]=await Promise.all(['catalog.json','aliases.json','playbooks/index.json'].map(loadJSON));
    if(snapshot.playbookVersion!==manifest.version||version!=='local'&&snapshot.version!==version)throw new Error('Catalog versions differ. Reconnect and retry.');
    const playbooks=await Promise.all(manifest.files.map(file=>loadJSON('playbooks/'+file)));
    if(await digest(JSON.stringify(playbooks))!==manifest.version)throw new Error('Playbook checksum mismatch. Retry preparation.');
    const actual=await digest(JSON.stringify(snapshot.rows)+JSON.stringify(aliases)+JSON.stringify([snapshot.effectiveDate||null,snapshot.playbookVersion]));if(actual!==snapshot.version)throw new Error('Catalog checksum mismatch. Retry preparation.');
    saved={buildVersion:version,snapshot,aliases,playbooks};await write('chat-index',saved,'catalog');
   }catch(error){if(!saved)throw error;usingOlder=true;}
  }
  const products=hydrateSnapshot(saved.snapshot),cached=await read('chat-postings','catalog'),prebuilt=cached?.version===saved.snapshot.version?cached.index:null,indexStarted=performance.now();
  engine=new ChatEngine(products,saved.aliases,{metadata:saved.snapshot,playbooks:saved.playbooks||[],prebuilt});const indexBuildMs=performance.now()-indexStarted;
  if(!prebuilt)await write('chat-postings',{version:saved.snapshot.version,index:engine.exportIndex()},'catalog');
  metrics={coldStartMs:performance.now()-coldStarted,indexBuildMs,reusedPostings:!!prebuilt,heapBytes:performance.memory?.usedJSHeapSize??null};packageInfo={version:saved.snapshot.version,usingOlder,storage:storageStatus()};return engine;
 })().catch(error=>{initializing=null;throw error;});return initializing;
}
self.onmessage=async event=>{
 const {id,type,...payload}=event.data;
 try{const bot=await initialize();if(type==='init'){if(payload.context)bot.restore(payload.context);self.postMessage({id,ready:true,count:bot.products.length,packageInfo,...(payload.debug&&/^(localhost|127\.0\.0\.1)$/.test(self.location.hostname)?{metrics}:{})});}
  else if(type==='games-data'){const pool=bot.products.filter(p=>p.priceCentavos>0&&!p.anomalyFlags?.length),step=Math.max(1,Math.floor(pool.length/40));self.postMessage({id,pool:pool.filter((_,i)=>i%step===0).slice(0,40),scenario:bot.planner.plan('weekly for 1 people 1 days budget 500',{language:'en',day:new Date().toISOString().slice(0,10)})?.plan});}
  else if(type==='verify-smart'){const response=verifySmart(payload.candidate,bot,smartRequest(payload.request),{version:packageInfo.version,day:payload.day});self.postMessage({id,response});}
  else if(type==='query'){if(payload.context)bot.restore(payload.context);const started=performance.now(),response=bot.respond(payload.question,payload.options);self.postMessage({id,response,elapsedMs:performance.now()-started});}}
 catch(error){self.postMessage({id,error:error.message||'Offline assistant could not start.'});}
};
