import './build-english.mjs';
import assert from 'node:assert/strict';
import {makeServer} from './serve.mjs';
const server=makeServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
try{
 for(const page of ['/','/en.html','/lab.html','/lab-en.html']){const r=await fetch(base+page);assert.equal(r.status,200);assert.match(await r.text(),/Flybrain Playground|果蝇脑互动实验室/);}
 for(const path of ['/sim-worker.mjs','/sim-worker.en.mjs','/vendor/three.module.min.js']){const r=await fetch(base+path);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/javascript/);}
 assert.equal((await fetch(base+'/%2e%2e%2fpackage.json')).status,403);
 assert.equal((await fetch(base+'/full/%2e%2e%2fraw/source.feather')).status,403);
 assert.equal((await fetch(base+'/.git/config')).status,404);
 assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
 console.log('PASS portable HTTP server: both languages, worker modules, traversal guards and read-only routes.');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
