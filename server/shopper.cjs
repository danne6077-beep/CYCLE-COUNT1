const fs=require('node:fs');const path=require('node:path');const {gunzipSync}=require('node:zlib');const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),catalogRoot=path.join(root,'shopper/catalog');
const cached=new Map();
function jsonFile(name){return JSON.parse(fs.readFileSync(path.join(catalogRoot,name),'utf8'));}
function shard(name){if(!cached.has(name)){if(cached.size>12)cached.delete(cached.keys().next().value);cached.set(name,JSON.parse(gunzipSync(fs.readFileSync(path.join(catalogRoot,name))).toString('utf8')));}return cached.get(name);}
function bucket(code){return [...String(code)].reduce((s,c)=>s+c.charCodeAt(0),0)%64;}
function getProduct(sku){const row=shard(`products.v1.${bucket(sku)}.json.gz`).find(r=>r[0]===sku);if(!row)return null;const meta=jsonFile('catalog-meta.json'),p=jsonFile('catalog-prices.json').items.find(p=>p.sku===sku);return {sku:row[0],name:row[1],category:meta.categories[row[2]],subcategory:meta.subcategories[row[3]],department:meta.departments[row[4]],barcodes:row[5],priceCentavos:null,size:null,unit:null,inStock:null,...p};}
function fail(status,message){const e=new Error(message);e.status=status;return e;}
function body(req){const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(Buffer.byteLength(raw)>2000000)throw fail(413,'Request is too large.');try{return JSON.parse(raw);}catch{throw fail(400,'Invalid JSON.');}}
function headers(res){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json; charset=utf-8');}
function sendError(res,error){headers(res);const status=error.status||503;res.status(status).json({error:status>=500?'This optional online feature is not available. Your device shopping tools still work.':error.message});}
async function verify(req,admin=false){
 const key=process.env.FIREBASE_API_KEY,project=process.env.FIREBASE_PROJECT_ID;
 if(!key||!project)throw fail(503,'Online authentication is not configured.');
 const match=/^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.authorization||'');if(!match)throw fail(401,'Sign in to use this optional feature.');
 const token=match[1];if(token.length>16000)throw fail(401,'Invalid token.');
 // Google verifies signature, expiry and project; never trust a decoded JWT alone.
 const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(8000)});
 const data=await response.json();if(!response.ok||!data.users?.[0]?.localId)throw fail(401,'Sign in again.');
 const user=data.users[0],uid=user.localId;
 // Token audience must match the explicitly configured project as well.
 let payload;try{payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());}catch{throw fail(401,'Invalid token.');}
 if(payload.aud!==project||payload.iss!==`https://securetoken.google.com/${project}`||payload.sub!==uid||payload.exp*1000<=Date.now())throw fail(401,'Token project or expiry is invalid.');
 if(admin){
   const r=await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/users/${encodeURIComponent(uid)}`,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});
   const profile=await r.json();if(!r.ok||profile.fields?.role?.stringValue!=='admin')throw fail(403,'A verified online store administrator is required.');
 }
 return {uid,token};
}
async function rateLimit(req,uid){
 const url=process.env.UPSTASH_REDIS_REST_URL,key=process.env.UPSTASH_REDIS_REST_TOKEN,salt=process.env.RATE_LIMIT_SALT;
 if(!url||!key||!salt||!/^https:\/\//.test(url))throw fail(503,'Persistent rate limiting is not configured.');
 const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 const hashed=createHash('sha256').update(salt+':'+ip).digest('hex').slice(0,32);
 const minute=Math.floor(Date.now()/60000),day=Math.floor(Date.now()/86400000);
 const keys=[`fuji:u:${uid}:m:${minute}`,`fuji:u:${uid}:d:${day}`,`fuji:ip:${hashed}:m:${minute}`,`fuji:ip:${hashed}:d:${day}`];
 const script="for i=1,4 do local n=redis.call('INCR',KEYS[i]); if n==1 then redis.call('EXPIRE',KEYS[i],tonumber(ARGV[i+4])) end; if n>tonumber(ARGV[i]) then return 0 end end; return 1";
 const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',script,'4',...keys,'15','100','30','300','120','90000','120','90000']),signal:AbortSignal.timeout(5000)});
 const data=await r.json();if(!r.ok||data.error)throw fail(503,'Rate-limit service is unavailable.');if(data.result!==1)throw fail(429,'The online helper has reached its limit. Your private local helper is still available.');
}
module.exports={jsonFile,shard,getProduct,bucket,fail,body,headers,sendError,verify,rateLimit};
