import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {LifNetwork} from '../web/lif-core.mjs';
const root=new URL('../work/full/',import.meta.url), read=n=>readFileSync(new URL(n,root));
const manifest=JSON.parse(read('manifest.json'));const unzip=spec=>{const b=gunzipSync(Buffer.concat((spec.files||[spec.file]).map(read)));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const nodes=JSON.parse(new TextDecoder().decode(unzip(manifest.nodes)));
const targets=new Uint32Array(manifest.edges),weights=new Uint16Array(manifest.edges);
for(const p of manifest.parts){targets.set(new Uint32Array(unzip(p.targets)),p.start);weights.set(new Uint16Array(unzip(p.weights)),p.start);}
const signs=Int8Array.from(nodes,n=>manifest.fast_sign_assumption[manifest.neurotransmitters[n[3]]]||0);
const m=new LifNetwork({offsets:new Uint32Array(unzip(manifest.offsets)),targets,weights,signs});
const results=[];
for(const key of ['loom','sugar','wind','light']){
 m.reset();const seeds=nodes.flatMap((n,i)=>{const t=manifest.types[n[1]];return (key==='loom'?['LC4','LPLC2'].includes(t):key==='sugar'?['LB3b','LB3c','PhG1a','PhG1b','PhG1c'].includes(t):key==='wind'?t.startsWith('JO-'):t==='R1-R6')?[i]:[];});
 m.stimulate(seeds,{duration:100,hz:150});const start=performance.now();for(let t=0;t<1000;t++)m.step();const elapsed=performance.now()-start;
 const active=Array.from(m.fires.keys()).filter(i=>m.fires[i]>0),top=active.sort((a,b)=>m.fires[b]-m.fires[a]).slice(0,5).map(i=>({id:nodes[i][0],type:manifest.types[nodes[i][1]],spikes:m.fires[i]}));
 const result={input:key,neurons:m.n,edges:targets.length,seeds:seeds.length,simulated_ms:m.time,wall_ms:elapsed,speed:m.time/elapsed,total_spikes:m.total,firing_neurons:active.length,downstream_firing_neurons:active.filter(i=>!seeds.includes(i)).length,top};
 results.push(result);console.log(JSON.stringify(result));
}
writeFileSync(new URL('../work/full-benchmark.json',import.meta.url),JSON.stringify(results,null,2));
