import assert from 'node:assert/strict';
import {SpikeHistory,BINS,referenceNeurons} from '../web/spike-history.mjs';

const manifest={classes:['ol_sensory','cb_intrinsic','vnc_motor','unknown'],types:['R1-R6','LC4','LPLC2','DNp01','other']};
const nodes=Array.from({length:30000},(_,i)=>[String(100000+i),i%5,i%4]);
const history=new SpikeHistory(nodes,manifest);
history.setSamples([0,4,1,0]);
assert.deepEqual(history.sampleIds,[0,4,1]);
assert.equal(history.groups.reduce((sum,g)=>sum+g.neurons,0),nodes.length);

// More than both former frame/window caps; include cells near the end of node order.
const everyone=nodes.map((_,i)=>i);
history.record(0,everyone);
history.record(500,everyone);
history.record(1999.8,everyone);
let frame=history.snapshot(2000);
assert.equal(frame.total,90000);
assert.equal(frame.density.reduce((a,b)=>a+b,0),90000);
assert.deepEqual(frame.sampleCounts,[3,3,3]);
assert.deepEqual([...frame.events],[0,0,0,500,0,1999.8,1,0,1,500,1,1999.8,2,0,2,500,2,1999.8]);
const motor=frame.groups.findIndex(g=>g.label==='运动神经元');
assert.equal(frame.density[motor*BINS],7500);
assert.deepEqual(history.snapshot(2000),frame,'Repeated paused snapshots must not drift or lose events');

// Transferring a display frame must not detach the accumulator's backing arrays.
structuredClone(frame,{transfer:[frame.density.buffer,frame.events.buffer]});
assert.equal(history.snapshot(2000).total,90000);
history.setSamples([29999,0]);
assert.deepEqual(history.snapshot(2000).sampleCounts,[3,3],'Changing the probe recovers its past spikes');

// Empty steps expire old activity; the circular buffer must not retain a prior turn.
history.record(2010,[]);
frame=history.snapshot(2010);
assert.equal(frame.start,10);
assert.equal(frame.total,60000);
assert.deepEqual(frame.sampleCounts,[2,2]);
history.record(2510,[29999]);
frame=history.snapshot(2510.2);
assert.equal(frame.total,30001);
assert.deepEqual(frame.sampleCounts,[2,1]);
history.record(6000,[]);
frame=history.snapshot(6000);
assert.equal(frame.total,0);
assert.deepEqual(frame.sampleCounts,[0,0]);
history.record(6000,[29999]);
assert.equal(history.snapshot(6000.2).total,1);
history.reset();
frame=history.snapshot(0);
assert.equal(frame.total,0);
assert.deepEqual(frame.sampleIds,[29999,0]);
assert.deepEqual(frame.sampleCounts,[0,0]);
assert.equal(frame.start,0);
assert.equal(frame.end,2000);
assert.deepEqual(referenceNeurons(nodes,manifest),referenceNeurons(nodes,manifest),'Reference selection is deterministic');
console.log('PASS spike history: 90,000 events, full 2-second retention, group conservation, probe history, transfer, rollover, pause and reset');
