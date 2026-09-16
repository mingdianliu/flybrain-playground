import assert from 'node:assert/strict';
import {FlightWorld,castRay,ROOM} from '../web/room-core.mjs';
const open=new FlightWorld({windowX:0,obstacles:false});
const aperture=castRay([0,ROOM.windowY,0],0,0,open.config);assert.equal(aperture.hit,'window');assert.equal(aperture.range,30);
const glass=castRay([0,ROOM.windowY,0],0,0,{...open.config,open:false});assert.equal(glass.range,3);assert.equal(glass.brightness,aperture.brightness);
const dark=castRay([0,ROOM.windowY,0],0,0,{...open.config,light:0});assert.equal(dark.brightness,0);
const occluded=castRay([-.7,1,1.8],0,0,{...open.config,obstacles:true});assert.equal(occluded.hit,'obstacle');
for(const windowX of [-1.5,0,1.5])for(let trial=0;trial<4;trial++){
 const w=new FlightWorld({windowX});w.reset(trial);
 for(let step=0;step<4000&&!w.escaped;step++)w.advance(.02,w.retina.map(r=>2+110*r.brightness));
 assert.ok(w.escaped,`Sensor-controller check: trial ${trial}, window ${windowX}`);assert.equal(w.contacts,0);
}
const closed=new FlightWorld({open:false});
for(let i=0;i<2000;i++){closed.advance(.02,closed.retina.map(r=>2+110*r.brightness));assert.ok(closed.p[2]>=-ROOM.halfZ+ROOM.radius);assert.equal(closed.escaped,false);}
closed.reset(0);assert.equal(closed.time,0);assert.equal(closed.path,0);assert.equal(closed.escaped,false);
console.log('PASS: ray-cast light, glass collision, darkness, occlusion, 12 open-window scenarios, closed-window containment, reset. These use expected sensory rates; test-room-full.mjs tests computed LIF spikes.');
