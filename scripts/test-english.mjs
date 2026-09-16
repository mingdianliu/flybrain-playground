import './build-english.mjs';
import {readFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {FlightWorld as ChineseWorld} from '../web/room-core.mjs';
const {FlightWorld:EnglishWorld}=await import('../web/room-core.en.mjs');
for(const [a,b] of [['index.html','en.html'],['lab.html','lab-en.html']]){
 const zh=readFileSync('web/'+a,'utf8'),en=readFileSync('web/'+b,'utf8');
 const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]).sort();assert.deepEqual(ids(zh),ids(en),'Every existing control must remain available');
 assert.ok(en.includes('lang="en"'));assert.ok(!/[\u4e00-\u9fff]/.test(en.replaceAll('中文','')),'English static content must be complete');
 assert.ok(en.includes('Chinese version'));assert.ok(en.includes(b==='en.html'?'lab-en.html':'href="en.html"'));
}
for(const f of readdirSync('web').filter(f=>f.endsWith('.en.mjs'))){
 const check=spawnSync(process.execPath,['--check','web/'+f],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);
 const nonComments=readFileSync('web/'+f,'utf8').split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');assert.ok(!/[\u4e00-\u9fff]/.test(nonComments),f+' has untranslated runtime text');
}
for(const foodOn of [false,true]){
 const config={foodOn,food:[-1.8,1.5,1],start:[-2.25,1.45,1.9],startYaw:.5};const a=new ChineseWorld(config),b=new EnglishWorld(config);
 for(let t=0;t<250;t++){const rates=Float32Array.from(a.retina,r=>2+r.brightness*110);a.advance(.02,rates,[60,55]);b.advance(.02,rates,[60,55]);assert.deepEqual(a.p,b.p);assert.equal(a.time,b.time);}
 assert.ok(!/[\u4e00-\u9fff]/.test(b.status));
}
console.log('PASS English: full text coverage, identical controls, valid modules, correct navigation, unchanged numeric flight dynamics');
