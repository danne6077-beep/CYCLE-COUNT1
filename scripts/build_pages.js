const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist');

if(path.dirname(output)!==root||path.basename(output)!=='dist')throw new Error('Unexpected output directory');
execFileSync(process.execPath,[path.join(root,'shopper','scripts','build.mjs')],{stdio:'inherit'});
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
const excludedDirectories=new Set(['.git','.github','node_modules','dist','scripts','tests','qa','docs','api','server','shopper']);
const publicFileExtensions=new Set(['.html','.js','.css','.json','.jpg','.jpeg','.png','.webp','.svg','.ico','.woff','.woff2']);
for(const entry of fs.readdirSync(root,{withFileTypes:true})){
  if(entry.isDirectory()){
    if(excludedDirectories.has(entry.name)||entry.name.startsWith('.'))continue;
    fs.cpSync(path.join(root,entry.name),path.join(output,entry.name),{recursive:true});
    continue;
  }
  if(entry.name.startsWith('.'))continue;
  if(publicFileExtensions.has(path.extname(entry.name).toLowerCase())){
    fs.copyFileSync(path.join(root,entry.name),path.join(output,entry.name));
  }
}
fs.cpSync(path.join(root,'shopper','dist'),path.join(output,'shopper'),{recursive:true});
console.log(`Prepared static site in ${path.relative(root,output)}.`);
