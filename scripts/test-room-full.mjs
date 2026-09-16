import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {LifNetwork} from '../web/lif-core.mjs';
import {SpikeHistory,referenceNeurons} from '../web/spike-history.mjs';
const root=new URL('../work/full/',import.meta.url), read=n=>readFileSync(new URL(n,root));
const manifest=JSON.parse(read('manifest.json'));const unzip=spec=>{const b=gunzipSync(Buffer.concat((spec.files||[spec.file]).map(read)));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const nodes=JSON.parse(new TextDecoder().decode(unzip(manifest.nodes)));
const targets=new Uint32Array(manifest.edges),weights=new Uint16Array(manifest.edges);
for(const p of manifest.parts){targets.set(new Uint32Array(unzip(p.targets)),p.start);weights.set(new Uint16Array(unzip(p.weights)),p.start);}
const signs=Int8Array.from(nodes,n=>manifest.fast_sign_assumption[manifest.neurotransmitters[n[3]]]||0);
const m=new LifNetwork({offsets:new Uint32Array(unzip(manifest.offsets)),targets,weights,signs});

const {EmbodiedExperiment}=await import('../web/room-neural.mjs');
const {default:assert}=await import('node:assert/strict');
const inputs=JSON.parse(readFileSync(new URL('../web/room-inputs.json',import.meta.url)));
const e=new EmbodiedExperiment(m,nodes,inputs),start=performance.now();e.reset(0,{windowX:0});
const display=new SpikeHistory(nodes,manifest),stepCounts=[],sampleEvents=[];
const sampled=referenceNeurons(nodes,manifest);display.setSamples(sampled);
while(m.time<20000&&!e.world.escaped){
  e.beforeStep();const time=m.time,spikes=m.step();e.afterStep(spikes);
  display.record(time,spikes);stepCounts.push([time,spikes.length]);
  for(const id of sampled)if(spikes.includes(id))sampleEvents.push([id,time]);
  if(m.tick%1000===0)display.snapshot(m.time);
  if(m.tick%10000===0)console.log('progress',m.time,e.world.p,e.world.status);
}
const raster=display.snapshot(m.time),expected=stepCounts.filter(([t])=>t>=raster.start&&t<raster.end).reduce((sum,[,n])=>sum+n,0);
assert.equal(raster.total,expected);assert.ok(raster.total>12000);
for(let row=0;row<sampled.length;row++)assert.equal(raster.sampleCounts[row],sampleEvents.filter(([id,t])=>id===sampled[row]&&t>=raster.start&&t<m.time).length);
assert.equal(raster.density.reduce((sum,n)=>sum+n,0),expected);
console.log('PASS full-network display: all',expected,'spikes in final 2 s, exact sampled-neuron histories');
const result={escaped:e.world.escaped,time:e.world.time,path:e.world.path,contacts:e.world.contacts,spikes:m.total,wall_ms:performance.now()-start,neurons:m.n,edges:targets.length};
console.log(JSON.stringify(result));assert.ok(e.world.escaped,'Full-network controller must escape default open window');assert.equal(e.world.contacts,0);assert.ok(m.total>1000);assert.ok(Math.abs(m.time/1000-e.world.time)<.021);
writeFileSync(new URL('../work/room-benchmark.json',import.meta.url),JSON.stringify(result,null,2));
m.reset();e.reset(0,{open:false});
while(m.time<10000){e.beforeStep();const spikes=m.step();e.afterStep(spikes);assert.ok(e.world.p[2]>=-3+.075);}
assert.equal(e.world.escaped,false);console.log('PASS full-network closed window: 10 simulated seconds, no escape, total spikes',m.total);
// Live interaction changes sensory spikes without clearing prior neural state.
m.reset();e.reset(0,{open:false,light:0,obstacles:false,lampOn:true,lampPower:1,lamp:[-2,1.65,0],start:[0,1.65,1.8],startYaw:0});
function sampleInput(duration){const bins=new Uint32Array(72),until=m.time+duration;while(m.time<until){e.beforeStep();const spikes=m.step();for(const id of spikes){const b=e.membership[id];if(b>=0)bins[b]++;}e.afterStep(spikes);}return bins;}
const left=sampleInput(350),beforeTime=m.time,beforeTotal=m.total;
const bearing=counts=>counts.reduce((sum,n,i)=>sum+n/Math.max(1,e.bins[i].length)*Math.sin(e.world.dirs[i].yaw),0);
assert.ok(bearing(left)<0,'A lamp on the left must evoke stronger left-facing receptor activity');
e.world.configure({lamp:[2,1.65,0]});e.updateInput();assert.equal(m.time,beforeTime);assert.equal(m.total,beforeTotal);
const right=sampleInput(350);assert.ok(bearing(right)>0,'Moving the lamp right must shift computed sensory spikes');
e.world.flash();e.updateInput();const flash=sampleInput(100);assert.ok(m.total>beforeTotal);assert.equal(e.world.snapshot().flash,true);
assert.ok(flash.reduce((a,b)=>a+b,0)>0);
console.log('PASS full-network live lamp: left/right sensory spike response reverses, clock/history preserved, flash reaches spiking model');
