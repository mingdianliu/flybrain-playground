// An engineered embodied experiment, not a calibrated fly sensorimotor model.
// Steering reads spikes, local odor gradients and range samples, never a route.
import {STIMULUS_DEFAULTS,sampleStimuli} from './room-stimuli.mjs';
export const ROOM={halfX:3.5,halfZ:3,height:2.8,windowY:1.65,windowWidth:1.8,windowHeight:1.3,radius:.075};
export const OBSTACLES=[{x:-.7,z:-.55,w:1.05,d:1.15,h:1.8},{x:1.5,z:1.15,w:1.65,d:.8,h:.85}];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
export function directions(){return Array.from({length:72},(_,i)=>({yaw:(i%24+.5)/24*Math.PI*2-Math.PI,pitch:[-.45,0,.45][Math.floor(i/24)]}));}
export function rayBox(p,d,box){
 let lo=-Infinity,hi=Infinity;
 for(let i=0;i<3;i++){if(Math.abs(d[i])<1e-9){if(p[i]<box.min[i]||p[i]>box.max[i])return Infinity;continue;}
  let a=(box.min[i]-p[i])/d[i],b=(box.max[i]-p[i])/d[i];if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);}
 return hi>=Math.max(0,lo)?Math.max(0,lo):Infinity;
}
export function obstacleBoxes(enabled=true){return enabled?OBSTACLES.map(o=>({min:[o.x-o.w/2,0,o.z-o.d/2],max:[o.x+o.w/2,o.h,o.z+o.d/2]})):[];}
export function raySphere(p,d,center,radius){const v=p.map((x,i)=>x-center[i]),b=v.reduce((s,x,i)=>s+x*d[i],0),c=v.reduce((s,x)=>s+x*x,0)-radius*radius,disc=b*b-c;if(disc<0)return Infinity;const near=-b-Math.sqrt(disc),far=-b+Math.sqrt(disc);return far<0?Infinity:Math.max(0,near);}
export function validPosition(p,config,radius=ROOM.radius){
 if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))return false;
 if(Math.abs(p[0])>ROOM.halfX-radius||Math.abs(p[2])>ROOM.halfZ-radius||p[1]<radius||p[1]>ROOM.height-radius)return false;
 if(obstacleBoxes(config.obstacles).some(b=>p.every((v,i)=>v>b.min[i]-radius&&v<b.max[i]+radius)))return false;
 return !config.blockerOn||Math.hypot(...p.map((v,i)=>v-config.blocker[i]))>.38+radius;
}
export function castRay(p,yaw,pitch,config){
 const d=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
 let distance=30,hit='sky',brightness=config.light;
 const planes=[[0,-ROOM.halfX],[0,ROOM.halfX],[1,0],[1,ROOM.height],[2,-ROOM.halfZ],[2,ROOM.halfZ]];
 for(const [axis,v] of planes){const t=(v-p[axis])/d[axis];if(!Number.isFinite(t)||t<=.0001||t>=distance)continue;
  const q=p.map((n,i)=>n+d[i]*t);if(Math.abs(q[0])>ROOM.halfX+.001||q[1]<-.001||q[1]>ROOM.height+.001||Math.abs(q[2])>ROOM.halfZ+.001)continue;
  const window=axis===2&&v<0&&Math.abs(q[0]-config.windowX)<ROOM.windowWidth/2&&Math.abs(q[1]-ROOM.windowY)<ROOM.windowHeight/2;
  distance=t;hit=window?'window':'wall';brightness=window?config.light*(.65+.35*Math.max(0,1-Math.abs(q[0]-config.windowX))):.012;
 }
 for(const b of obstacleBoxes(config.obstacles)){const t=rayBox(p,d,b);if(t<distance){distance=t;hit='obstacle';brightness=.006;}}
 if(config.blockerOn){const t=raySphere(p,d,config.blocker,.38);if(t<distance){distance=t;hit='blocker';brightness=.006;}}
 // A movable emitter has distance falloff and a finite receptive-field width.
 // Visibility is tested toward the emitter, including furniture and the blocker.
 if(config.lampOn&&config.lampPower>0){
  const v=config.lamp.map((x,i)=>x-p[i]),dist=Math.hypot(...v),ld=v.map(x=>x/Math.max(.00001,dist));
  const hidden=obstacleBoxes(config.obstacles).some(b=>rayBox(p,ld,b)<dist-.1)||(config.blockerOn&&raySphere(p,ld,config.blocker,.38)<dist-.1);
  if(!hidden){const dot=clamp(d.reduce((s,x,i)=>s+x*ld[i],0),-1,1),angle=Math.acos(dot),width=.17+Math.atan2(.22,Math.max(.05,dist));brightness+=config.lampPower*1.8/(1+.12*dist*dist)*Math.exp(-.5*(angle/width)**2);}
 }
 // An open aperture has no collision surface, but its visual distance is retained.
 return {distance,range:hit==='window'&&config.open?30:distance,hit,brightness:brightness*(config.vision?1:0),end:p.map((n,i)=>n+d[i]*Math.min(distance,8))};
}
export class FlightWorld{
 constructor(config={}){this.config={open:true,light:1,windowX:0,obstacles:true,vision:true,lampOn:false,lamp:[1.8,1.65,1.2],lampPower:1,blockerOn:false,blocker:[0,1.35,.5],start:null,startYaw:null,...STIMULUS_DEFAULTS,...config};this.dirs=directions();this.reset(0);}
 reset(trial=0){
  const starts=[[-2.25,1.45,1.9,.5],[2.3,1.95,2.1,-1.6],[-2.4,.95,-1.6,2.3],[.4,2.25,1.9,3.1]];
  const s=starts[trial%starts.length];let p=this.config.start||s.slice(0,3);
  if(!validPosition(p,this.config))p=starts.map(s=>s.slice(0,3)).find(p=>validPosition(p,this.config))||[0,2.6,2.7];
  this.p=[...p];this.yaw=this.config.startYaw??s[3];this.pitch=0;this.turn=0;this.speed=0;this.time=0;this.path=0;this.contacts=0;this.escaped=false;this.status='等待释放';this.rates=new Float32Array(72);this.rawRates=new Float32Array(72);this.light=0;this.near=0;this.clearFrames=0;this.scanSign=trial%2?1:-1;this.flashUntil=0;this.sense();
 }
 configure(config){
  for(const k of ['open','obstacles','vision','lampOn','blockerOn','foodOn','foodGuide','speakerOn','soundPulse'])if(typeof config[k]==='boolean')this.config[k]=config[k];
  for(const [k,min,max] of [['light',0,1],['windowX',-2.1,2.1],['lampPower',0,2],['foodPower',0,2],['soundPower',0,2],['soundFrequency',40,800]])if(Number.isFinite(config[k]))this.config[k]=clamp(config[k],min,max);
  for(const k of ['lamp','blocker','food','speaker'])if(Array.isArray(config[k])&&config[k].length===3&&config[k].every(Number.isFinite)){const margin=k==='blocker'?.4:k==='food'||k==='speaker'?.3:.2;this.config[k]=[clamp(config[k][0],-ROOM.halfX+margin,ROOM.halfX-margin),clamp(config[k][1],margin,ROOM.height-margin),clamp(config[k][2],-ROOM.halfZ+margin,ROOM.halfZ-margin)];}
  if(config.start===null)this.config.start=null;
  else if(config.start&&validPosition(config.start,this.config))this.config.start=[...config.start];
  if(config.startYaw===null)this.config.startYaw=null;else if(Number.isFinite(config.startYaw))this.config.startYaw=wrap(config.startYaw);
  this.sense();
 }
 placeStart(p,yaw=this.yaw){if(!validPosition(p,this.config))return false;this.config.start=[...p];this.config.startYaw=wrap(yaw);if(this.time===0){this.p=[...p];this.yaw=wrap(yaw);this.sense();}return true;}
 flash(){this.config.lampOn=true;this.flashUntil=this.time+.35;this.sense();}
 sense(){const c={...this.config,lampPower:this.config.lampPower*(this.time<this.flashUntil?3:1)};this.stimuli=sampleStimuli(this.p,this.yaw,c,this.time);this.retina=this.dirs.map(d=>castRay(this.p,this.yaw+d.yaw,d.pitch,c));this.ranges=[-1.4,-.8,-.4,0,.4,.8,1.4,Math.PI].map(a=>castRay(this.p,this.yaw+a,0,c).range);return this.retina;}
 advance(dt,spikeRates,sensoryRates=[]){
  if(this.escaped)return;this.time+=dt;
  const a=1-Math.exp(-dt/.11);for(let i=0;i<72;i++){this.rawRates[i]=spikeRates[i]||0;this.rates[i]+=(this.rawRates[i]-this.rates[i])*a;}
  let sx=0,sz=0,sy=0,sum=0,peak=0;
  for(let i=0;i<72;i++){const power=Math.max(0,this.rates[i]-7)**2,d=this.dirs[i];sx+=Math.sin(d.yaw)*power;sz+=Math.cos(d.yaw)*power;sy+=d.pitch*power;sum+=power;peak=Math.max(peak,this.rates[i]);}
  const bearing=sum>60?Math.atan2(sx,sz):0,elevation=sum>60?sy/sum:0;
  this.light=clamp((peak-7)/100,0,1);const r=this.ranges,front=Math.min(r[2],r[3],r[4]);this.near=clamp(1-front/1.1,0,1);
  // Spike-derived phototaxis; local-range avoidance and altitude bounds are
  // engineering assists. No force pulls the fly toward the window location.
  let turn=sum>60?clamp(bearing*2.8,-2.6,2.6):this.scanSign*.7;
  // Actual ORN spikes gate a deliberately engineered local-gradient follower.
  // Auditory spikes are observed but have no assumed attraction/escape decoder.
  const odorRate=((sensoryRates[0]||0)+(sensoryRates[1]||0))/2;
  const foodWeight=this.config.foodGuide&&this.config.foodOn?clamp(odorRate/45,0,.92):0;
  turn=turn*(1-foodWeight)+clamp(this.stimuli.bearing*2.8,-2.6,2.6)*foodWeight;
  const left=Math.min(r[0],r[1]),right=Math.min(r[5],r[6]);
  if(front<.95){const side=right-left;if(Math.abs(side)>.12)this.scanSign=side>0?1:-1;turn=(1-front/.95)*this.scanSign*3.9+turn*Math.min(1,front/.95);}
  turn+=clamp((1/Math.max(.15,left)-1/Math.max(.15,right))*.14,-1.8,1.8);
  this.turn+=(turn-this.turn)*(1-Math.exp(-dt/.09));this.yaw=wrap(this.yaw+this.turn*dt);
  const desiredPitch=clamp(elevation*2*(1-foodWeight)+this.stimuli.elevation*foodWeight,-.7,.7);this.pitch+=(desiredPitch-this.pitch)*(1-Math.exp(-dt/.18));
  if(this.p[1]<.35)this.pitch=Math.max(.5,this.pitch);if(this.p[1]>ROOM.height-.3)this.pitch=Math.min(-.5,this.pitch);
  const desiredSpeed=(sum>60||foodWeight>.15?.85:.36)*clamp(front/.7,.08,1)*(1-Math.min(.65,Math.abs(turn)*.13))*(1-foodWeight*this.stimuli.odorLevel*.6);
  this.speed+=(desiredSpeed-this.speed)*(1-Math.exp(-dt/.15));
  const next=[this.p[0]+Math.sin(this.yaw)*Math.cos(this.pitch)*this.speed*dt,this.p[1]+Math.sin(this.pitch)*this.speed*dt,this.p[2]-Math.cos(this.yaw)*Math.cos(this.pitch)*this.speed*dt];
  const radius=ROOM.radius,pass=this.config.open&&Math.abs(next[0]-this.config.windowX)<ROOM.windowWidth/2-radius&&Math.abs(next[1]-ROOM.windowY)<ROOM.windowHeight/2-radius;
  let blocked=Math.abs(next[0])>ROOM.halfX-radius||next[1]<radius||next[1]>ROOM.height-radius||next[2]>ROOM.halfZ-radius||(!pass&&next[2]<-ROOM.halfZ+radius);
  for(const b of obstacleBoxes(this.config.obstacles))if(next.every((v,i)=>v>b.min[i]-radius&&v<b.max[i]+radius))blocked=true;
  if(this.config.blockerOn&&Math.hypot(...next.map((v,i)=>v-this.config.blocker[i]))<.38+radius)blocked=true;
  if(blocked){if(this.clearFrames>3)this.contacts++;this.clearFrames=0;this.speed=0;this.yaw=wrap(this.yaw+this.scanSign*dt*3.5);this.status='接近障碍 · 转向';}
  else{this.clearFrames++;this.path+=Math.hypot(...next.map((v,i)=>v-this.p[i]));this.p=next;this.status=front<.95?'绕开障碍':foodWeight>.35?'追随食物气味 · 简化控制':sum>60?'朝亮处飞行':'搜索亮处';}
  if(this.p[2]<-ROOM.halfZ-radius&&pass){this.escaped=true;this.status='已飞出窗户';}
  this.sense();
 }
 snapshot(){return {p:[...this.p],yaw:this.yaw,pitch:this.pitch,turn:this.turn,speed:this.speed,time:this.time,path:this.path,contacts:this.contacts,escaped:this.escaped,status:this.status,light:this.light,near:this.near,flash:this.time<this.flashUntil,config:{...this.config},retina:this.retina.map((r,i)=>({light:r.brightness,range:r.range,rate:this.rates[i],end:r.end})),ranges:this.ranges};}
}
