// Local QA server only. This is not a production hosting implementation.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root=resolve('out');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.json':'application/json','.ico':'image/x-icon'};
createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 try {
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(path==='/'){res.writeHead(302,{Location:'/en'});res.end();return;}
  let target=resolve(root,'.'+path);if(!target.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  let found=false;for(const candidate of [target,target+'.html']){try{if((await stat(candidate)).isFile()){target=candidate;found=true;break;}}catch{}}
  if(!found){target=resolve(root,'404.html');res.statusCode=404;}
  res.setHeader('Content-Type',types[extname(target)]??'application/octet-stream');const bytes=await readFile(target);res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(400);res.end();}
}).listen(3100,'127.0.0.1',()=>console.log('Static QA: http://127.0.0.1:3100'));
