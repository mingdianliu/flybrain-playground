import {sendCommand} from './live.mjs';
import {STIMULUS_DEFAULTS} from './room-stimuli.mjs';
import {RoomScene} from './room-scene.mjs';
import {FlightWorld,validPosition,clamp} from './room-core.mjs';
const $=id=>document.getElementById(id);
let scene,ready=false,state=null,running=false,trial=0,mode='orbit',scheduled=0,pendingPlacement=false,lastControlSend=0;
const local={...STIMULUS_DEFAULTS,open:true,light:1,windowX:0,obstacles:true,vision:true,lampOn:true,lamp:[1.8,1.65,1.2],lampPower:1,blockerOn:false,blocker:[0,1.35,.5],start:[-2.25,1.45,1.9],startYaw:.5};
const preview=new FlightWorld(local);
const height=kind=>(local[kind]||local.lamp)[1];
try{scene=new RoomScene($('roomCanvas'),{onMove:moveObject,onMode:kind=>setTool(kind,true),onWindow:()=>{local.open=!local.open;changed(true);say(local.open?'窗户已打开。':'窗户已关闭，仍然透光。');},height});scene.update(preview.snapshot());}catch(e){$('sceneError').hidden=false;$('sceneError').textContent='三维场景无法启动：'+e.message;}
function say(text,error=false){$('interactionStatus').textContent=text;$('interactionStatus').classList.toggle('error',error);}
function syncControls(){
 for(const kind of ['lamp','start','blocker','food','speaker']){const p=local[kind];for(const [axis,i] of [['X',0],['Y',1],['Z',2]])$(kind+axis).value=p[i];$(kind+'YValue').textContent=p[1].toFixed(2)+' m';}
 $('lampOn').checked=local.lampOn;$('blockerOn').checked=local.blockerOn;$('lampPower').value=Math.round(local.lampPower*100);$('lampPowerValue').textContent=Math.round(local.lampPower*100)+'%';$('startYaw').value=Math.round(local.startYaw*180/Math.PI);$('startYawValue').textContent=Math.round(local.startYaw*180/Math.PI)+'°';$('startCoordinates').textContent=`X ${local.start[0].toFixed(2)} · Z ${local.start[2].toFixed(2)} m`;
 $('windowOpen').checked=local.open;$('daylight').value=Math.round(local.light*100);$('lightValue').textContent=Math.round(local.light*100)+'%';$('windowPosition').value=local.windowX;$('obstacles').checked=local.obstacles;$('vision').checked=local.vision;
 for(const [key,label,scale] of [['foodPower','%',100],['soundPower','%',100],['soundFrequency',' Hz',1]]){$(key).value=Math.round(local[key]*scale);$(key+'Value').textContent=Math.round(local[key]*scale)+label;}
 for(const key of ['foodOn','foodGuide','speakerOn'])$(key).checked=local[key];$('soundPulse').value=local.soundPulse?'pulse':'continuous';
 scene?.setMode(mode);
}
function previewConfig(){if(!state?.enabled){preview.configure(local);preview.reset(trial);const s=preview.snapshot();scene?.update(s);renderRetina(s);showSenses(s);}else scene?.configure(local);}
function flush(){if(scheduled)clearTimeout(scheduled);scheduled=0;lastControlSend=performance.now();if(ready){sendCommand({type:'room-config',config:local});if(pendingPlacement)sendCommand({type:'room-place',p:local.start,yaw:local.startYaw});}pendingPlacement=false;}
function changed(commit=false){syncControls();previewConfig();if(commit)flush();else if(!scheduled)scheduled=setTimeout(flush,Math.max(0,33-(performance.now()-lastControlSend)));}
function moveObject(kind,p,commit=false){
 const margin=kind==='blocker'?.4:kind==='lamp'?.2:kind==='food'||kind==='speaker'?.3:.1;
 p=[clamp(p[0],-3.5+margin,3.5-margin),clamp(p[1],margin,2.8-margin),clamp(p[2],-3+margin,3-margin)];
 const config=kind==='blocker'?{...local,blockerOn:false}:local,radius=kind==='blocker'?.38:kind==='lamp'?.16:kind==='food'||kind==='speaker'?.25:.075;
 if(!validPosition(p,config,radius)||(kind==='blocker'&&Math.hypot(...p.map((v,i)=>v-(state?.enabled?state.p:local.start)[i]))<.48)){say(kind==='start'?'这里不是空位，请避开墙和家具。':'这个位置碰到了家具或果蝇，请挪开一点。',true);syncControls();return;}
 local[kind]=p;if(kind==='start')pendingPlacement=true;changed(commit);
 if(commit&&kind==='food'){say('食物已移动，嗅觉输入同步更新。');return;}if(commit&&kind==='speaker'){say('声源已移动，听觉输入同步更新。');return;}
 if(commit)say(kind==='start'?(state?.enabled?'新起点已设置，下次释放时生效。':'起点已设置，点击「释放果蝇」开始。'):kind==='lamp'?'灯的位置已改变，视觉输入同步更新。':'遮挡球已移动，亮度和避障输入同步更新。');
}
function setTool(tool,fromCanvas=false){
 mode=tool;document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
 document.querySelectorAll('[data-controls]').forEach(p=>p.hidden=p.dataset.controls!==(tool==='orbit'?'lamp':tool));
 const hints={orbit:'拖动灯、食物或声源与它互动；点按窗户可以开关。',food:'点按空位放置食物，或拖动橙色果盘；可在飞行中改变气味。',speaker:'点按空位放置声源，或拖动蓝色扬声器；观察听觉放电。',start:'在空位点按或拖动绿色起点；高度和朝向在下方调整。',lamp:'在场景中点按或拖动来移动灯，飞行中也会立即生效。',blocker:'移动遮挡球，挡住亮处或靠近飞行路径。'};
 $('toolHint').textContent=hints[tool];$('roomGesture').textContent=tool==='orbit'?'拖动物体互动 · 拖空白旋转 · 滚轮缩放':'点按 / 拖动放置 · 方向键微调 · Shift + 上下改高度';
 if(tool!=='orbit'){$('cameraView').setAttribute('aria-pressed','false');$('cameraView').textContent='跟随果蝇';if(scene){scene.follow=false;if(!fromCanvas)scene.controls.enabled=true;}}
 scene?.setMode(tool);
 if((tool==='food'||tool==='speaker')&&!local[tool+'On']){local[tool+'On']=true;changed(true);}
 if(tool==='blocker'&&!local.blockerOn){local.blockerOn=true;changed(true);}
 if(!fromCanvas)previewConfig();
}
function renderRetina(s){const c=$('retina').getContext('2d'),w=480,h=78;c.clearRect(0,0,w,h);for(let i=0;i<72;i++){const r=s.retina[i],x=(i%24)*20,y=(2-Math.floor(i/24))*20,b=Math.max(0,Math.min(1,r.light));c.fillStyle=`rgb(${Math.round(15+b*225)},${Math.round(29+b*188)},${Math.round(42+b*95)})`;c.fillRect(x+.5,y+.5,19,19);const a=Math.min(1,r.rate/120);if(a>.06){c.fillStyle=`rgba(202,255,212,${a})`;c.fillRect(x+3,y+16,14*a,2);}}c.fillStyle='#162b36';c.fillRect(0,62,w,16);for(let x=0;x<24;x++){const hz=Math.max(...[0,1,2].map(y=>s.retina[x+y*24].rate));c.fillStyle='#a8ddc6';c.fillRect(x*20+2,77-Math.min(13,hz/120*13),16,Math.min(13,hz/120*13));}c.strokeStyle='#eaf3e7';c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,59);c.stroke();}
function showState(s){
 state=s;scene?.update({...s,config:local});renderRetina(s);$('flightState').textContent=s.status;
 $('flightTime').innerHTML=s.time.toFixed(2)+' <small>s</small>';$('flightDistance').innerHTML=s.path.toFixed(2)+' <small>m</small>';$('flightSpeed').innerHTML=s.speed.toFixed(2)+' <small>m/s</small>';$('flightContacts').textContent=s.contacts;
 $('escapeCard').hidden=!s.escaped;if(s.escaped){$('escapeDetail').textContent=`${s.time.toFixed(2)} 秒模拟时间 · ${s.path.toFixed(2)} 米 · ${s.contacts} 次接触`;$('release').textContent='重新释放';$('flightPause').disabled=true;}else if(ready){$('release').textContent=s.enabled?'重新释放果蝇':'释放果蝇';$('flightPause').disabled=!s.enabled;}
 if(!running&&s.enabled&&!s.escaped)$('flightState').textContent='已暂停 · 仍可布置房间';
 showSenses(s);
 $('flashLamp').disabled=!ready||!running||s.escaped;
}
function showSenses(s){
 const v=s.sensory||{odorHz:0,soundHz:0,aHz:0,bHz:0};
 $('odorHz').textContent=v.odorHz.toFixed(1)+' Hz';$('soundHz').textContent=v.soundHz.toFixed(1)+' Hz';$('odorMeter').value=v.odorHz;$('soundMeter').value=v.soundHz;
 $('odorDetail').textContent=local.foodOn?`气味 ${Math.round((v.odorLevel??preview.stimuli.odorLevel)*100)}% · ${local.foodGuide?'趋食辅助开启':'只刺激神经'}`:'气味源关闭';
 $('soundDetail').textContent=local.speakerOn?`A ${v.aHz.toFixed(1)} / B ${v.bHz.toFixed(1)} Hz · ${local.soundFrequency} Hz 声源`:'声源关闭';
}
window.addEventListener('neural-message',({detail:d})=>{
 if(d.type==='ready')sendCommand({type:'room-init',config:local});
 else if(d.type==='room-ready'){ready=true;document.querySelectorAll('[data-room-probe]').forEach(b=>b.disabled=false);for(const id of ['release','newTrial'])$(id).disabled=false;$('release').textContent='释放果蝇';$('inputSummary').textContent=`${d.room.retinaCount.toLocaleString()} 个光感受器 · ${d.room.odorCount} 嗅觉 · ${d.room.soundCount} 听觉 · ${d.room.loomCount} 逼近`;flush();showState(d.room);$('canvasMessage').textContent='释放果蝇，开始观察神经放电';$('loadText').textContent='全量连接组已就绪 · 布置房间或释放果蝇';}
 else if(d.type==='frame'&&d.room){running=d.running;trial=d.room.trial;showState(d.room);$('flightPause').textContent=running?'暂停':'继续';}
 else if(d.type==='placement'){say(d.message,!d.ok);if(!d.ok){local.start=d.room.config.start||d.room.p;local.startYaw=d.room.config.startYaw??d.room.yaw;syncControls();}}
 else if(d.type==='interaction-error'){local.blocker=d.config.blocker;local.blockerOn=d.config.blockerOn;syncControls();previewConfig();say(d.message,true);}
 else if(d.type==='error'){ready=false;document.querySelectorAll('[data-room-probe]').forEach(b=>b.disabled=true);for(const id of ['release','newTrial','flightPause','flashLamp'])$(id).disabled=true;$('flightState').textContent='模型错误 · 飞行已停止';}
});
function release(){if(!ready)return;if(!validPosition(local.start,local)){setTool('start');say('起点被遮挡，请在空位重新放置。',true);return;}flush();sendCommand({type:'room-start',trial,config:local});setTool('orbit');say('拖动灯、食物或声源，观察感觉输入与神经放电的变化。');}
function nextTrial(){const starts=[[-2.25,1.45,1.9,.5],[2.3,1.95,2.1,-1.6],[-2.4,.95,-1.6,2.3],[.4,2.25,1.9,3.1]];for(let j=0;j<4;j++){trial=(trial+1)%4;if(validPosition(starts[trial].slice(0,3),local))break;}const p=starts[trial];local.start=p.slice(0,3);local.startYaw=p[3];syncControls();release();}
$('release').onclick=release;$('again').onclick=release;$('newTrial').onclick=nextTrial;
$('flightPause').onclick=()=>{if(state?.enabled&&!state.escaped)sendCommand({type:running?'pause':'resume'});};
$('quickPause').onclick=()=>{if(!state?.enabled||state.escaped)release();else $('flightPause').click();};
for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>setTool(b.dataset.tool);
for(const kind of ['lamp','start','blocker','food','speaker'])for(const [axis,i] of [['X',0],['Y',1],['Z',2]])$(kind+axis).addEventListener('input',()=>{const n=$(kind+axis).valueAsNumber;if(!Number.isFinite(n))return;const p=[...local[kind]];p[i]=n;moveObject(kind,p);});
$('startYaw').oninput=()=>{local.startYaw=Number($('startYaw').value)*Math.PI/180;pendingPlacement=true;changed();};
$('lampPower').oninput=()=>{local.lampPower=Number($('lampPower').value)/100;changed();};
for(const id of ['lampOn','blockerOn','foodOn','foodGuide','speakerOn'])$(id).onchange=()=>{local[id]=$(id).checked;changed(true);};
for(const key of ['foodPower','soundPower','soundFrequency'])$(key).oninput=()=>{local[key]=Number($(key).value)/(key==='soundFrequency'?1:100);changed();};
$('soundPulse').onchange=()=>{local.soundPulse=$('soundPulse').value==='pulse';changed(true);};
for(const b of document.querySelectorAll('[data-room-probe]'))b.onclick=()=>{sendCommand({type:'room-probe',key:b.dataset.roomProbe});say(b.dataset.roomProbe.endsWith('Downstream')?'已选中直接下游靶细胞，可用脑图「定位探针」查看。':'已选中真实输入细胞；它没有胞体坐标，请查看栅格与膜电位。');};
$('flashLamp').onclick=()=>{if(!running)return;local.lampOn=true;changed(true);sendCommand({type:'room-flash'});say('闪光已触发 · 持续 350 ms 模拟时间。');};
for(const id of ['windowOpen','daylight','windowPosition','obstacles','vision'])$(id).addEventListener(id==='daylight'?'input':'change',()=>{local.open=$('windowOpen').checked;local.light=Number($('daylight').value)/100;local.windowX=Number($('windowPosition').value);local.obstacles=$('obstacles').checked;local.vision=$('vision').checked;changed();});
$('cameraView').onclick=()=>{const on=$('cameraView').getAttribute('aria-pressed')!=='true';setTool('orbit');$('cameraView').setAttribute('aria-pressed',on);$('cameraView').textContent=on?'回到全景':'跟随果蝇';$('roomTop').setAttribute('aria-pressed','false');scene?.setFollow(on);};
$('roomTop').onclick=()=>{const top=$('roomTop').getAttribute('aria-pressed')!=='true';$('roomTop').setAttribute('aria-pressed',top);$('roomTop').textContent=top?'回到斜视':'俯视布置';$('cameraView').setAttribute('aria-pressed','false');$('cameraView').textContent='跟随果蝇';scene?.cameraView(top?'top':'home');};
$('showRays').onclick=()=>{const on=$('showRays').getAttribute('aria-pressed')!=='true';$('showRays').setAttribute('aria-pressed',on);if(scene)scene.rays.visible=on;};
$('roomCanvas').addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(state?.enabled)$('flightPause').click();else release();}else if(e.key==='Escape')setTool('orbit');else if(mode!=='orbit'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const p=[...local[mode]],step=e.shiftKey?.05:.1;if(e.key==='ArrowLeft')p[0]-=step;if(e.key==='ArrowRight')p[0]+=step;if(e.key==='ArrowUp')p[e.shiftKey?1:2]+=e.shiftKey?step:-step;if(e.key==='ArrowDown')p[e.shiftKey?1:2]+=e.shiftKey?-step:step;moveObject(mode,p,true);}});
syncControls();let lastRender=0;function render(now){if(now-lastRender>=16){scene?.render();lastRender=now;}requestAnimationFrame(render);}requestAnimationFrame(render);
