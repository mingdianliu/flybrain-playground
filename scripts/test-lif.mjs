import assert from 'node:assert/strict';
import {LifNetwork} from '../web/lif-core.mjs';
const model=(sign=1)=>new LifNetwork({offsets:new Uint32Array([0,1,1]),targets:new Uint32Array([1]),weights:new Uint16Array([250]),signs:new Int8Array([sign,1])});
let m=model();for(let t=0;t<500;t++)m.step();assert.equal(m.total,0,'Resting network must not invent spikes');
m.inject(0,1);for(let t=0;t<100;t++)m.step();assert.ok(Math.abs(m.v[0]-(-52+Math.exp(-1)))<1e-10,'Membrane decay must follow analytic solution');
m=model();m.inject(0,20);assert.deepEqual(m.step(),[0]);
for(let t=1;t<9;t++){m.step();assert.equal(m.g[1],0,'No synaptic delivery before 1.8 ms');}
m.step();assert.ok(m.g[1]>0,'Synapse must deliver after 1.8 ms');
for(let t=0;t<250;t++)m.step();assert.ok(m.fires[1]>0,'Strong excitation must cause a downstream spike');
m=model(-1);m.inject(0,20);for(let t=0;t<250;t++)m.step();assert.equal(m.fires[1],0,'Inhibitory connection must not cause a spike');assert.ok(m.v[1]<-52);
m=model(0);m.inject(0,20);for(let t=0;t<250;t++)m.step();assert.equal(m.v[1],-52,'Unknown fast sign must remain explicitly zero');
m=model();let last=-Infinity;for(let t=0;t<200;t++){m.inject(0,20);for(const i of m.step())if(i===0){assert.ok(m.time-last>=2.2-1e-8,'Refractory period violated');last=m.time;}}
const a=model(),b=model();for(const x of [a,b])x.stimulate([0],{duration:500,hz:150});
for(let t=0;t<3000;t++)assert.deepEqual(a.step(),b.step(),'Seeded runs must reproduce spike times');
a.reset();assert.equal(a.time,0);assert.equal(a.total,0);assert.equal(a.activeCount,0);assert.ok(a.last.every(v=>v<0));
console.log('PASS: silent baseline, analytic membrane decay, synaptic delay, excitation, inhibition, unknown signs, refractory, reproducibility, reset.');
