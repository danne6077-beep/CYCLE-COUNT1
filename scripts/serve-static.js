const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');

const root=path.resolve(__dirname,'..','dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.md':'text/markdown; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};
const server=http.createServer((request,response)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname)}catch{response.writeHead(400).end('Bad request');return}
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const file=path.resolve(root,relative);
  if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403).end('Forbidden');return}
  fs.stat(file,(statError,stat)=>{
    const target=!statError&&stat.isDirectory()?path.join(file,'index.html'):file;
    fs.readFile(target,(error,content)=>{
      if(error){response.writeHead(404,{'content-type':'text/plain; charset=utf-8'}).end('Not found');return}
      response.writeHead(200,{'content-type':types[path.extname(target).toLowerCase()]||'application/octet-stream','x-content-type-options':'nosniff'}).end(content);
    });
  });
});
const port=Number(process.env.PORT)||4173;
server.listen(port,'127.0.0.1',()=>console.log(`Previewing ${root} at http://127.0.0.1:${port}`));
