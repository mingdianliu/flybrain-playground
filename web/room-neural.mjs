import {FlightWorld} from './room-core.mjs';
import {SENSORY_GROUPS} from './room-stimuli.mjs';
export class EmbodiedExperiment{
 constructor(model,nodes,inputs){
  this.model=model;this.world=new FlightWorld();this.enabled=false;this.trial=0;
  const byId=new Map(nodes.map((n,i)=>[n[0],i]));this.bins=Array.from({length:72},()=>[]);this.loom=[[],[]];
  for(const [s,side] of ['L','R'].entries()){
   const bins=this.world.dirs.flatMap((d,i)=>(side==='L'?d.yaw<0:d.yaw>=0)?[i]:[]);
   inputs.groups['retina'+side].forEach((id,j)=>{const i=byId.get(id);if(i!==undefined)this.bins[bins[j%bins.length]].push(i);});
   this.loom[s]=inputs.groups['loom'+side].flatMap(id=>byId.has(id)?[byId.get(id)]:[]);
  }
  this.membership=new Int16Array(model.n);this.membership.fill(-1);this.bins.forEach((g,b)=>g.forEach(i=>this.membership[i]=b));
  this.sensory=SENSORY_GROUPS.map(key=>(inputs.groups[key]||[]).flatMap(id=>byId.has(id)?[byId.get(id)]:[]));
  this.sensoryMembership=new Int8Array(model.n);this.sensoryMembership.fill(-1);this.sensory.forEach((g,b)=>g.forEach(i=>this.sensoryMembership[i]=b));
  this.sensorySpikes=new Uint32Array(6);this.sensoryRates=new Float32Array(6);this.sensoryChances=new Float64Array(6);
  const downstream=ids=>{const scores=new Map();for(const i of ids)for(let j=model.offsets[i];j<model.offsets[i+1];j++){const k=model.targets[j];if(nodes[k][4]!==null)scores.set(k,(scores.get(k)||0)+model.weights[j]);}return [...scores].sort((a,b)=>b[1]-a[1])[0]?.[0];};
  this.probes={odor:this.sensory[0][0],sound:this.sensory[2][0],odorDownstream:downstream(this.sensory.slice(0,2).flat()),soundDownstream:downstream(this.sensory.slice(2).flat())};
  this.spikes=new Uint32Array(72);this.rates=new Float32Array(72);this.chances=new Float64Array(72);this.loomChances=[0,0];this.next=20;this.updateInput();
 }
 reset(trial=0,config={}){this.trial=trial;this.world.configure(config);this.world.reset(trial);this.spikes.fill(0);this.rates.fill(0);this.sensorySpikes.fill(0);this.sensoryRates.fill(0);this.next=this.model.time+20;this.enabled=true;this.updateInput();}
 updateInput(){
  const dt=this.model.p.dt;this.world.sense();
  this.world.stimuli.targetHz.forEach((hz,i)=>this.sensoryChances[i]=1-Math.exp(-hz*dt/1000));
  this.world.retina.forEach((r,i)=>{const hz=this.world.config.vision?2+110*r.brightness:0;this.chances[i]=1-Math.exp(-hz*dt/1000);});
  for(let s=0;s<2;s++){const indexes=s===0?[0,1,2,3]:[3,4,5,6];const proximity=Math.max(...indexes.map(i=>Math.max(0,1-this.world.ranges[i]/1.5)));
   this.loomChances[s]=1-Math.exp(-(1+75*proximity)*dt/1000);}
 }
 beforeStep(){
  if(!this.enabled||this.world.escaped)return;const m=this.model,t=m.time;
  for(let b=0;b<72;b++){const chance=this.chances[b];if(!chance)continue;for(const i of this.bins[b])if(t>=m.until[i]&&m.random()<chance)m.inject(i,m.p.weight*250);}
  for(let s=0;s<2;s++)for(const i of this.loom[s])if(t>=m.until[i]&&m.random()<this.loomChances[s])m.inject(i,m.p.weight*250);
  for(let b=0;b<6;b++){const chance=this.sensoryChances[b];if(!chance)continue;for(const i of this.sensory[b])if(t>=m.until[i]&&m.random()<chance)m.inject(i,m.p.weight*250);}
 }
 afterStep(spikes){
  if(!this.enabled||this.world.escaped)return;for(const i of spikes){const b=this.membership[i];if(b>=0)this.spikes[b]++;const s=this.sensoryMembership[i];if(s>=0)this.sensorySpikes[s]++;}
  if(this.model.time+1e-7>=this.next){for(let b=0;b<72;b++)this.rates[b]=this.spikes[b]/Math.max(1,this.bins[b].length)/.02;
   for(let b=0;b<6;b++)this.sensoryRates[b]+=(this.sensorySpikes[b]/Math.max(1,this.sensory[b].length)/.02-this.sensoryRates[b])*(1-Math.exp(-.02/.11));
   this.world.advance(.02,this.rates,this.sensoryRates);this.spikes.fill(0);this.sensorySpikes.fill(0);this.next+=20;this.updateInput();}
 }
 snapshot(){const mean=(a,b)=>{let count=0,sum=0;for(let i=a;i<b;i++){count+=this.sensory[i].length;sum+=this.sensoryRates[i]*this.sensory[i].length;}return sum/Math.max(1,count);};return {...this.world.snapshot(),enabled:this.enabled,trial:this.trial,retinaCount:this.bins.reduce((n,g)=>n+g.length,0),loomCount:this.loom[0].length+this.loom[1].length,odorCount:this.sensory[0].length+this.sensory[1].length,soundCount:this.sensory.slice(2).flat().length,sensory:{odorLevel:this.world.stimuli.odorLevel,soundLevel:Math.max(...this.world.stimuli.sound),envelope:this.world.stimuli.envelope,odorHz:mean(0,2),soundHz:mean(2,6),aHz:mean(2,4),bHz:mean(4,6)}};}
}
