export async function prepareShell(expected){
 if(!('serviceWorker' in navigator))return false;
 try{const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
  for(let attempt=0;attempt<3;attempt++){
   const active=registration.active;
   if(active){const status=await new Promise(resolve=>{const channel=new MessageChannel(),timeout=setTimeout(()=>resolve(null),1000);channel.port1.onmessage=e=>{clearTimeout(timeout);resolve(e.data);};active.postMessage({type:'SHELL_STATUS'},[channel.port2]);});if(status?.complete&&(expected.startsWith('__')||status.version===expected))return true;}
   const installing=registration.installing||registration.waiting;
   await new Promise(resolve=>{const timeout=setTimeout(resolve,3000),done=()=>{clearTimeout(timeout);resolve();};if(installing)installing.addEventListener('statechange',()=>{if(['activated','redundant'].includes(installing.state))done();},{once:true});navigator.serviceWorker.addEventListener('controllerchange',done,{once:true});});
  }return false;
 }catch{return false;}
}
