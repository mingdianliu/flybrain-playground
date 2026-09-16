// Display history uses a time window, never a "last N spikes" cut-off.
export const BIN_MS=10,WINDOW_MS=2000,BINS=WINDOW_MS/BIN_MS;
const GROUPS=[
 ['视觉输入',['ol_sensory']],['视叶内部',['ol_intrinsic']],
 ['视觉投射',['visual_projection','visual_centrifugal']],['中枢内部',['cb_intrinsic']],
 ['下行通路',['descending_neuron','efferent_descending','sensory_descending']],
 ['上行通路',['ascending_neuron','efferent_ascending','sensory_ascending']],
 ['腹神经索内部',['vnc_intrinsic']],['运动神经元',['cb_motor','vnc_motor']],['其他细胞',[]]
];
export function referenceNeurons(nodes,manifest){
 const chosen=[];
 for(const [kind,key,num] of [['type','R1-R6',3],['type','LC4',2],['type','LPLC2',2],['type','DNp01',2],['class','cb_intrinsic',3]]){
  const pool=nodes.flatMap((n,i)=>(kind==='type'?manifest.types[n[1]]:manifest.classes[n[2]])===key?[i]:[]);
  for(let j=0;j<Math.min(num,pool.length);j++)chosen.push(pool[Math.floor(j*pool.length/Math.min(num,pool.length))]);
 }
 return [...new Set(chosen)];
}
export class SpikeHistory{
 constructor(nodes,manifest){
  this.groups=GROUPS.map(([label])=>({label,neurons:0}));
  this.groupOf=Uint8Array.from(nodes,n=>{const name=manifest.classes[n[2]],match=GROUPS.findIndex(([,keys])=>keys.includes(name)),g=match<0?GROUPS.length-1:match;this.groups[g].neurons++;return g;});
  this.tags=new Float64Array(BINS+1);this.density=new Uint32Array((BINS+1)*GROUPS.length);this.rowOf=new Int16Array(nodes.length);this.sampleIds=[];this.reset();
 }
 reset(){this.ids=[];this.times=[];this.head=0;this.tags.fill(-1);this.density.fill(0);this.setSamples(this.sampleIds);}
 setSamples(ids){
  this.sampleIds=[...new Set(ids)];this.rowOf.fill(-1);this.sampleTimes=this.sampleIds.map(()=>[]);this.sampleIds.forEach((id,r)=>this.rowOf[id]=r);
  for(let j=this.head;j<this.ids.length;j++){const row=this.rowOf[this.ids[j]];if(row>=0)this.sampleTimes[row].push(this.times[j]);}
 }
 record(time,spikes){
  const bin=Math.floor(time/BIN_MS),slot=bin%(BINS+1),offset=slot*this.groups.length;
  if(this.tags[slot]!==bin){this.tags[slot]=bin;this.density.fill(0,offset,offset+this.groups.length);}
  for(const i of spikes){this.ids.push(i);this.times.push(time);this.density[offset+this.groupOf[i]]++;const row=this.rowOf[i];if(row>=0)this.sampleTimes[row].push(time);}
  while(this.head<this.times.length&&this.times[this.head]<time-WINDOW_MS)this.head++;
  if(this.head>65536){this.ids=this.ids.slice(this.head);this.times=this.times.slice(this.head);this.head=0;}
 }
 snapshot(time){
  // Both views share bin-aligned axes. The unfinished fraction is shaded by UI.
  const end=Math.max(WINDOW_MS,Math.ceil(time/BIN_MS)*BIN_MS),start=end-WINDOW_MS,firstBin=start/BIN_MS;
  const density=new Uint32Array(BINS*this.groups.length);let total=0;
  for(let b=0;b<BINS;b++){
   const slot=(firstBin+b)%(BINS+1);if(this.tags[slot]!==firstBin+b)continue;
   for(let g=0;g<this.groups.length;g++){const v=this.density[slot*this.groups.length+g];density[g*BINS+b]=v;total+=v;}
  }
  const events=[],sampleCounts=[];
  for(let row=0;row<this.sampleTimes.length;row++){
   this.sampleTimes[row]=this.sampleTimes[row].filter(t=>t>=start);
   const times=this.sampleTimes[row].filter(t=>t<time);sampleCounts.push(times.length);for(const t of times)events.push(row,t);
  }
  return {time,start,end,binMs:BIN_MS,bins:BINS,groups:this.groups,sampleIds:this.sampleIds,sampleCounts,total,density,events:Float64Array.from(events)};
 }
}
