import {ChatEngine} from './engine.js';
import {hydrateSnapshot} from './snapshot.js';
import {read,write} from '../storage.js';
const version=typeof __CHAT_VERSION__==='undefined'?'local':__CHAT_VERSION__;
let engine,initializing,metrics;
async function initialize(){
 if(engine)return engine;if(initializing)return initializing;
 const coldStarted=performance.now();
 initializing=(async()=>{
  let saved=await read('chat-index','catalog');
  if(!saved||saved.buildVersion!==version||version==='local'){
   try{const paths=['catalog.json','aliases.json','playbooks/index.json'];const [snapshot,aliases,manifest]=await Promise.all(paths.map(async path=>{const response=await fetch(new URL('../../chat-data/'+path,import.meta.url));if(!response.ok)throw new Error('Chat catalog could not be prepared.');return response.json();}));if(snapshot.playbookVersion!==manifest.version)throw new Error('Snapshot/playbook version mismatch. Retry preparation.');const playbooks=await Promise.all(manifest.files.map(async file=>{const r=await fetch(new URL('../../chat-data/playbooks/'+file,import.meta.url));if(!r.ok)throw new Error('Playbooks could not be prepared.');return r.json();}));saved={buildVersion:version,snapshot,aliases,playbooks};await write('chat-index',saved,'catalog');}
   catch(error){if(!saved)throw error;}
  }
  const products=hydrateSnapshot(saved.snapshot);let prebuilt;try{const cached=await read('chat-postings','catalog');if(cached?.version===saved.snapshot.version)prebuilt=cached.index;}catch{}
  const indexStarted=performance.now();engine=new ChatEngine(products,saved.aliases,{metadata:saved.snapshot,playbooks:saved.playbooks||[],prebuilt});const indexBuildMs=performance.now()-indexStarted;
  if(!prebuilt)try{await write('chat-postings',{version:saved.snapshot.version,index:engine.exportIndex()},'catalog');}catch{}
  metrics={coldStartMs:performance.now()-coldStarted,indexBuildMs,reusedPostings:!!prebuilt,heapBytes:performance.memory?.usedJSHeapSize??null};return engine;
 })().catch(error=>{initializing=null;throw error;});return initializing;
}
self.onmessage=async event=>{
 const {id,type,...payload}=event.data;
 try{const bot=await initialize();if(type==='init'){if(payload.context)bot.restore(payload.context);self.postMessage({id,ready:true,count:bot.products.length,...(payload.debug&&/^(localhost|127\.0\.0\.1)$/.test(self.location.hostname)?{metrics}:{} )});}else if(type==='query'){const started=performance.now(),response=bot.respond(payload.question,payload.options);self.postMessage({id,response,elapsedMs:performance.now()-started});}}
 catch(error){self.postMessage({id,error:error.message||'Offline assistant could not start.'});}
};
