// Local-only server for source or a portable static build; no cloud credentials.
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export function makeServer({directory=null}={}){
 return createServer(async(req,res)=>{
  try{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   let name;
   try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
   if(name.includes('\0')||name.includes('\\')){res.writeHead(400);res.end();return;}
   const base=directory?resolve(root,directory):resolve(root,name.startsWith('/full/')?'work/full':'web');
   const relative=!directory&&name.startsWith('/full/')?name.slice(6):name.slice(1);
   let path=resolve(base,relative||'index.html');
   if(!path.startsWith(base+sep)){res.writeHead(403);res.end();return;}
   const metadata=await stat(path);if(!metadata.isFile()){res.writeHead(404);res.end();return;}
   const mime={'.html':'text/html; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'}[extname(path)]||'application/octet-stream';
   // *.gz contains application data: do not set Content-Encoding. The worker
   // verifies compressed SHA-256 before explicitly decoding gzip.
   res.writeHead(200,{'Content-Type':mime,'Content-Length':metadata.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
   if(req.method==='HEAD'){res.end();return;}
   const stream=createReadStream(path);stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end('File not available');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);let port=4173,directory=null;
 for(let i=0;i<args.length;i++){if(args[i]==='--port')port=Number(args[++i]);else if(args[i]==='--dist')directory='dist';else throw Error('Unknown argument: '+args[i]);}
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');
 const server=makeServer({directory});server.on('error',error=>{console.error(error.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`Flybrain Playground: http://127.0.0.1:${port}/en.html`));
}
