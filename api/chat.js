const {headers,body,fail,sendError}=require('../server/shopper.cjs');
module.exports=async function handler(req,res){
 headers(res);if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'POST required.'});}
 try{
  if(Buffer.byteLength(typeof req.body==='string'?req.body:JSON.stringify(req.body||{}))>4096)throw fail(413,'Request is too large.');
  const data=body(req);
  if(data.mode==='smart'){req.body=data;return (await import('../shopper/server/smart.mjs')).default(req,res);}
  // Retire the unused basket-upload/provider route; keep its fail-closed compatibility responses.
  if(data.consent!==true)throw fail(400,'Consent is required for the optional online helper.');
  if(typeof data.question!=='string'||!data.question.trim()||data.question.length>500)throw fail(400,'Invalid question.');
  throw fail(503,'This optional online feature was replaced by opt-in Smart mode.');
 }catch(error){return sendError(res,error);}
};
