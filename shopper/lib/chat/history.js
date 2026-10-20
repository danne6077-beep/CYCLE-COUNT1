// Upgrade old messages without changing the existing database schema or deleting user turns.
export function compactResponse(response,pool){
 const intern=p=>{const {tokens,searchText,...record}=p,key=JSON.stringify(record);if(!pool.has(key)){if(pool.size>=2000)pool.clear();pool.set(key,record);}return pool.get(key);};
 response.cards=(response.cards||[]).map(intern);
 if(response.plan)for(const lines of [response.plan.lines,...response.plan.variants.map(v=>v.lines)])for(const line of lines)line.product=intern(line.product);
 return response;
}
export function sanitizeHistory(saved){
 return (Array.isArray(saved)?saved:[]).slice(-200).map(message=>{
  if(!message.response?.julian)return message;
  const response={...message.response};delete response.julian;
  response.text=response.text.includes('\n\n')?response.text.slice(response.text.indexOf('\n\n')+2):'This retired reply is no longer available. Ask about the saved catalog / Magtanong tungkol sa catalog.';
  return {...message,response};
 });
}
