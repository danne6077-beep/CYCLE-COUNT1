import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const projectRoot=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const standalone=process.argv.includes('--standalone');
const root=standalone?path.join(projectRoot,'shopper',...(process.argv.includes('--dist')?['dist']:[])):process.argv.includes('--dist')?path.join(projectRoot,'dist'):projectRoot;
const port=Number(process.env.SHOPPER_PREVIEW_PORT||4173);
await fs.access(path.join(root,...(standalone?[]:['shopper']),'index.html'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.gz':'application/gzip','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.csv':'text/csv'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';if(pathname.endsWith('/'))pathname+='index.html';const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Permissions-Policy':'camera=(self), microphone=()'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/shopper/ (${process.argv.includes('--dist')?'production build':'source'})`));
