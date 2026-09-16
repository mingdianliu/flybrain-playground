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
const e=new EmbodiedExperiment(m,nodes,inputs);
const n=key=>manifest.types[nodes[e.probes[key]][1]];
console.log('Real annotated inputs',e.sensory.map(g=>g.length),'positioned downstream probes',n('odorDownstream'),n('soundDownstream'));
assert.deepEqual(e.sensory.map(g=>g.length),[68,80,18,8,57,18]);
assert.ok(e.sensory.flat().every(i=>nodes[i][4]===null));
function sample(duration){const counts=new Uint32Array(6),until=m.time+duration;while(m.time<until){e.beforeStep();const spikes=m.step();for(const i of spikes){const b=e.sensoryMembership[i];if(b>=0)counts[b]++;}e.afterStep(spikes);}return [...counts].map((n,i)=>n/e.sensory[i].length/(duration/1000));}
const config={open:false,vision:false,light:0,obstacles:false,lampOn:false,start:[0,1.5,1],startYaw:0,foodOn:true,foodGuide:false,food:[-.5,1.5,0],speakerOn:true,speaker:[.5,1.5,0],soundFrequency:70};
m.reset();e.reset(0,config);const low=sample(500),p1=e.probes.odorDownstream,p2=e.probes.soundDownstream;
assert.ok(low[0]>20&&low[1]>20);assert.ok(low[4]>low[2]*2);assert.ok(m.fires[p1]>0);assert.ok(m.fires[p2]>0);
const time=m.time,total=m.total,voltage=m.v.slice();e.world.configure({food:[2.5,1.5,-2],soundFrequency:220});e.updateInput();assert.equal(m.time,time);assert.equal(m.total,total);assert.deepEqual(m.v,voltage);
const high=sample(500);assert.ok(high[2]>high[4]*2);assert.ok(high[0]<low[0]);assert.ok(high[1]<low[1]);
e.world.configure({foodOn:false,speakerOn:false});e.updateInput();assert.ok(e.sensoryChances.every(n=>n===0));sample(200);const off=sample(400);assert.ok(off.every(n=>n<5));
console.log('PASS full connectome: food/sound produce actual sensory AND positioned downstream spikes; live frequency reversal, odor distance response, shutdown, clock/voltages preserved',{low,high,off});
