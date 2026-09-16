import {SpikeChart} from './spike-chart.mjs';
import {BrainScene} from './brain-scene.mjs';
const $=id=>document.getElementById(id), fmt=n=>Math.round(n).toLocaleString();
export const sendCommand=message=>worker?.postMessage(message);
const announce=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
let worker,manifest,nodes,byId,ready=false,snapshot=null,last=new Float32Array(0),selected=0;
let tracePoints=[],lastEpoch=-1,frames=0,fpsAt=performance.now(),renderFrames=0;
const spikeChart=new SpikeChart($('raster'),index=>sendCommand({type:'select',index}));
let brainScene=null;
function status(text,error=false){$('loadText').textContent=text;$('loadText').parentElement.classList.toggle('error',error);}
function startWorker(){
  worker?.terminate();ready=false;$('retry').hidden=true;
  document.querySelectorAll('.stim,#pause,#quickPause,#stop,#reset').forEach(b=>b.disabled=true);
  worker=new Worker(new URL('./sim-worker.mjs',import.meta.url),{type:'module'});
  worker.onerror=e=>fail(e.message||'计算线程无法启动');
  worker.onmessage=({data:d})=>{
    if(d.type==='anatomy'){
      manifest=d.manifest;nodes=d.nodes;byId=new Map(nodes.map((n,i)=>[String(n[0]),i]));
      $('neuronCount').textContent=fmt(manifest.neurons);$('edgeCount').textContent=fmt(manifest.edges);$('synapseCount').textContent=fmt(manifest.synapses);
      $('geometryCount').textContent=`${fmt(manifest.soma_positions)} 个真实胞体坐标`;
      $('coverage').textContent=`纳入全部 ${fmt(manifest.neurons)} 个已分类神经元；${fmt(manifest.neurons-manifest.soma_positions)} 个缺少胞体坐标的神经元仍参与计算。原表另有 ${fmt(manifest.excluded_unclassified)} 个未分类/待确认的片段未作为神经元纳入。${fmt(manifest.unresolved_fast_sign_neurons)} 个递质作用未确定的神经元，其快速突触作用暂设为零。`;
      last=new Float32Array(nodes.length);last.fill(-1e9);initRenderer();brainScene?.setAnatomy(nodes);applyBrainOptions();resize();
    }else if(d.type==='progress'){
      $('loadProgress').value=d.loaded/d.total*100;
      status(`载入并校验全量连接：${(d.loaded/1e6).toFixed(1)} / ${(d.total/1e6).toFixed(1)} MB`);
    }else if(d.type==='ready'){
      ready=true;$('loadProgress').hidden=true;$('loadText').parentElement.classList.add('ready');
      status(`${fmt(manifest.neurons)} 个神经元 · ${fmt(manifest.edges)} 条连接已就绪。选择刺激开始。`);
      document.querySelectorAll('.stim,#pause,#quickPause,#stop,#reset').forEach(b=>b.disabled=false);
      $('canvasMessage').textContent='选择上方刺激，开始观察放电';$('pause').textContent='开始';
    }else if(d.type==='frame'){
      snapshot=d;last=new Float32Array(d.last);
      if(lastEpoch!==d.epoch){tracePoints=[];lastEpoch=d.epoch;}
      spikeChart.update(d.raster,nodes,manifest);
      const traces=new Float64Array(d.trace);
      for(let i=0;i<traces.length;i+=3)tracePoints.push([traces[i],traces[i+1],traces[i+2]]);
      tracePoints=tracePoints.filter(p=>p[0]>=d.time-1000);
      brainScene?.update(last,d.time,d.selected);
      refreshUI();
    }else if(d.type==='selection'){
      selected=d.selected;tracePoints=[];updateSelected();
    }else if(d.type==='state'){
      if(snapshot)snapshot.running=d.running;$('pause').textContent=d.running?'暂停':'继续';
    }else if(d.type==='error')fail(d.message);
    announce('neural-message',d);
  };
  worker.postMessage({type:'init'});
}
function fail(message){status('计算已停止：'+message,true);$('retry').hidden=false;$('canvasMessage').hidden=false;$('canvasMessage').textContent='数据或计算错误，请重新载入';$('runState').textContent='计算错误';if(snapshot)snapshot.running=false;ready=false;document.querySelectorAll('.stim,#pause,#quickPause,#stop,#reset').forEach(b=>b.disabled=true);}
function initRenderer(){
 if(brainScene)return;
 try{brainScene=new BrainScene($('brain'),index=>sendCommand({type:'select',index}));brainScene.viewChanged=()=>document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed','false'));}
 catch(e){$('brainError').hidden=false;$('brainError').textContent='无法启动三维脑图：'+e.message;}
}
function applyBrainOptions(){brainScene?.setOptions({activeOnly:$('brainActiveOnly').checked,base:Number($('brainBackground').value)/100,pointScale:Number($('brainPointSize').value)});}
function sizeChart(el){const r=el.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(el.width!==w||el.height!==h){el.width=w;el.height=h;}}
function resize(){brainScene?.resize();sizeChart($('voltagePlot'));}
function updateSelected(){
  if(!nodes)return;const n=nodes[selected];brainScene?.select(selected);$('brainSelected').textContent=manifest.types[n[1]]+' · #'+n[0]+(n[4]===null?' · 无胞体坐标':'');$('brainFocus').disabled=n[4]===null;$('selectedType').textContent=manifest.types[n[1]]+' · #'+n[0];
  $('selectedMeta').textContent=manifest.neurotransmitters[n[3]]+' · '+(n[4]===null?'无胞体坐标':`坐标 [${n.slice(4).join(', ')}]`);
}
function refreshUI(){
  const d=snapshot;$('simTime').textContent=(d.time/1000).toFixed(3)+' s';$('simRatio').textContent=d.running?d.ratio.toFixed(2)+'×':'已暂停';
  $('recentSpikes').textContent=fmt(d.recent);$('totalSpikes').textContent=fmt(d.total);$('activeCount').textContent=fmt(d.active)+' 个放电神经元';
  $('frameCount').textContent=`计算帧 ${d.frame} · ${d.unpositioned} 个放电神经元无坐标`;
  $('runState').textContent=d.running?(d.room?.enabled?'环境输入 · 计算中':d.inputActive?'计算中 · 输入开启':'计算中 · 输入已停止'):'计算已暂停';
  $('pause').textContent=d.running?'暂停':(d.time>0?'继续':'开始');$('quickPause').textContent=$('pause').textContent;
  $('canvasMessage').hidden=d.time>0;
  $('voltage').textContent=d.voltage.toFixed(2)+' mV';$('selectedCount').textContent=d.selectedCount+' 次 / 最近 1 s';
  $('inputStatus').textContent=d.stimulus==='none'?'当前无刺激。':`${fmt(d.seedCount)} 个输入神经元 · ${d.inputActive?'Poisson 刺激开启':'刺激已停止，继续计算网络活动'}`;
  const list=$('probeList');list.replaceChildren();
  for(const [i,num,v] of d.top){const n=nodes[i],li=document.createElement('li'),button=document.createElement('button'),span=document.createElement('span'),small=document.createElement('small'),strong=document.createElement('b');span.textContent=manifest.types[n[1]]+' · #'+n[0];small.textContent=v.toFixed(1)+' mV'+(n[4]===null?' · 无坐标':'');span.append(small);strong.textContent=num+' 次';button.append(span,strong);button.onclick=()=>worker.postMessage({type:'select',index:i});li.append(button);list.append(li);}
  if(!d.top.length){const li=document.createElement('li');li.className='empty';li.textContent='最近 1 s 没有计算出的放电事件。';list.append(li);}
  updateSelected();
}
function drawCharts(){
  spikeChart.draw();const time=snapshot?.time||0;
  const v=$('voltagePlot'),p=v.getContext('2d');p.fillStyle='#071214';p.fillRect(0,0,v.width,v.height);
  const y=mv=>(-36-mv)/24*v.height;
  p.strokeStyle='#705d36';p.setLineDash([5,5]);p.beginPath();p.moveTo(0,y(-45));p.lineTo(v.width,y(-45));p.stroke();p.setLineDash([]);
  p.strokeStyle='#73e1d2';p.lineWidth=1.5;p.beginPath();let first=true;
  for(const [t,mv,spike]of tracePoints){const x=(t-time+1000)/1000*v.width;if(x<0)continue;const yy=y(spike?-39:mv);if(first){p.moveTo(x,yy);first=false;}else p.lineTo(x,yy);}p.stroke();
}
let lastRender=0;
function render(now){
 if(now-lastRender<16){requestAnimationFrame(render);return;}lastRender=now;
 renderFrames++;brainScene?.render();
 if(now-fpsAt>=1000){$('fps').textContent=(renderFrames*1000/(now-fpsAt)).toFixed(0)+' fps';fpsAt=now;renderFrames=0;}
 drawCharts();requestAnimationFrame(render);
}
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{brainScene?.view(b.dataset.view);document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};
for(const id of ['brainActiveOnly','brainBackground','brainPointSize'])$(id).addEventListener('input',applyBrainOptions);
$('brainFocus').onclick=()=>brainScene?.focusSelected();
$('brainPan').onclick=()=>{const on=$('brainPan').getAttribute('aria-pressed')!=='true';$('brainPan').setAttribute('aria-pressed',String(on));brainScene?.setPan(on);$('brainStage').querySelector('.brain-gesture').textContent=on?'拖动平移 · 滚轮缩放 · 关闭平移可旋转':'拖动旋转 · 滚轮缩放 · 右键 / 双指平移';};
const brainPanel=$('brainStage').closest('.anatomy-panel');let beforeExpand=null;
function expandBrain(on){
 brainPanel.classList.toggle('is-expanded',on);$('brainExpand').textContent=on?'收起视图':'放大视图';$('brainExpand').setAttribute('aria-expanded',String(on));
 if(on){beforeExpand=document.activeElement;brainPanel.setAttribute('role','dialog');brainPanel.setAttribute('aria-modal','true');brainPanel.setAttribute('aria-label','三维神经元活动');document.body.style.overflow='hidden';$('brainExpand').focus();}
 else{brainPanel.removeAttribute('role');brainPanel.removeAttribute('aria-modal');document.body.style.overflow='';beforeExpand?.focus();}
 resize();
}
$('brainExpand').onclick=()=>expandBrain(!brainPanel.classList.contains('is-expanded'));
brainPanel.addEventListener('keydown',e=>{if(!brainPanel.classList.contains('is-expanded'))return;if(e.key==='Escape'){e.preventDefault();expandBrain(false);}if(e.key==='Tab'){const a=[...brainPanel.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')].filter(x=>x.getClientRects().length);if(e.shiftKey&&document.activeElement===a[0]){e.preventDefault();a.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===a.at(-1)){e.preventDefault();a[0].focus();}}});
for(const b of document.querySelectorAll('[data-stim]'))b.onclick=()=>{document.querySelectorAll('[data-stim]').forEach(x=>x.classList.toggle('selected',x===b));worker.postMessage({type:'stimulate',key:b.dataset.stim,hz:Number($('inputHz').value),continuous:$('inputMode').value==='continuous'});};
$('inputHz').oninput=()=>{$('hzValue').textContent=$('inputHz').value+' Hz';if(ready)worker.postMessage({type:'configure',hz:Number($('inputHz').value)});};
$('inputMode').onchange=()=>{if(ready)worker.postMessage({type:'configure',continuous:$('inputMode').value==='continuous'});};
$('pause').onclick=()=>worker.postMessage({type:snapshot?.running?'pause':'resume'});
$('quickPause').onclick=()=>worker.postMessage({type:snapshot?.running?'pause':'resume'});
$('stop').onclick=()=>worker.postMessage({type:'stop'});
$('reset').onclick=()=>{worker.postMessage({type:'reset'});document.querySelectorAll('[data-stim]').forEach(x=>x.classList.remove('selected'));};
$('speed').onchange=()=>worker.postMessage({type:'speed',value:Number($('speed').value)});
$('probeForm').onsubmit=e=>{e.preventDefault();const i=byId?.get($('neuronId').value.trim());if(i===undefined){$('probeError').textContent='该 ID 不在当前纳入的神经元中。';return;}$('probeError').textContent='';worker.postMessage({type:'select',index:i});};
$('retry').onclick=()=>location.reload();
new ResizeObserver(resize).observe($('brainStage'));
new ResizeObserver(()=>sizeChart($('voltagePlot'))).observe($('voltagePlot'));
window.addEventListener('resize',resize);
// Hidden tabs pause the model explicitly; simulation time does not jump on return.
let resumeOnVisible=false;
document.addEventListener('visibilitychange',()=>{if(!ready)return;if(document.hidden){resumeOnVisible=!!snapshot?.running;worker.postMessage({type:'pause'});}else if(resumeOnVisible){worker.postMessage({type:'resume'});resumeOnVisible=false;}});
startWorker();requestAnimationFrame(render);
