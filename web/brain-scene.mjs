import * as T from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';

// All three dimensions use the same conversion: 8 nm voxels -> micrometers.
// Centering and a 180-degree rotation around X preserve distances and handedness.
export function anatomyCoordinates(nodes){
 const ids=[],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 nodes.forEach((n,i)=>{if(n[4]===null)return;ids.push(i);for(let a=0;a<3;a++){min[a]=Math.min(min[a],n[a+4]);max[a]=Math.max(max[a],n[a+4]);}});
 const center=min.map((v,a)=>(v+max[a])/2),positions=new Float32Array(ids.length*3);let radius=0;
 ids.forEach((id,j)=>{const p=nodes[id].slice(4,7).map((v,a)=>(v-center[a])*.008*(a===0?1:-1));positions.set(p,j*3);radius=Math.max(radius,Math.hypot(...p));});
 return {ids,positions,radius,center};
}
export class BrainScene{
 constructor(canvas,onSelect){
  this.canvas=canvas;this.onSelect=onSelect;this.renderer=new T.WebGLRenderer({preserveDrawingBuffer:new URLSearchParams(location.search).has('capture'),canvas,alpha:false,antialias:true});this.renderer.setClearColor(0x050c12);this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(38,1,.01,10000);this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.rotateSpeed=.65;this.controls.screenSpacePanning=true;
  this.controls.addEventListener('start',()=>{this.currentView=null;this.viewChanged?.();});
  this.raycaster=new T.Raycaster();this.selected=-1;this.time=0;this.radius=200;
  canvas.addEventListener('pointerdown',e=>{this.down=[e.clientX,e.clientY,e.button];});
  canvas.addEventListener('pointerup',e=>{if(this.down?.[2]===0&&Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])<5)this.pick(e);this.down=null;});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key))return;e.preventDefault();
   if(e.key==='0'){this.view('3d');return;}const v=this.camera.position.clone().sub(this.controls.target);
   if(['+','=','-'].includes(e.key))v.multiplyScalar(e.key==='-'?1.15:1/1.15);
   else{const axis=e.key==='ArrowLeft'||e.key==='ArrowRight'?new T.Vector3(0,1,0):new T.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);v.applyAxisAngle(axis,['ArrowLeft','ArrowUp'].includes(e.key)?.12:-.12);}
   this.camera.position.copy(this.controls.target).add(v);this.controls.update();this.currentView=null;this.viewChanged?.();
  });
  this.marker=new T.Sprite(new T.SpriteMaterial({map:this.markerTexture(),color:0x90e9ff,depthTest:false,transparent:true}));this.marker.visible=false;this.marker.renderOrder=10;this.scene.add(this.marker);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
 }
 markerTexture(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(32,32,20,0,Math.PI*2);x.stroke();for(const [a,b,c,d] of [[32,2,32,10],[32,54,32,62],[2,32,10,32],[54,32,62,32]]){x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();}return new T.CanvasTexture(c);}
 setAnatomy(nodes){
  this.nodes=nodes;const a=anatomyCoordinates(nodes);this.ids=a.ids;this.radius=a.radius;this.indexOf=new Int32Array(nodes.length);this.indexOf.fill(-1);a.ids.forEach((id,j)=>this.indexOf[id]=j);
  this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.BufferAttribute(a.positions,3));this.last=new Float32Array(a.ids.length);this.last.fill(-1e9);this.geometry.setAttribute('lastSpike',new T.BufferAttribute(this.last,1).setUsage(T.DynamicDrawUsage));
  this.material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{now:{value:0},dpr:{value:Math.min(devicePixelRatio,2)},base:{value:.16},pointScale:{value:1},activeOnly:{value:false}},
   vertexShader:`attribute float lastSpike;uniform float now;uniform float dpr;uniform float pointScale;varying float activity;void main(){activity=exp(-max(0.,now-lastSpike)/80.);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=dpr*pointScale*(1.25+activity*5.5);}`,
   fragmentShader:`uniform float base;uniform bool activeOnly;varying float activity;void main(){float d=length(gl_PointCoord-vec2(.5))*2.;if(d>1.|| (activeOnly&&activity<.02))discard;float edge=1.-smoothstep(.25,1.,d);vec3 cold=vec3(.40,.60,.65);vec3 hot=activity>.5?mix(vec3(.92,.94,.32),vec3(1.,.29,.12),(activity-.5)*2.):mix(vec3(.10,.85,.55),vec3(.92,.94,.32),activity*2.);gl_FragColor=vec4(mix(cold,hot,min(1.,activity*4.)),(base*(activeOnly?0.:1.)+activity*.9)*edge);}`});
  this.points=new T.Points(this.geometry,this.material);this.scene.add(this.points);this.camera.near=this.radius/2000;this.camera.far=this.radius*30;this.controls.minDistance=this.radius*.2;this.controls.maxDistance=this.radius*12;this.camera.updateProjectionMatrix();this.view('3d');
 }
 update(last,time,selected){this.time=time;if(!this.points)return;this.ids.forEach((id,j)=>this.last[j]=last[id]);this.geometry.attributes.lastSpike.needsUpdate=true;this.material.uniforms.now.value=time;this.select(selected);}
 select(id){this.selected=id;const index=this.indexOf?.[id];this.marker.visible=index>=0;if(this.marker.visible)this.marker.position.fromBufferAttribute(this.geometry.attributes.position,index);}
 setOptions({activeOnly,base,pointScale}){if(!this.material)return;if(activeOnly!==undefined)this.material.uniforms.activeOnly.value=activeOnly;if(base!==undefined)this.material.uniforms.base.value=base;if(pointScale!==undefined)this.material.uniforms.pointScale.value=pointScale;}
 setPan(on){this.controls.mouseButtons.LEFT=on?T.MOUSE.PAN:T.MOUSE.ROTATE;this.controls.touches.ONE=on?T.TOUCH.PAN:T.TOUCH.ROTATE;this.canvas.style.cursor=on?'move':'grab';}
 view(name){
  const offset=new T.Vector3(...({ '3d':[.65,.28,1],xy:[0,0,1],xz:[0,1,0],yz:[1,0,0]}[name]||[.65,.28,1])).normalize();
  this.camera.up.set(...(name==='xz'?[0,0,-1]:[0,1,0]));const right=new T.Vector3().crossVectors(this.camera.up,offset).normalize(),up=new T.Vector3().crossVectors(offset,right),tan=Math.tan(T.MathUtils.degToRad(19)),p=new T.Vector3();let fit=this.radius;
  if(this.geometry)for(let i=0;i<this.ids.length;i++){p.fromBufferAttribute(this.geometry.attributes.position,i);fit=Math.max(fit,p.dot(offset)+Math.max(Math.abs(p.dot(up))/tan,Math.abs(p.dot(right))/(tan*this.camera.aspect)));}
  this.controls.target.set(0,0,0);this.camera.position.copy(offset.multiplyScalar(fit*1.12));this.controls.update();this.currentView=name;
 }
 focusSelected(){if(!this.marker.visible)return false;const offset=this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(this.radius*.85);this.controls.target.copy(this.marker.position);this.camera.position.copy(this.marker.position).add(offset);this.controls.update();this.currentView=null;this.viewChanged?.();return true;}
 pick(e){if(!this.points)return;const r=this.canvas.getBoundingClientRect();this.raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);this.raycaster.params.Points.threshold=this.camera.position.distanceTo(this.controls.target)*Math.tan(T.MathUtils.degToRad(19))*8/r.height;
  const hits=this.raycaster.intersectObject(this.points).filter(h=>!this.material.uniforms.activeOnly.value||this.time-this.last[h.index]<313);if(hits.length)this.onSelect(this.ids[hits[0].index]);
 }
 resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();if(this.currentView&&this.geometry)this.view(this.currentView);}
 render(){this.controls.update();if(this.marker.visible){const size=this.camera.position.distanceTo(this.marker.position)*Math.tan(T.MathUtils.degToRad(19))*36/Math.max(1,this.canvas.clientHeight);this.marker.scale.setScalar(size);}this.renderer.render(this.scene,this.camera);}
}
