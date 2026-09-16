// Illustrative sensory encoders, not calibrated concentrations, acoustics or tuning curves.
export const STIMULUS_DEFAULTS={foodOn:false,food:[-2.1,1.1,-.6],foodPower:1,foodGuide:true,speakerOn:false,speaker:[2.5,1.4,-1.5],soundPower:1,soundFrequency:220,soundPulse:false};
export const SENSORY_GROUPS=['odorL','odorR','soundAL','soundAR','soundBL','soundBR'];
const distance=(p,q)=>Math.hypot(...p.map((v,i)=>v-q[i]));
export function odorAt(p,c){return c.foodOn?1-Math.exp(-c.foodPower*2*Math.exp(-distance(p,c.food)/1.8)):0;}
export function sampleStimuli(p,yaw,c,time=0){
 const side=[Math.cos(yaw)*.18,0,Math.sin(yaw)*.18];
 const odor=[-1,1].map(s=>odorAt(p.map((v,i)=>v+s*side[i]),c));
 const gradient=[0,1,2].map(axis=>{const a=[...p],b=[...p];a[axis]+=.1;b[axis]-=.1;return (odorAt(a,c)-odorAt(b,c))/.2;});
 const horizontal=Math.hypot(gradient[0],gradient[2]);
 const bearing=Math.atan2(gradient[0]*Math.cos(yaw)+gradient[2]*Math.sin(yaw),gradient[0]*Math.sin(yaw)-gradient[2]*Math.cos(yaw));
 const elevation=Math.atan2(gradient[1],horizontal);
 // Only the amplitude envelope is encoded; no acoustic pressure units or carrier phase.
 const envelope=c.speakerOn&&(!c.soundPulse||time%1<.35)?1:0;
 const sound=[-1,1].map(s=>envelope*c.soundPower/(1+(distance(p.map((v,i)=>v+s*side[i]),c.speaker)/1.2)**2));
 const tuningA=Math.exp(-.5*(Math.log(c.soundFrequency/220)/.7)**2),tuningB=Math.exp(-.5*(Math.log(c.soundFrequency/70)/.6)**2);
 return {odor,odorLevel:odorAt(p,c),gradient,bearing,elevation,sound,envelope,
  targetHz:[...odor.map(v=>v*140),...sound.map(v=>v*tuningA*140),...sound.map(v=>v*tuningB*140)]};
}
