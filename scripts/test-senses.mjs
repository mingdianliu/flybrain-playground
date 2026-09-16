import assert from 'node:assert/strict';
import {STIMULUS_DEFAULTS,sampleStimuli,odorAt} from '../web/room-stimuli.mjs';
import {FlightWorld} from '../web/room-core.mjs';
const c={...STIMULUS_DEFAULTS,foodOn:true,food:[-1,1.5,0],speakerOn:true,speaker:[1,1.5,0]};
const at=(p,config={},time=0)=>sampleStimuli(p,0,{...c,...config},time);
assert.ok(odorAt([-.8,1.5,0],c)>odorAt([2,1.5,0],c));
assert.ok(at([0,1.5,0],{foodPower:2}).odorLevel>at([0,1.5,0]).odorLevel);
assert.deepEqual(at([0,1.5,0],{foodOn:false,speakerOn:false}).targetHz,[0,0,0,0,0,0]);
assert.deepEqual(at([0,1.5,0],{foodPower:0,soundPower:0}).targetHz,[0,0,0,0,0,0]);
assert.ok(at([0,1.5,0]).odor[0]>at([0,1.5,0]).odor[1]);
assert.ok(at([0,1.5,0]).sound[1]>at([0,1.5,0]).sound[0]);
assert.ok(at([.8,1.5,0]).sound[0]>at([-2,1.5,0]).sound[0]);
for(const [f,sign] of [[70,-1],[220,1]]){const h=at([0,1.5,0],{soundFrequency:f}).targetHz;assert.ok((h[2]-h[4])*sign>0);}
assert.ok(at([0,1.5,0],{soundPulse:true},.2).envelope);assert.equal(at([0,1.5,0],{soundPulse:true},.5).envelope,0);assert.equal(at([0,1.5,0],{soundPulse:true},1.05).envelope,1);
const settings={...c,vision:false,obstacles:false,light:0,start:[0,1.5,1.5],startYaw:0};
const guided=new FlightWorld(settings),unguided=new FlightWorld({...settings,foodGuide:false}),silent=new FlightWorld(settings);
const rates=new Float32Array(72);
for(let i=0;i<50;i++){guided.advance(.02,rates,[70,70]);unguided.advance(.02,rates,[70,70]);silent.advance(.02,rates,[]);}
assert.ok(guided.p[0]<-.1);assert.deepEqual(unguided.p,silent.p,'No ORN spikes must mean no food steering assist');
const soundOnly=new FlightWorld({...settings,foodOn:false}),control=new FlightWorld({...settings,foodOn:false});
for(let i=0;i<20;i++){soundOnly.advance(.02,rates,[0,0,100,100,100,100]);control.advance(.02,rates,[]);}assert.deepEqual(soundOnly.p,control.p,'Sound has no invented motor response');
const time=guided.time,p=[...guided.p];guided.configure({food:[2,1.5,0],speaker:[-2,1.5,0],soundFrequency:9999});assert.equal(guided.time,time);assert.deepEqual(guided.p,p);assert.equal(guided.config.soundFrequency,800);
console.log('PASS senses: source distance/intensity/off, source laterality, frequency bands, model-time pulses, spike-gated food steering, independent sound input, live state preserved');
