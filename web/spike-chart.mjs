const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString();
export class SpikeChart{
 constructor(canvas,onSelect){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.mode='cells';this.dirty=true;this.onSelect=onSelect;
  $('rasterMode').onchange=()=>{this.mode=$('rasterMode').value;this.inspect=null;this.updateLabels();this.describe();this.dirty=true;};
  canvas.addEventListener('pointermove',e=>{this.inspect=this.pointer(e);this.describe();});
  canvas.addEventListener('pointerleave',()=>{this.inspect=null;this.describe();});
  canvas.addEventListener('click',e=>{const p=this.pointer(e);if(this.mode==='cells'&&this.data&&p.row>=0&&p.row<this.data.sampleIds.length)this.onSelect(this.data.sampleIds[p.row]);});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();this.updateLabels();
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);this.dirty=true;}
 update(data,nodes,manifest){if(!data)return;this.data={...data,density:new Uint32Array(data.density),events:new Float64Array(data.events)};this.nodes=nodes;this.manifest=manifest;this.dirty=true;this.updateLabels();this.describe();}
 layout(){const left=this.width<380?115:140;return {left,top:15,right:this.width-16,bottom:this.height-32};}
 updateLabels(){
  const cells=this.mode==='cells',d=this.data;
  $('rasterTitle').textContent=cells?'单细胞放电栅格':'全网放电密度';
  $('rasterGuide').textContent=cells?'12 个固定样本，每行一个神经元；首行为探针，其余为感觉输入和下游参考细胞。':'所有神经元、所有放电均计入；按细胞类别与 10 ms 时间格汇总。';
  $('rasterLegend').textContent=cells?'竖线 = 一次放电':'颜色 = 平均放电率 · 0 / 1 / 10 / ≥100 Hz（对数色阶）';
  $('rasterScale').hidden=cells;
  const samples=d?.sampleCounts.reduce((s,n)=>s+n,0)||0;
  $('rasterWindow').textContent=d?`${(d.start/1000).toFixed(2)}–${(d.end/1000).toFixed(2)} s · 全网 ${fmt(d.total)} 次${cells?' · 样本 '+fmt(samples)+' 次':''}`:'等待计算';
  this.canvas.style.cursor=cells?'pointer':'crosshair';
  this.canvas.setAttribute('aria-label',`${$('rasterTitle').textContent}。${$('rasterGuide').textContent} ${$('rasterWindow').textContent}`);
 }
 pointer(e){const r=this.canvas.getBoundingClientRect(),l=this.layout(),rows=this.mode==='cells'?(this.data?.sampleIds.length||12):(this.data?.groups.length||9);return {x:e.clientX-r.left,y:e.clientY-r.top,row:Math.floor((e.clientY-r.top-l.top)/(l.bottom-l.top)*rows)};}
 describe(){
  const d=this.data,p=this.inspect,l=this.layout();
  if(!d||!p||p.row<0||p.y>l.bottom){$('rasterInspect').textContent=this.mode==='cells'?'悬停查看细胞与放电时间；点击一行设为探针。':'悬停查看每格的放电数、细胞数和平均放电率。';return;}
  if(this.mode==='cells'){
   const id=d.sampleIds[p.row];if(id===undefined)return;const n=this.nodes[id];let closest=null,delta=Infinity;
   for(let j=0;j<d.events.length;j+=2)if(d.events[j]===p.row){const t=d.events[j+1],x=l.left+(t-d.start)/(d.end-d.start)*(l.right-l.left),gap=Math.abs(p.x-x);if(gap<delta){delta=gap;closest=t;}}
   $('rasterInspect').textContent=`${this.manifest.types[n[1]]} · body ${n[0]} · 本窗口 ${d.sampleCounts[p.row]} 次${delta<5?' · 放电时刻 '+(closest/1000).toFixed(4)+' s':''}`;
  }else{
   const b=Math.floor((p.x-l.left)/(l.right-l.left)*d.bins),g=d.groups[p.row];if(!g||b<0||b>=d.bins)return;
   const num=d.density[p.row*d.bins+b],hz=num/Math.max(1,g.neurons)/(d.binMs/1000);
   $('rasterInspect').textContent=`${g.label} · ${((d.start+b*d.binMs)/1000).toFixed(2)} s 起 ${d.binMs} ms · ${fmt(num)} 次 / ${fmt(g.neurons)} 个细胞 = ${hz.toFixed(2)} Hz`;
  }
 }
 draw(){
  if(!this.dirty||!this.width||!this.height)return;this.dirty=false;
  const c=this.ctx,w=this.width,h=this.height,l=this.layout(),d=this.data;
  c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#08121c';c.fillRect(0,0,w,h);if(!d){c.fillStyle='#9bb0bf';c.font='12px system-ui';c.fillText('等待神经网络计算',18,35);return;}
  const rows=this.mode==='cells'?d.sampleIds.length:d.groups.length,rh=(l.bottom-l.top)/Math.max(1,rows),x=t=>l.left+(t-d.start)/(d.end-d.start)*(l.right-l.left);
  c.font='12px ui-monospace, monospace';c.textBaseline='middle';
  for(let r=0;r<rows;r++){
   const y=l.top+r*rh;c.fillStyle=r%2?'#10202a':'#0b1923';c.fillRect(l.left,y,l.right-l.left,rh);
   c.fillStyle=this.mode==='cells'&&r===0?'#89d9ee':'#aec3cf';c.textAlign='right';
   if(this.mode==='cells'){
    const n=this.nodes[d.sampleIds[r]],type=this.manifest.types[n[1]];let label=`${type} · ${n[0]}`;
    if(c.measureText(label).width>l.left-16)label=`${type.slice(0,5)} · ${n[0]}`;
    c.fillText(label,l.left-9,y+rh/2,l.left-16);
   }else{c.font='12px system-ui';c.fillText(d.groups[r].label,l.left-9,y+rh/2-5);c.fillStyle='#778f9f';c.font='12px ui-monospace, monospace';c.fillText(fmt(d.groups[r].neurons)+' 细胞',l.left-9,y+rh/2+9);}
  }
  if(this.mode==='density'){
   for(let r=0;r<rows;r++)for(let b=0;b<d.bins;b++){
    const num=d.density[r*d.bins+b];if(!num)continue;const hz=num/Math.max(1,d.groups[r].neurons)/(d.binMs/1000),a=Math.min(1,Math.log1p(hz)/Math.log(101));
    c.fillStyle=`hsl(${165-a*135},${45+a*40}%,${22+a*39}%)`;c.fillRect(x(d.start+b*d.binMs),l.top+r*rh+1,(l.right-l.left)/d.bins+.3,rh-2);
   }
  }else{
   c.save();c.beginPath();c.rect(l.left,l.top,l.right-l.left,l.bottom-l.top);c.clip();
   for(let j=0;j<d.events.length;j+=2){const row=d.events[j],t=d.events[j+1];c.fillStyle=row===0?'#85deef':'#b8eac8';c.fillRect(x(t)-.55,l.top+row*rh+rh*.2,1.1,rh*.6);}c.restore();
  }
  c.strokeStyle='#35505c';c.lineWidth=.6;c.font='12px ui-monospace, monospace';
  for(let k=0;k<=4;k++){const t=d.start+(d.end-d.start)*k/4,xx=x(t);c.beginPath();c.moveTo(xx,l.top);c.lineTo(xx,l.bottom);c.stroke();c.fillStyle='#91aab9';c.textAlign=k===0?'left':k===4?'right':'center';c.fillText((t/1000).toFixed(2),xx,l.bottom+17);}
  if(d.time<d.end){const xx=x(d.time);c.fillStyle='#07101bc4';c.fillRect(xx,l.top,l.right-xx,l.bottom-l.top);if(l.right-xx>85){c.fillStyle='#6e8797';c.textAlign='center';c.fillText('尚未计算',(xx+l.right)/2,(l.top+l.bottom)/2);}}
  c.strokeStyle='#6babb9';c.lineWidth=1;c.beginPath();c.moveTo(x(d.time),l.top);c.lineTo(x(d.time),l.bottom);c.stroke();
  c.fillStyle='#91aab9';c.textAlign='left';c.fillText('模拟时间 / s',10,h-15);
 }
}
