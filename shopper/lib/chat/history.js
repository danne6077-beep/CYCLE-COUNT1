// Upgrade old messages without changing the existing database schema or deleting user turns.
export function sanitizeHistory(saved){
 return (Array.isArray(saved)?saved:[]).slice(-200).map(message=>{
  if(!message.response?.julian)return message;
  const response={...message.response};delete response.julian;
  response.text=response.text.includes('\n\n')?response.text.slice(response.text.indexOf('\n\n')+2):'This retired reply is no longer available. Ask about the saved catalog / Magtanong tungkol sa catalog.';
  return {...message,response};
 });
}
