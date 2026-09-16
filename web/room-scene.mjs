import * as T from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {ROOM,OBSTACLES} from './room-core.mjs';
export class RoomScene{
 constructor(canvas,{onMove=()=>{},onMode=()=>{},onWindow=()=>{},height=()=>1.5}={}){
  this.onMove=onMove;this.onMode=onMode;this.onWindow=onWindow;this.height=height;this.mode='orbit';
  this.canvas=canvas;this.renderer=new T.WebGLRenderer({preserveDrawingBuffer:new URLSearchParams(location.search).has('capture'),canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
  this.scene=new T.Scene();this.scene.fog=new T.FogExp2(0x172536,.025);this.camera=new T.PerspectiveCamera(36,1,.05,80);this.camera.position.set(8,6.5,9);
  this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,.6,-.3);this.controls.enableDamping=true;this.controls.minDistance=3;this.controls.maxDistance=20;this.controls.maxPolarAngle=Math.PI*.49;this.controls.update();
  this.scene.add(new T.HemisphereLight(0xc9e7fa,0x4b574c,2.5));this.sun=new T.DirectionalLight(0xffedd2,4);this.sun.position.set(-1,6,-4);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:20});this.sun.shadow.bias=-.0005;this.scene.add(this.sun);
  this.fill=new T.PointLight(0xb4dfff,8,14,2);this.fill.position.set(1,4,3);this.scene.add(this.fill);
  this.materials={floor:new T.MeshStandardMaterial({color:0x71838c,roughness:.78}),wall:new T.MeshStandardMaterial({color:0xb8c3c2,roughness:.9}),frame:new T.MeshStandardMaterial({color:0xe3e5db,metalness:.15,roughness:.35}),wood:new T.MeshStandardMaterial({color:0x465d67,roughness:.65}),edge:new T.LineBasicMaterial({color:0x718e9f,transparent:true,opacity:.35})};
  this.base=this.box(7.2,.15,6.2,0,-.1,0,this.materials.floor);this.scene.add(this.base);const ground=this.box(200,.05,200,0,-.23,0,new T.MeshStandardMaterial({color:0x17283a,roughness:1}));this.scene.add(ground);
  const grid=new T.GridHelper(7,28,0x8dabb0,0x91a6ab);grid.scale.z=6/7;grid.position.y=-.019;grid.material.transparent=true;grid.material.opacity=.2;this.scene.add(grid);
  this.scene.add(this.box(.12,ROOM.height,6,-3.56,ROOM.height/2,0,this.materials.wall));
  const wire=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(7,2.8,6)),this.materials.edge);wire.position.y=1.4;this.scene.add(wire);
  this.back=new T.Group();this.scene.add(this.back);this.furniture=new T.Group();this.scene.add(this.furniture);
  for(const [i,o] of OBSTACLES.entries()){
   if(i===0){this.furniture.add(this.box(o.w,o.h,o.d,o.x,o.h/2,o.z,this.materials.wood));for(let y=.35;y<o.h;y+=.48)this.furniture.add(this.box(o.w+.008,.012,.02,o.x,y,o.z+o.d/2+.01,this.materials.frame));for(const x of [o.x-.13,o.x+.13])this.furniture.add(this.box(.02,.19,.035,x,.97,o.z+o.d/2+.025,this.materials.frame));}
   else{this.furniture.add(this.box(o.w,.09,o.d,o.x,o.h-.045,o.z,this.materials.wood));for(const x of [-1,1])for(const z of [-1,1])this.furniture.add(this.box(.055,o.h-.09,.055,o.x+x*(o.w/2-.12),(o.h-.09)/2,o.z+z*(o.d/2-.1),this.materials.frame));}
  }
  this.fly=this.makeFly();this.scene.add(this.fly);
  this.lamp=new T.Group();this.bulbMaterial=new T.MeshStandardMaterial({color:0xffe8a0,emissive:0xffc75e,emissiveIntensity:2,roughness:.25});
  this.bulb=new T.Mesh(new T.SphereGeometry(.16,24,16),this.bulbMaterial);this.lamp.add(this.bulb);
  const guard=new T.Mesh(new T.TorusGeometry(.225,.022,8,40),this.materials.frame);guard.rotation.x=Math.PI/2;this.lamp.add(guard);this.scene.add(this.lamp);
  this.lampLight=new T.PointLight(0xffd58a,18,10,2);this.lampLight.castShadow=true;this.lampLight.shadow.mapSize.set(512,512);this.lamp.add(this.lampLight);
  this.lampFoot=new T.Mesh(new T.RingGeometry(.19,.23,40),new T.MeshBasicMaterial({color:0xffd58a,transparent:true,opacity:.65,side:T.DoubleSide}));this.lampFoot.rotation.x=-Math.PI/2;this.lampFoot.position.y=.01;this.scene.add(this.lampFoot);
  this.blocker=new T.Mesh(new T.IcosahedronGeometry(.38,2),new T.MeshStandardMaterial({color:0x6889a6,roughness:.4,metalness:.35}));this.blocker.castShadow=true;this.blocker.receiveShadow=true;this.scene.add(this.blocker);
  this.food=new T.Group();this.speaker=new T.Group();this.scene.add(this.food,this.speaker);
  const plate=new T.Mesh(new T.CylinderGeometry(.3,.25,.045,40),this.materials.frame);plate.position.y=-.12;this.food.add(plate);
  for(const [x,y,z,color] of [[-.1,-.025,.04,0xeaa149],[.1,-.02,.05,0xd97641],[0,.015,-.08,0xe3ba58]]){const fruit=new T.Mesh(new T.SphereGeometry(.105,20,12),new T.MeshStandardMaterial({color,roughness:.5}));fruit.position.set(x,y,z);fruit.castShadow=true;this.food.add(fruit);const stem=this.box(.015,.065,.015,x,y+.11,z,this.materials.wood);this.food.add(stem);}
  this.speaker.add(this.box(.37,.48,.25,0,0,0,new T.MeshStandardMaterial({color:0x436878,roughness:.35,metalness:.3})));
  for(const [y,r] of [[-.07,.12],[.135,.055]]){const cone=new T.Mesh(new T.CylinderGeometry(r,r*.75,.035,32),new T.MeshStandardMaterial({color:0x132631,roughness:.6}));cone.rotation.x=Math.PI/2;cone.position.set(0,y,.145);this.speaker.add(cone);const rim=new T.Mesh(new T.TorusGeometry(r,.012,8,40),new T.MeshStandardMaterial({color:0x9edcdd,emissive:0x358c9d,emissiveIntensity:.3}));rim.position.set(0,y,.166);this.speaker.add(rim);}
  for(const [object,kind] of [[this.food,'food'],[this.speaker,'speaker']])object.traverse(m=>{m.userData.kind=kind;});
  this.stimulusRings={};for(const [kind,color] of [['food',0xf4be69],['speaker',0x87dadd]]){this.stimulusRings[kind]=Array.from({length:3},()=>{const ring=new T.Mesh(new T.RingGeometry(.98,1,64),new T.MeshBasicMaterial({color,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;this.scene.add(ring);return ring;});}
  this.startMarker=new T.Group();const ring=new T.Mesh(new T.TorusGeometry(.23,.014,8,48),new T.MeshBasicMaterial({color:0xc6f3c2,transparent:true,opacity:.8}));ring.rotation.x=Math.PI/2;this.startMarker.add(ring);const heading=new T.Mesh(new T.ConeGeometry(.07,.19,12),ring.material);heading.rotation.x=-Math.PI/2;heading.position.z=-.3;this.startMarker.add(heading);this.scene.add(this.startMarker);
  this.dragPlane=new T.Mesh(new T.PlaneGeometry(7,6),new T.MeshBasicMaterial({color:0x89dad6,transparent:true,opacity:.045,side:T.DoubleSide,depthWrite:false}));this.dragPlane.rotation.x=-Math.PI/2;this.dragPlane.visible=false;this.scene.add(this.dragPlane);
  this.marker=new T.Mesh(new T.RingGeometry(.18,.195,48),new T.MeshBasicMaterial({color:0xd6ffd9,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}));this.marker.rotation.x=-Math.PI/2;this.marker.position.y=.006;this.scene.add(this.marker);
  this.trailArray=new Float32Array(8192*3);this.trailGeo=new T.BufferGeometry();this.trailGeo.setAttribute('position',new T.BufferAttribute(this.trailArray,3));this.trailGeo.setDrawRange(0,0);this.trail=new T.Line(this.trailGeo,new T.LineBasicMaterial({color:0xc7efc1,transparent:true,opacity:.85}));this.trail.frustumCulled=false;this.scene.add(this.trail);this.trailCount=0;this.lastTime=-1;
  this.rayGeo=new T.BufferGeometry();this.rayPositions=new Float32Array(72*6);this.rayColors=new Float32Array(72*6);this.rayGeo.setAttribute('position',new T.BufferAttribute(this.rayPositions,3));this.rayGeo.setAttribute('color',new T.BufferAttribute(this.rayColors,3));this.rays=new T.LineSegments(this.rayGeo,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.23,depthWrite:false}));this.rays.frustumCulled=false;this.rays.visible=false;this.scene.add(this.rays);
  this.follow=false;this.config={};this.configure({open:true,light:1,windowX:0,obstacles:true});this.resize();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);
  this.bindInteraction();
 }
 box(w,h,d,x,y,z,material){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
 makeFly(){
  const fly=new T.Group(),body=new T.MeshStandardMaterial({color:0x233737,metalness:.7,roughness:.3}),eye=new T.MeshStandardMaterial({color:0xcc6544,metalness:.25,roughness:.3}),wing=new T.MeshPhysicalMaterial({color:0xcfe4e5,metalness:.1,roughness:.15,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false});
  const ellipsoid=(mat,scale,pos,parent=fly)=>{const m=new T.Mesh(new T.SphereGeometry(1,24,16),mat);m.scale.set(...scale);m.position.set(...pos);m.castShadow=true;parent.add(m);return m;};
  ellipsoid(body,[.056,.05,.105],[0,0,.05]);ellipsoid(body,[.06,.055,.058],[0,.008,-.055]);ellipsoid(body,[.052,.045,.045],[0,.008,-.124]);ellipsoid(eye,[.026,.036,.029],[-.04,.012,-.143]);ellipsoid(eye,[.026,.036,.029],[.04,.012,-.143]);this.wings=[];
  for(const sign of [-1,1]){const pivot=new T.Group();pivot.position.set(sign*.035,.035,-.045);fly.add(pivot);ellipsoid(wing,[.135,.006,.043],[sign*.115,0,.042],pivot);this.wings.push(pivot);
   for(let i=0;i<3;i++){const points=[[sign*.04,-.018,-.07+i*.048],[sign*.09,-.067,-.05+i*.07],[sign*.115,-.11,-.075+i*.09]].map(p=>new T.Vector3(...p));const leg=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x172b30}));fly.add(leg);}}
  fly.scale.setScalar(1.55);return fly;
 }
 configure(c){
  this.renderer.shadowMap.needsUpdate=true;
  if(c.windowX!==this.config.windowX||c.open!==this.config.open){
   while(this.back.children.length){const m=this.back.children[0];this.back.remove(m);m.geometry?.dispose();if(m.userData.disposable)m.material.dispose();}
   const x=c.windowX,w=ROOM.windowWidth,h=ROOM.windowHeight,y=ROOM.windowY,z=-3.06;
   const left=x-w/2+3.5,right=3.5-x-w/2;
   this.back.add(this.box(left,2.8,.12,-3.5+left/2,1.4,z,this.materials.wall),this.box(right,2.8,.12,x+w/2+right/2,1.4,z,this.materials.wall),this.box(w,y-h/2,.12,x,(y-h/2)/2,z,this.materials.wall),this.box(w,2.8-y-h/2,.12,x,y+h/2+(2.8-y-h/2)/2,z,this.materials.wall));
   for(const dx of [-w/2,w/2])this.back.add(this.box(.075,h+.12,.22,x+dx,y,z,this.materials.frame));for(const dy of [-h/2,h/2])this.back.add(this.box(w+.16,.07,.24,x,y+dy,z,this.materials.frame));
   this.skyMaterial=new T.MeshBasicMaterial({color:0xe5f4d8});const sky=this.box(w-.03,h-.03,.02,x,y,-3.2,this.skyMaterial);sky.userData.disposable=true;this.back.add(sky);
   const paneMat=new T.MeshPhysicalMaterial({color:0xb9e2e3,transparent:true,opacity:c.open?.18:.48,roughness:.08,metalness:.1,side:T.DoubleSide,depthWrite:false});const pane=this.box(w-.08,h-.08,.025,c.open?x-w*.45:x,y,c.open?-3.6:-3.01,paneMat);pane.userData.disposable=true;if(c.open)pane.rotation.y=-1.2;this.back.add(pane);
   this.windowPick=[pane,sky];
   if(!c.open){this.back.add(this.box(.03,h,.025,x,y,-2.98,this.materials.frame),this.box(w,.025,.025,x,y,-2.98,this.materials.frame));}
  }
  this.config={...c};this.furniture.visible=c.obstacles;this.sun.intensity=.4+c.light*3.6;this.sun.position.x=c.windowX-1;this.fill.intensity=3+c.light*5;this.skyMaterial.color.setRGB(.07+c.light*.8,.13+c.light*.8,.23+c.light*.61);
  this.lamp.position.set(...(c.lamp||[1.8,1.65,1.2]));this.lampLight.intensity=c.lampOn?(c.lampPower||0)*18*(this.state?.flash?3:1):0;this.bulbMaterial.emissiveIntensity=c.lampOn?(c.lampPower||0)*2.5*(this.state?.flash?3:1):0;
  this.lampFoot.position.x=this.lamp.position.x;this.lampFoot.position.z=this.lamp.position.z;this.lampFoot.material.opacity=c.lampOn?.65:.18;
  this.blocker.visible=!!c.blockerOn;this.blocker.position.set(...(c.blocker||[0,1.35,.5]));
  this.food.position.set(...(c.food||[-2.1,1.1,-.6]));this.speaker.position.set(...(c.speaker||[2.5,1.4,-1.5]));
  this.food.visible=!!c.foodOn||this.mode==='food';this.speaker.visible=!!c.speakerOn||this.mode==='speaker';
  for(const kind of ['food','speaker']){const on=kind==='food'?c.foodOn&&c.foodPower>0:c.speakerOn&&c.soundPower>0&&(!c.soundPulse||(this.state?.time||0)%1<.35),power=kind==='food'?c.foodPower:c.soundPower;
   this.stimulusRings[kind].forEach((ring,i)=>{const phase=((this.state?.time||0)*.65+i/3)%1;ring.visible=!!on;ring.position.copy(this[kind].position);ring.scale.setScalar(.32+phase*(1+(power||0)*.6));ring.material.opacity=(1-phase)*.22;});}
  const start=c.start||[-2.25,1.45,1.9];this.startMarker.position.set(...start);this.startMarker.rotation.y=-(c.startYaw??.5);this.startMarker.visible=this.mode==='start'||!this.state?.enabled;
 }
 resize(){const r=this.canvas.parentElement.getBoundingClientRect();this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/Math.max(1,r.height);this.camera.updateProjectionMatrix();}
 setFollow(on){this.follow=on;this.controls.enabled=!on;if(!on){this.camera.position.set(8,6.5,9);this.controls.target.set(0,.6,-.3);this.controls.update();}}
 setMode(mode){this.mode=mode;this.dragPlane.visible=mode!=='orbit';this.dragPlane.position.y=this.height(mode);this.canvas.style.cursor=mode==='orbit'?'grab':'crosshair';}
 cameraView(view){this.follow=false;this.controls.enabled=true;this.controls.target.set(0,.6,-.3);this.camera.position.set(...(view==='top'?[0,12,.001]:[8,6.5,9]));this.controls.update();}
 bindInteraction(){
  const ray=new T.Raycaster(),point=new T.Vector3();
  const setRay=e=>{const r=this.canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);};
  const move=(e,commit=false)=>{setRay(e);const plane=new T.Plane(new T.Vector3(0,1,0),-this.height(this.dragKind));if(ray.ray.intersectPlane(plane,point)){const p=[point.x,this.height(this.dragKind),point.z].map(v=>Math.round(v*100)/100);this.onMove(this.dragKind,p,commit);}};
  this.canvas.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;setRay(e);let kind=this.mode;
   if(kind==='orbit'){const hit=ray.intersectObjects([this.bulb,...(this.blocker.visible?[this.blocker]:[]),...(this.food.visible?[this.food]:[]),...(this.speaker.visible?[this.speaker]:[]),...(this.windowPick||[])],true)[0];if(!hit)return;if(this.windowPick.includes(hit.object)){this.windowPress=[e.clientX,e.clientY];return;}kind=hit.object.userData.kind||(hit.object===this.blocker?'blocker':'lamp');}
   e.preventDefault();e.stopImmediatePropagation();this.dragKind=kind;this.follow=false;this.controls.enabled=false;this.onMode(kind);this.canvas.setPointerCapture(e.pointerId);this.canvas.style.cursor='grabbing';move(e);
  },true);
  this.canvas.addEventListener('pointermove',e=>{if(this.dragKind){e.preventDefault();e.stopImmediatePropagation();move(e);}},true);
  const end=e=>{if(this.windowPress){if(e.type==='pointerup'&&Math.hypot(e.clientX-this.windowPress[0],e.clientY-this.windowPress[1])<5)this.onWindow();this.windowPress=null;}if(!this.dragKind)return;e.preventDefault();e.stopImmediatePropagation();if(e.type!=='pointercancel')move(e,true);this.dragKind=null;this.controls.enabled=!this.follow;if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);this.setMode(this.mode);};
  this.canvas.addEventListener('pointerup',end,true);this.canvas.addEventListener('pointercancel',end,true);
 }
 update(state){
  this.state=state;this.configure(state.config);this.fly.position.set(...state.p);this.fly.rotation.set(state.pitch,-state.yaw,-state.turn*.07,'YXZ');this.marker.position.x=state.p[0];this.marker.position.z=state.p[2];
  this.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(.2+Math.sin(state.time*260)*.55));
  if(state.time<this.lastTime||state.time===0){this.trailCount=0;this.trailGeo.setDrawRange(0,0);}
  if(state.time!==this.lastTime&&this.trailCount<8192){this.trailArray.set(state.p,this.trailCount*3);this.trailCount++;this.trailGeo.setDrawRange(0,this.trailCount);this.trailGeo.attributes.position.needsUpdate=true;this.lastTime=state.time;}
  state.retina.forEach((r,i)=>{this.rayPositions.set(state.p,i*6);this.rayPositions.set(r.end,i*6+3);const color=r.light>.1?[1,.85,.42]:[.35,.7,.73];this.rayColors.set(color,i*6);this.rayColors.set(color,i*6+3);});this.rayGeo.attributes.position.needsUpdate=true;this.rayGeo.attributes.color.needsUpdate=true;
 }
 render(){if(this.follow&&this.state){const p=this.fly.position,offset=new T.Vector3(-Math.sin(this.state.yaw)*1.5,.7,Math.cos(this.state.yaw)*1.5);this.camera.position.lerp(p.clone().add(offset),.09);this.camera.lookAt(p.clone().add(new T.Vector3(0,.1,0)));}else this.controls.update();this.renderer.render(this.scene,this.camera);}
}
