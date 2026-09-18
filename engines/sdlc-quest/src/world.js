/* Native Canvas 2D renderer. Procedural art: no external assets, libraries or network. */
(function(root){
'use strict';
const palettes={cream:'#e9e8d4',mint:'#a8dfc4',deep:'#101d28',line:'#34515a'};
/* Map captions resolve through the QuestLang chrome resolver (t) so the world
 * follows the active language; pt-BR remains the fallback table. */
const CAPTIONS={
 pt:{stationDone:'ESTAÇÃO CONCLUÍDA',stationNext:'SUA PRÓXIMA MISSÃO',stationLocked:'EXPLORE APÓS A ANTERIOR'},
 en:{stationDone:'STATION COMPLETE',stationNext:'YOUR NEXT MISSION',stationLocked:'EXPLORE AFTER THE PREVIOUS ONE'}
};
function polygon(c,points,fill,stroke){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function box(c,x,y,w,d,h,top='#517767',left='#2a4745',right='#375953'){
 const p=[[x,y-h-d/2],[x+w/2,y-h],[x,y-h+d/2],[x-w/2,y-h]];
 polygon(c,[p[3],p[2],[x,y+d/2],[x-w/2,y]],left);
 polygon(c,[p[2],p[1],[x+w/2,y],[x,y+d/2]],right);
 polygon(c,p,top);
}
function line(c,points,color,width=2,dash=[]){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.setLineDash(dash);c.stroke();c.setLineDash([]);}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function label(c,text,x,y,color='#b7cec0',size=12,align='center',weight=600){c.font=`${weight} ${size}px "SFMono-Regular", Consolas, monospace`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(text,x,y);}
function plant(c,x,y,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);rect(c,-2,-13,4,16,'#314b3c');polygon(c,[[-1,-4],[-13,-13],[-14,-24],[-3,-20],[2,-9]],'#77a680');polygon(c,[[0,-9],[10,-29],[20,-32],[18,-20],[6,-7]],'#a2c290');polygon(c,[[-1,-14],[-7,-28],[0,-40],[7,-26],[4,-9]],'#b0c99b');c.restore();}
function crystal(c,x,y,color){polygon(c,[[x,y-25],[x+9,y-10],[x+6,y+2],[x-6,y+4],[x-9,y-8]],'#324f53');polygon(c,[[x,y-25],[x+9,y-10],[x,y+1]],color);polygon(c,[[x,y-25],[x,y+1],[x-9,y-8]],'#5a8a7f');}
function robot(c,x,y,scale=1,body='#dcdcc4',eye='#a0eccd'){
 c.save();c.translate(x,y);c.scale(scale,scale);ellipse(c,0,18,19,6,'#060f1744');rect(c,-11,0,22,19,'#79958b');rect(c,-15,-27,30,28,body);rect(c,-18,-20,4,14,'#8caaa2');rect(c,15,-20,4,14,'#8caaa2');rect(c,-11,-19,22,11,'#1b3541');rect(c,-7,-16,4,4,eye);rect(c,4,-16,4,4,eye);rect(c,-7,-29,3,-8,'#d3d9b9');rect(c,-9,-39,7,4,eye);rect(c,-7,4,14,7,body);rect(c,-10,17,7,5,'#cfddc5');rect(c,4,17,7,5,'#cfddc5');rect(c,-17,4,6,11,body);rect(c,11,4,6,11,body);c.restore();
}
function drawBoss(canvas,id,defeated=false){
 const c=canvas.getContext('2d');if(!c)return;
 canvas.width=96;canvas.height=96;c.clearRect(0,0,96,96);rect(c,0,0,96,96,'#172a33');
 const designs={secret:{color:'#baace6',map:['0001111000','0011111100','0010220100','0111111110','1113333111','1003333001','0003333000','0001001000']},monster:{color:'#e3b179',map:['0100000010','0111111110','1111111111','1102112011','1111111111','0113333110','0111111110','1101001011']},weakener:{color:'#92caba',map:['0000111000','0011111110','0112112110','0111111110','0001331000','0111111110','1101111011','0011001100']},editor:{color:'#d8989b',map:['0001111000','0011111100','0110220110','0111111110','1111331111','1001111001','0001111000','0011001100']},outage:{color:'#b9cbe9',map:['0001111000','0011111100','0111111110','1102002011','1111001111','0113333110','0011111100','0101001010']}};
 const d=designs[id]||designs.monster,colors={1:defeated?'#80af94':d.color,2:'#193040',3:defeated?'#c6eec5':'#754d56'};
 d.map.forEach((row,y)=>[...row].forEach((v,x)=>{if(v!=='0')rect(c,18+x*6,22+y*6,6,6,colors[v]);}));
 if(defeated){circle(c,78,17,11,'#accf95');label(c,'✓',78,18,'#25482e',14);}
}
class World{
 constructor(canvas,data,getState,onSelect){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.data=data;this.getState=getState;this.onSelect=onSelect;this.running=false;this.paused=false;this.last=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);
 canvas.addEventListener('click',e=>this.pick(e));canvas.addEventListener('mousemove',e=>this.hover(e));canvas.addEventListener('mouseleave',()=>{canvas.style.cursor='default';});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.start();});this.resize();this.start();}
 geometry(){const narrow=this.canvas.clientWidth<540;return {w:narrow?850:1100,h:690,center:narrow?[428,360]:[560,366],nodes:narrow?[[196,215],[423,173],[651,245],[658,481],[430,558],[190,482]]:[[284,230],[560,178],[824,260],[840,489],[554,557],[268,487]]};}
 resize(){if(!this.ctx)return;const r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(r.width<=0||r.height<=0)return;this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.dpr=dpr;this.render(0);}
 toLocal(e){const b=this.canvas.getBoundingClientRect(),g=this.geometry(),s=Math.min(b.width/g.w,b.height/g.h);return [(e.clientX-b.left-(b.width-g.w*s)/2)/s,(e.clientY-b.top-(b.height-g.h*s)/2)/s];}
 pick(e){const [x,y]=this.toLocal(e),g=this.geometry();let chosen=-1,dist=100;g.nodes.forEach(([px,py],i)=>{const d=Math.hypot(x-px,(y-(py-5))*.95);if(d<dist){dist=d;chosen=i;}});if(chosen>=0)this.onSelect(chosen);}
 hover(e){const [x,y]=this.toLocal(e);this.canvas.style.cursor=this.geometry().nodes.some(([px,py])=>Math.hypot(x-px,y-(py-5))<100)?'pointer':'default';}
 setPaused(value){this.paused=value;this.render(0);if(!value)this.start();}
 start(){if(this.running||!this.ctx)return;this.running=true;const frame=t=>{if(document.hidden){this.running=false;return;}const motion=this.getState().motion&&!this.reduced&&!this.paused;if(t-this.last>33||!motion){this.render(motion?t:0);this.last=t;}if(motion)requestAnimationFrame(frame);else this.running=false;};requestAnimationFrame(frame);}
 refresh(){this.render(0);this.start();}
 render(time){
  const c=this.ctx;if(!c)return;const state=this.getState(),stats=root.QuestCore.stats(state,this.data),g=this.geometry();const cw=this.canvas.width/this.dpr,ch=this.canvas.height/this.dpr,s=Math.min(cw/g.w,ch/g.h);
  c.setTransform(this.dpr,0,0,this.dpr,0,0);rect(c,0,0,cw,ch,'#101d28');c.translate((cw-g.w*s)/2,(ch-g.h*s)/2);c.scale(s,s);
  const grad=c.createRadialGradient(g.center[0],g.center[1],35,g.center[0],g.center[1],480);grad.addColorStop(0,'#203f40');grad.addColorStop(.6,'#152a33');grad.addColorStop(1,'#101d28');c.fillStyle=grad;c.fillRect(0,0,g.w,g.h);
  // Fine isometric navigation grid and a few deterministic particles.
  c.globalAlpha=.16;for(let i=-800;i<1500;i+=74){line(c,[[i,0],[i+1380,690]],'#446761',.6);line(c,[[i,0],[i-1380,690]],'#446761',.6);}c.globalAlpha=1;
  for(let i=0;i<48;i++){const x=(i*167+27)%g.w,y=(i*83+48)%640+20;const a=.15+((i%5)/15);c.globalAlpha=a;rect(c,x,y,2,2,'#add8c0');}c.globalAlpha=1;
  // Flow circuit beneath the islands.
  const centers=g.nodes;for(let i=0;i<6;i++){const a=centers[i],b=centers[(i+1)%6],unlocked=i<stats.completed;const route=[[a[0],a[1]+14],[(a[0]+b[0])/2,(a[1]+b[1])/2+20],[b[0],b[1]+14]];line(c,route,'#1d3d42',12);line(c,route,unlocked?'#91ceb2':'#426662',2,unlocked?[]:[5,9]);if(time&&i<=stats.completed){const t=(time/7000+i*.17)%1,x=a[0]+(b[0]-a[0])*t,y=a[1]+14+(b[1]-a[1])*t;circle(c,x,y,5,'#a8dabe44');rect(c,x-2,y-2,4,4,'#c3f6d8');}}
  // Floating debris / foliage establish depth.
  const rocks=[[g.center[0]-35,80],[g.w-95,382],[100,346],[g.center[0]+167,592],[130,561]];rocks.forEach(([x,y],i)=>{box(c,x,y,35+10*(i%3),17+5*(i%3),20,'#395751','#1f3236','#294444');if(i%2===0)crystal(c,x,y-12,'#99bb9c');});
  const center=g.center;
  ellipse(c,center[0],center[1]+99,120,27,'#08172070');
  box(c,center[0],center[1]+54,205,98,31,'#2b5452','#1b353b','#254249');
  box(c,center[0],center[1]+23,165,80,16,'#456c5e','#254546','#31504b');
  box(c,center[0],center[1]+7,100,48,65,'#8eaaa0','#3a625d','#5b8571');
  box(c,center[0],center[1]-58,106,52,10,'#c4d0b6','#65866b','#90a386');
  // Illuminated server heart and orbital arcs.
  for(let i=0;i<3;i++){rect(c,center[0]-32,center[1]-38+i*13,23,4,i<stats.completed/2?'#b5ebcb':'#90b7a0');line(c,[[center[0]+10,center[1]-33+i*13],[center[0]+33,center[1]-44+i*13]],'#264847',4);circle(c,center[0]+18,center[1]-38+i*13,1.8,'#b8e7c2');}
  c.save();c.translate(center[0],center[1]-72);c.strokeStyle='#739f83';c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,62,24,-.12,0,Math.PI*2);c.stroke();c.globalAlpha=.5;c.beginPath();c.ellipse(0,0,32,13,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;
  const angle=time?time/2200:1.4;circle(c,Math.cos(angle)*62,Math.sin(angle)*24,4,'#d6eac4');polygon(c,[[0,-34],[22,-23],[22,0],[0,11],[-22,0],[-22,-23]],'#a3d4b53b');polygon(c,[[0,-34],[22,-23],[0,-12],[-22,-23]],'#c4e8cd');polygon(c,[[-22,-23],[0,-12],[0,11],[-22,0]],'#6ca68f');polygon(c,[[0,-12],[22,-23],[22,0],[0,11]],'#94c8a6');c.restore();

  // Paint platforms in depth order, with full-size architectural silhouettes.
  centers.map((p,i)=>({p,i})).sort((a,b)=>a.p[1]-b.p[1]).forEach(({p,i})=>this.station(c,p,i,state,time));
  // Small courier, away from the center of interaction.
  const active=centers[Math.min(stats.completed,5)];const bob=time?Math.sin(time/650)*2:0;robot(c,active[0]-63,active[1]+5+bob,.62,'#dce4c8','#b9f7d4');

 }
 station(c,[x,y],index,state,time){
  const m=this.data.missions[index],open=root.QuestCore.canOpen(state,this.data,index),done=m.tasks.every(t=>state.done[t.id]),selected=state.selected===index;
  const color=open?m.color:'#708782';
  ellipse(c,x,y+56,102,24,'#09161a55');
  if(selected){c.save();c.strokeStyle='#acd6b080';c.lineWidth=1.4;c.setLineDash([3,8]);c.beginPath();c.ellipse(x,y+6,124,55,0,0,Math.PI*2);c.stroke();c.restore();}
  box(c,x,y+28,206,96,33,open?'#496854':'#354e48','#1b3335','#284340');
  box(c,x,y-5,210,98,7,open?'#70916d':'#47645a','#416149','#52765a');
  // Faceted paving tiles.
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){const tx=x+(col-row)*25,ty=y-19+(col+row-2)*12;box(c,tx,ty,47,23,1,open?'#809879':'#526d60','#425b4b','#637e63');}
  for(let i=0;i<5;i++)rect(c,x-51+i*12,y+19-i*5,5,4,open?'#8dac7c':'#52715e');
  if(done)line(c,[[x-68,y+28],[x,y+61],[x+67,y+28]],'#98d5a4',2.5);else if(open)line(c,[[x-68,y+28],[x,y+61]],'#a2c997',2);
  plant(c,x+73,y-6,.65);plant(c,x-82,y+7,.38);if(index%2===1)crystal(c,x+53,y+10,open?color:'#668b75');
  c.save();if(!open)c.globalAlpha=.76;
  switch(index){
   case 0:{
    box(c,x,y-21,86,43,42,'#baa987','#687b60','#8a946b');
    rect(c,x-30,y-98,60,37,'#d7ceb0');c.fillStyle='#d8cfae';c.beginPath();c.arc(x,y-98,30,Math.PI,Math.PI*2);c.fill();
    rect(c,x-5,y-124,10,45,'#789085');rect(c,x-32,y-73,64,7,'#9ba785');
    c.save();c.translate(x+20,y-104);c.rotate(-.48);rect(c,-3,-7,47,15,'#dde0c1');rect(c,31,-10,14,21,'#8caf9c');rect(c,43,-8,4,17,'#254d4c');c.restore();
    box(c,x-28,y-3,23,13,16,'#c7c7a0','#5e725b','#819776');rect(c,x+9,y-43,9,14,'#d4e3b0');break;
   }
   case 1:{
    box(c,x,y-16,77,40,60,'#8aa5a0','#51616b','#74777c');
    box(c,x,y-76,84,44,10,color,'#617182','#838a9b');
    for(let i=0;i<3;i++){box(c,x-9+i*6,y-78-i*12,74,37,5,i===2?'#cdd5ea':'#9cadd4','#66778a','#8194b0');}
    line(c,[[x+32,y-46],[x+32,y-78]],'#d2e3cd',2);circle(c,x+32,y-46,4,'#becbe8');break;
   }
   case 2:{
    box(c,x+8,y-10,87,44,42,'#c2a181','#686b55','#9a8965');
    box(c,x+8,y-52,94,47,8,'#d5b895','#8e8a67','#ad9d70');
    polygon(c,[[x-17,y-12],[x+11,y+2],[x+11,y-26],[x-17,y-39]],'#46544b');
    polygon(c,[[x-13,y-17],[x+6,y-7],[x+6,y-24],[x-13,y-33]],'#f2b878');
    box(c,x+42,y-39,15,9,59,'#b3bb9c','#536e67','#7e9079');
    box(c,x-49,y-10,22,12,91,'#c1b890','#797c5e','#a6a075');
    line(c,[[x-49,y-103],[x+2,y-127],[x+48,y-104]],'#d4ba8c',9);
    line(c,[[x+44,y-104],[x+44,y-68]],'#758f80',3);line(c,[[x+37,y-68],[x+44,y-64],[x+51,y-71]],'#cbd3aa',4);
    box(c,x-21,y+11,21,11,13,color,'#8c8067','#a99572');break;
   }
   case 3:{
    for(let i=0;i<3;i++){box(c,x+(i-1)*28,y-13+(i-1)*13,33,18,67,'#acbda6','#4f746b','#769888');for(let j=0;j<3;j++){line(c,[[x+(i-1)*28-12,y-61+(i-1)*13+j*14],[x+(i-1)*28-3,y-57+(i-1)*13+j*14]],'#b1dfbc',3);}}
    c.save();c.translate(x+26,y-104);c.strokeStyle='#b2e0c0';c.lineWidth=6;c.beginPath();c.arc(0,0,21,0,Math.PI*2);c.stroke();circle(c,0,0,16,'#51938066');line(c,[[15,15],[35,37]],'#bddfbc',8);line(c,[[-9,1],[-2,9],[12,-8]],'#dce8c5',4);c.restore();break;
   }
   case 4:{
    box(c,x,y-20,74,36,12,'#bdc3a4','#657961','#7b9270');
    polygon(c,[[x-24,y-46],[x-45,y-18],[x-37,y-70],[x-16,y-89]],'#c8917d');polygon(c,[[x+24,y-46],[x+45,y-18],[x+36,y-72],[x+16,y-89]],'#e5af92');
    rect(c,x-21,y-119,42,75,'#d9dac4');polygon(c,[[x-21,y-119],[x,y-154],[x+21,y-119]],'#e6e1c9');rect(c,x+5,y-119,16,74,'#adc2ae');
    circle(c,x,y-103,13,'#678e83');circle(c,x,y-103,8,'#a9ddd0');rect(c,x-23,y-52,46,10,'#a99b7d');
    if(open){polygon(c,[[x-13,y-41],[x,y-21],[x+13,y-41]],'#c6d9b8');polygon(c,[[x-5,y-39],[x,y-26],[x+5,y-39]],'#f2d78f');}break;
   }
   case 5:{
    box(c,x,y-17,78,38,47,'#9bb4a3','#4c6e66','#779083');box(c,x,y-64,85,41,8,'#c2d4bc','#6f9180','#a2bba4');
    box(c,x+10,y-74,18,12,45,'#c0ceb1','#6f8e7a','#96ab88');line(c,[[x+10,y-120],[x-4,y-130]],'#bacdac',5);
    c.save();c.translate(x-9,y-130);c.rotate(-.42);c.fillStyle='#d0dcc0';c.beginPath();c.arc(0,0,34,0,Math.PI);c.fill();line(c,[[-27,0],[26,0]],'#98b9a6',4);line(c,[[0,8],[0,-19]],'#a1c3b6',3);circle(c,0,-21,4,'#c4e5bc');c.restore();
    line(c,[[x-21,y-30],[x-13,y-34],[x-7,y-23],[x+1,y-37],[x+11,y-30]],'#bce7cb',2.5);break;
   }
  }
   c.restore();
   // Mission nameplates beneath each station: labels follow the active language
   // (QuestLang), with pt-BR names as the fallback, like the app modules.
   const QL=root.QuestLang,lang=QL?QL.get():'pt';
   const name=QL&&QL.field(m,'name',lang)?QL.field(m,'name',lang):m.name;
   const caption=key=>QL?String(QL.t(CAPTIONS,key,lang)):CAPTIONS.pt[key];
   const ly=y+77,txt=name.toUpperCase();const tagW=txt.length*7+40;
   c.fillStyle=selected?'#29483e':'#152c32';c.beginPath();c.roundRect(x-tagW/2,ly-12,tagW,25,6);c.fill();
   label(c,`${done?'✓':String(index+1).padStart(2,'0')} ${txt}`,x,ly,done?'#b1debb':(open?'#d3dfc3':'#89a398'),10);
   if(selected){label(c,done?caption('stationDone'):open?caption('stationNext'):caption('stationLocked'),x,ly+25,open?'#9dbf93':'#6e8c82',7);}
 }
}
root.QuestWorld=World;root.QuestBoss=drawBoss;
})(globalThis);
