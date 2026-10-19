import {ChatEngine} from './engine.js';
import {read,write} from '../storage.js';
const version=typeof __CHAT_VERSION__==='undefined'?'local':__CHAT_VERSION__;
let engine,initializing;
async function initialize(){
 if(engine)return engine;if(initializing)return initializing;
 initializing=(async()=>{
  let saved=await read('chat-index','catalog');
  if(!saved||saved.buildVersion!==version||version==='local'){
   try{const paths=['catalog.json','aliases.json'];const [snapshot,aliases]=await Promise.all(paths.map(async path=>{const response=await fetch(new URL('../../chat-data/'+path,import.meta.url));if(!response.ok)throw new Error('Chat catalog could not be prepared.');return response.json();}));saved={buildVersion:version,snapshot,aliases};await write('chat-index',saved,'catalog');}
   catch(error){if(!saved)throw error;}
  }
  const products=saved.snapshot.rows.map(r=>({sku:r[0],name:r[1],category:r[2],subcategory:r[3],department:r[4],priceCentavos:r[5],brand:r[6],size:r[7],unit:r[8],aisle:r[9],inStock:r[10],barcodes:r[11],promoCentavos:r[12],promoStart:r[13],promoEnd:r[14],anomalyFlags:r[15]||[],priceAsOf:saved.snapshot.effectiveDate||saved.snapshot.priceAsOf}));
  engine=new ChatEngine(products,saved.aliases,{metadata:saved.snapshot});return engine;
 })().catch(error=>{initializing=null;throw error;});return initializing;
}
self.onmessage=async event=>{
 const {id,type,...payload}=event.data;
 try{const bot=await initialize();if(type==='init'){if(payload.context)bot.restore(payload.context);self.postMessage({id,ready:true,count:bot.products.length});}else if(type==='query'){const started=performance.now(),response=bot.respond(payload.question,payload.options);self.postMessage({id,response,elapsedMs:performance.now()-started});}}
 catch(error){self.postMessage({id,error:error.message||'Offline assistant could not start.'});}
};
