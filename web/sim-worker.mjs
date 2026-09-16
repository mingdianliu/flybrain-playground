import {LifNetwork,PARAMS} from './lif-core.mjs';
import {EmbodiedExperiment} from './room-neural.mjs';
import {SpikeHistory,referenceNeurons} from './spike-history.mjs';
let spikeHistory,referenceIds=[];
let experiment=null;
let model,manifest,nodes,running=false,timer=null,selected=0,epoch=0,speed=1;
let wallAnchor=0,simAnchor=0,lastSend=0,lastPerf=0,lastPerfSim=0,ratio=0,frame=0;
let counts,historyIds=[],historyTimes=[],historyHead=0,trace=[],traceAt=0,stimulus='none',seeds=[];
const say=(type,body={})=>postMessage({type,...body});
async function unpack(spec){
  const segments=[];
  for(const file of spec.files||[spec.file]){
    const r=await fetch(new URL('./full/'+file+'?v='+spec.sha256,import.meta.url),{cache:'force-cache'});
    if(!r.ok)throw Error(file+': HTTP '+r.status);
    segments.push(await r.arrayBuffer());
  }
  const buf=segments.length===1?segments[0]:await new Blob(segments).arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buf)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==spec.sha256)throw Error('文件校验失败：'+spec.file);
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
async function init(){
  const r=await fetch(new URL('./full/manifest.json',import.meta.url));if(!r.ok)throw Error('Manifest HTTP '+r.status);
  manifest=await r.json();
  nodes=JSON.parse(new TextDecoder().decode(await unpack(manifest.nodes)));
  say('anatomy',{manifest,nodes});
  const offsets=new Uint32Array(await unpack(manifest.offsets));
  const targets=new Uint32Array(manifest.edges), weights=manifest.weight_bytes===2?new Uint16Array(manifest.edges):new Uint32Array(manifest.edges);
  const allBytes=manifest.parts.reduce((s,p)=>s+p.targets.bytes+p.weights.bytes,0);let loaded=0;
  for(const part of manifest.parts){
    const [t,w]=await Promise.all([unpack(part.targets),unpack(part.weights)]);
    targets.set(new Uint32Array(t),part.start);
    weights.set(manifest.weight_bytes===2?new Uint16Array(w):new Uint32Array(w),part.start);
    loaded+=part.targets.bytes+part.weights.bytes;say('progress',{loaded,total:allBytes});
  }
  const signs=Int8Array.from(nodes,n=>manifest.fast_sign_assumption[manifest.neurotransmitters[n[3]]]||0);
  model=new LifNetwork({offsets,targets,weights,signs});
  counts=new Uint32Array(model.n);
  spikeHistory=new SpikeHistory(nodes,manifest);referenceIds=referenceNeurons(nodes,manifest);sampleSelection();
  say('ready',{params:PARAMS});sendSnapshot();
}
function getSeeds(key){
  return nodes.flatMap((n,i)=>{
    const t=manifest.types[n[1]];
    const yes=key==='loom'?t==='LC4'||t==='LPLC2':
      key==='sugar'?['LB3b','LB3c','PhG1a','PhG1b','PhG1c'].includes(t):
      key==='wind'?t.startsWith('JO-'):
      key==='light'?t==='R1-R6':false;
    return yes?[i]:[];
  });
}
function anchors(){wallAnchor=performance.now();simAnchor=model.time;lastPerf=wallAnchor;lastPerfSim=model.time;}
function run(){if(running)return;running=true;anchors();say('state',{running,epoch});loop();}
function pause(){running=false;clearTimeout(timer);timer=null;sendSnapshot();say('state',{running,epoch});}
function loop(){
  if(!running)return;
  const start=performance.now();let target=simAnchor+(start-wallAnchor)*speed;
  // Limit scheduling backlog, never advance the model clock without computing it.
  if(target-model.time>200){wallAnchor=start;simAnchor=model.time;target=model.time+20;}
  while(model.time<target&&performance.now()-start<9){
    while(historyHead<historyTimes.length&&historyTimes[historyHead]<model.time-1000){counts[historyIds[historyHead]]--;historyHead++;}
    if(historyHead>100000){historyIds=historyIds.slice(historyHead);historyTimes=historyTimes.slice(historyHead);historyHead=0;}
    experiment?.beforeStep();
    const ts=model.time,spikes=model.step();
    experiment?.afterStep(spikes);
    for(const i of spikes){counts[i]++;historyIds.push(i);historyTimes.push(ts);}
    spikeHistory.record(ts,spikes);
    if(spikes.includes(selected))trace.push(ts,model.v[selected],1);
    if(model.time-traceAt>=1){trace.push(model.time,model.v[selected],0);traceAt=model.time;}
    if(experiment?.enabled&&experiment.world.escaped){running=false;say('state',{running,epoch});break;}
  }
  const now=performance.now();
  if(now-lastPerf>=500){ratio=(model.time-lastPerfSim)/(now-lastPerf);lastPerf=now;lastPerfSim=model.time;}
  if(now-lastSend>=33)sendSnapshot();
  if(running)timer=setTimeout(loop,model.time>=target?4:0);else sendSnapshot();
}
function sendSnapshot(){
  if(!model)return;
  let active=0,recent=0,unpositioned=0,top=[];
  for(let i=0;i<model.n;i++)if(counts[i]){active++;recent+=counts[i];if(nodes[i][4]===null)unpositioned++;
    if(top.length<8||counts[i]>counts[top[top.length-1]]){top.push(i);top.sort((a,b)=>counts[b]-counts[a]);if(top.length>8)top.pop();}}
  const last=model.last.slice(),traceBuffer=Float64Array.from(trace),raster=spikeHistory.snapshot(model.time);
  raster.events=raster.events.buffer;raster.density=raster.density.buffer;
  const snapshot={type:'frame',epoch,frame:++frame,running,time:model.time,ratio,total:model.total,active,recent,unpositioned,stimulus,
    inputActive:!!experiment?.enabled&&!experiment.world.escaped||!!model.seeds.length&&(model.continuous||model.time<model.stimUntil),seedCount:seeds.length,
    selected,voltage:model.v[selected],selectedCount:counts[selected],top:top.map(i=>[i,counts[i],model.v[i]]),
    room:experiment?.snapshot(),last:last.buffer,raster,trace:traceBuffer.buffer};
  postMessage(snapshot,[snapshot.last,snapshot.raster.events,snapshot.raster.density,snapshot.trace]);trace=[];lastSend=performance.now();
}
onmessage=async({data:d})=>{
  try{
    if(d.type==='init'){await init();return;}
    if(!model)return;
    if(d.type==='room-init'){
      const r=await fetch(new URL('./room-inputs.json',import.meta.url));if(!r.ok)throw Error('房间输入映射载入失败');
      experiment=new EmbodiedExperiment(model,nodes,await r.json());experiment.world.configure(d.config||{});experiment.world.reset(0);experiment.updateInput();
      referenceIds=[...new Set([...experiment.sensory.map(g=>g[0]),...Object.values(experiment.probes),...referenceIds].filter(Number.isInteger))];sampleSelection();
      say('room-ready',{room:experiment.snapshot()});sendSnapshot();return;
    }
    if(d.type==='room-start'){
      if(!experiment)throw Error('房间尚未就绪');pause();resetModel();experiment.reset(d.trial||0,d.config||{});
      stimulus='room';seeds=[...experiment.bins.flat(),...experiment.loom.flat(),...experiment.sensory.flat()];selected=experiment.loom[0].find(i=>nodes[i][4]!==null)??0;
      sampleSelection();say('selection',{selected});run();sendSnapshot();return;
    }
    if(d.type==='room-config'){
      if(experiment){const c={...experiment.world.config,...d.config};
        if(c.blockerOn&&Math.hypot(...experiment.world.p.map((v,i)=>v-c.blocker[i]))<.48){say('interaction-error',{message:'遮挡球离果蝇太近，请放到旁边。',config:experiment.world.config});return;}
        experiment.world.configure(d.config||{});experiment.updateInput();}
      if(!running||performance.now()-lastSend>=33)sendSnapshot();return;
    }
    if(d.type==='room-place'){
      if(experiment){const ok=experiment.world.placeStart(d.p,d.yaw);experiment.updateInput();say('placement',{ok,message:ok?'起点已设置；释放时使用这个位置。':'这里碰到了墙或障碍，请选一处空位。',room:experiment.snapshot()});sendSnapshot();}return;
    }
    if(d.type==='room-flash'){if(experiment){experiment.world.flash();experiment.updateInput();sendSnapshot();}return;}
    if(d.type==='room-probe'){const i=experiment?.probes[d.key];if(Number.isInteger(i)){selected=i;sampleSelection();trace=[];traceAt=model.time;say('selection',{selected});sendSnapshot();}return;}
    if(d.type==='stimulate'){
      if(experiment)experiment.enabled=false;
      seeds=getSeeds(d.key);if(!seeds.length)throw Error('该输入没有匹配的神经元');stimulus=d.key;
      model.stimulate(seeds,{duration:500,hz:d.hz||150,continuous:!!d.continuous});
      selected=seeds.find(i=>nodes[i][4]!==null)??seeds[0];trace=[];traceAt=model.time;
      sampleSelection();say('selection',{selected});run();sendSnapshot();
    }else if(d.type==='configure'){
      if(Number.isFinite(d.hz))model.hz=Math.max(10,Math.min(250,d.hz));
      if(typeof d.continuous==='boolean'&&model.seeds.length){model.continuous=d.continuous;model.stimUntil=model.time+500;}
      sendSnapshot();
    }else if(d.type==='pause')pause();
    else if(d.type==='resume')run();
    else if(d.type==='stop'){model.stopInput();sendSnapshot();}
    else if(d.type==='reset'){
      pause();resetModel();if(experiment){experiment.world.reset(experiment.trial);experiment.enabled=false;}sendSnapshot();
    }else if(d.type==='select'){selected=d.index;sampleSelection();trace=[];traceAt=model.time;say('selection',{selected});sendSnapshot();}
    else if(d.type==='speed'){speed=Math.max(.1,Math.min(1,d.value));anchors();}
  }catch(error){running=false;clearTimeout(timer);say('error',{message:error.message});}
};
function sampleSelection(){spikeHistory.setSamples([selected,...referenceIds.filter(i=>i!==selected)].slice(0,12));}
function resetModel(){epoch++;model.reset();spikeHistory.reset();counts.fill(0);historyIds=[];historyTimes=[];historyHead=0;trace=[];traceAt=0;stimulus='none';seeds=[];ratio=0;}
