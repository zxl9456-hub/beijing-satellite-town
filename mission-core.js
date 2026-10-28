import {ResearchState} from './research-state.js?art=39a';
import {ExhibitionState} from './exhibition-state.js?art=39a';
import {parts,guests} from './mission-data.js?art=39a';
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function seeded(seed=19){let a=seed>>>0;return()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};}
export class PuzzleState{
 constructor(level){this.level=level;this.time=0;this.found=[];this.placed=[];this.connections=0;this.scan=0;this.cooldown=0;this.seats={};this.done=false;this.message='';this.revision=0;}
 get count(){return this.level===2?this.placed.length:this.level===3?this.connections:this.level===7?Object.keys(this.seats).length:this.found.length;}
 get max(){return this.level===2||this.level===7?4:3;}
 tick(dt){if(this.done)return;this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);if(this.level===3&&!this.cooldown)this.scan=(this.scan+dt*.5)%(Math.PI*2);}
 get signalTarget(){return [3.8,4.6,5.2][this.connections]??0;}
 get signalOpen(){return this.level===3&&!this.cooldown&&Math.abs(Math.atan2(Math.sin(this.scan-this.signalTarget),Math.cos(this.scan-this.signalTarget)))<.33;}
 collect(id){const allowed=this.level===1?['navigation','communication','weather']:this.level===4?['park','river','road']:[];if(this.done||!allowed.includes(id)||this.found.includes(id))return false;this.found.push(id);this.revision++;this.done=this.found.length===3;return true;}
 place(part,slot){if(this.done||!parts.some(p=>p.id===part)||part!==slot||this.placed.includes(part))return false;this.placed.push(part);this.revision++;this.done=this.placed.length===4;return true;}
 connect(){if(this.done||this.level!==3||this.cooldown)return false;const hit=this.signalOpen;this.cooldown=hit?1.1:.35;if(hit){this.connections++;this.scan=0;this.revision++;this.done=this.connections===3;}return hit;}
 seat(id,index){if(this.done||!guests.some(g=>g.id===id)||!Number.isInteger(index)||index<0||index>3)return false;const occupied=Object.keys(this.seats).find(k=>this.seats[k]===index);const previous=this.seats[id];if(occupied&&occupied!==id){if(previous!==undefined)this.seats[occupied]=previous;else delete this.seats[occupied];}this.seats[id]=index;this.revision++;this.done=this.count===4&&this.friendsTogether&&this.guideNear;return true;}
 get friendsTogether(){const a=this.seats.lin,b=this.seats.zhou;return a!==undefined&&b!==undefined&&[1,3].includes(Math.abs(a-b));}
 get guideNear(){return [0,1].includes(this.seats.guide);}
}
export class FlightState{
 constructor(ship='tracker'){this.ship=ship;this.time=0;this.done=false;this.x=0;this.z=3;this.score=0;this.hits=0;this.slow=0;this.protect=0;this.shield=ship==='guard';this.shieldClock=0;this.entities=[];this.bullets=[];this.pickups=[];this.events=[];this.serial=0;this.spawnAt=.8;this.shotAt=0;this.cluster=false;this.random=seeded(85);}
 entity(x,z,type='trash',size=1){const e={id:++this.serial,x,z,type,size,hp:type==='ufo'?3:2,age:0,phase:this.random()*6.28};this.entities.push(e);return e;}
 fire(){const angles=this.ship==='rain'?[-.27,0,.27]:[0];for(const angle of angles)this.bullets.push({id:++this.serial,x:this.x,z:this.z-.8,vx:Math.sin(angle)*15,vz:-Math.cos(angle)*15,life:2.5,damage:this.ship==='cruise'?2:1});}
 tick(dt,input={}){
  if(this.done)return;dt=clamp(dt,0,.1);this.events=[];this.time=Math.min(75,this.time+dt);if(this.time>75-1e-9)this.time=75;this.slow=Math.max(0,this.slow-dt);this.protect=Math.max(0,this.protect-dt);
  if(this.ship==='guard'&&!this.shield){this.shieldClock+=dt;if(this.shieldClock>=15){this.shield=true;this.shieldClock=0;}}
  const speed=this.slow>0?3:7;
  if(input.target){this.x+=clamp(input.target.x-this.x,-speed*dt,speed*dt);this.z+=clamp(input.target.z-this.z,-speed*dt,speed*dt);}else{this.x+=clamp(input.x||0,-1,1)*speed*dt;this.z+=clamp(input.z||0,-1,1)*speed*dt;}
  this.x=clamp(this.x,-4.4,4.4);this.z=clamp(this.z,-1.5,5);
  this.shotAt-=dt;if(this.shotAt<=0){this.fire();this.shotAt=this.ship==='cruise'?.19:.25;}
  if(this.time<65&&this.time>=this.spawnAt){this.entity((this.random()-.5)*8,-23,this.time>18&&this.random()>.73?'ufo':'trash',.65+this.random()*.6);this.spawnAt+=this.time<10?1.5:.75;}
  if(this.time>=50&&!this.cluster){this.cluster=true;for(let i=0;i<9;i++)this.entity((i%3-1)*1.4,-24-Math.floor(i/3)*1.5,'trash',.9);}
  for(const e of this.entities){e.age+=dt;e.z+=dt*(e.type==='bubble'?6:4.8);if(e.type==='ufo'){e.x=clamp(e.x+Math.sin(e.age*2+e.phase)*dt*1.2,-4,4);if(Math.floor(e.age*1.5)!==Math.floor((e.age-dt)*1.5)&&this.time<60)this.entities.push({id:++this.serial,x:e.x,z:e.z+.5,type:'bubble',size:.35,hp:1,age:0,phase:0});}}
  for(const b of this.bullets){b.life-=dt;if(this.ship==='tracker'){let target=null,dist=100;for(const e of this.entities){const d=Math.hypot(e.x-b.x,e.z-b.z);if(e.hp>0&&e.z<b.z+1&&d<dist){target=e;dist=d;}}if(target){const d=Math.max(.01,dist);b.vx+=(target.x-b.x)/d*28*dt;b.vz+=(target.z-b.z)/d*20*dt;const length=Math.hypot(b.vx,b.vz);b.vx=b.vx/length*15;b.vz=b.vz/length*15;}}
   b.x+=b.vx*dt;b.z+=b.vz*dt;for(const e of this.entities)if(e.hp>0&&b.life>0&&Math.hypot(e.x-b.x,e.z-b.z)<e.size*.6+.25){e.hp-=b.damage;b.life=0;if(e.hp<=0){this.events.push({type:'burst',x:e.x,z:e.z});if(e.type!=='bubble')this.pickups.push({id:++this.serial,x:e.x,z:e.z,age:0});}break;}}
  for(const e of this.entities){if(e.hp>0&&Math.hypot(e.x-this.x,e.z-this.z)<e.size*.55+.5&&this.protect<=0){e.hp=0;this.hits++;this.protect=1.5;if(this.shield){this.shield=false;this.shieldClock=0;this.events.push({type:'shield',x:this.x,z:this.z});}else{this.slow=1;this.events.push({type:'hit',x:this.x,z:this.z});}}if(this.time>=65&&e.hp>0){e.hp=0;this.events.push({type:'burst',x:e.x,z:e.z});if(e.type!=='bubble')this.pickups.push({id:++this.serial,x:e.x,z:e.z,age:0});}}
  for(const p of this.pickups){p.age+=dt;const d=Math.hypot(p.x-this.x,p.z-this.z);if(d<3||this.time>=65){p.x+=(this.x-p.x)*Math.min(1,dt*5);p.z+=(this.z-p.z)*Math.min(1,dt*5);}else p.z+=dt*3.5;if(Math.hypot(p.x-this.x,p.z-this.z)<.55){p.collected=true;this.score++;this.events.push({type:'pickup',x:p.x,z:p.z});}}
  this.entities=this.entities.filter(e=>e.hp>0&&e.z<9);this.bullets=this.bullets.filter(b=>b.life>0&&b.z>-30&&Math.abs(b.x)<9);this.pickups=this.pickups.filter(p=>!p.collected&&p.age<12&&p.z<10);
  if(this.time>=75){this.score+=this.pickups.length;this.pickups=[];this.entities=[];this.bullets=[];this.done=true;}
 }
}
export class RunnerState{
 constructor(){this.time=0;this.distance=0;this.done=false;this.lane=1;this.x=0;this.y=0;this.vy=0;this.slide=0;this.jumpCooldown=0;this.slideCooldown=0;this.slow=0;this.protect=0;this.score=0;this.hits=0;this.events=[];this.obstacles=[];this.tokens=[];const r=seeded(62);for(let i=0;i<25;i++){const distance=48+i*11;const lane=i<2?1:Math.floor(r()*3);const type=i<2?'barrier':i%3===0?'arch':i%3===1?'planter':'barrier';this.obstacles.push({id:i,lane,distance,type,passed:false});this.tokens.push({id:i,lane:(lane+1)%3,distance:distance-4,collected:false});}}
 changeLane(delta){this.lane=clamp(this.lane+delta,0,2);}
 setLane(lane){this.lane=clamp(Math.round(lane),0,2);}
 jump(){if(this.done||this.y>.02||this.slide>0||this.jumpCooldown>0)return false;this.vy=4.8;this.jumpCooldown=.75;return true;}
 crouch(){if(this.done||this.y>.02||this.slideCooldown>0)return false;this.slide=.85;this.slideCooldown=1.2;return true;}
 tick(dt){if(this.done)return;dt=clamp(dt,0,.1);this.events=[];this.time+=dt;for(const k of ['slide','jumpCooldown','slideCooldown','slow','protect'])this[k]=Math.max(0,this[k]-dt);this.distance=Math.min(360,this.distance+dt*(this.slow>0?3:6));this.x+=(this.lane*2-2-this.x)*Math.min(1,dt*14);if(this.vy||this.y){this.y+=this.vy*dt;this.vy-=12*dt;if(this.y<=0){this.y=0;this.vy=0;}}
  for(const o of this.obstacles){if(!o.passed&&Math.abs(o.distance-this.distance)<.7){o.passed=true;const inLane=Math.abs(o.lane*2-2-this.x)<.8;const clear=o.type==='barrier'?this.y>.45:o.type==='arch'?this.slide>0:false;if(inLane&&!clear&&this.protect<=0){this.hits++;this.slow=1;this.protect=1.5;this.events.push({type:'hit',x:this.x,z:0});}}}
  for(const t of this.tokens)if(!t.collected&&Math.abs(t.distance-this.distance)<.9&&Math.abs(t.lane*2-2-this.x)<.85){t.collected=true;this.score++;this.events.push({type:'pickup',x:this.x,z:0});}
  this.done=this.distance>=360;
 }
}
export function createMissionState(n,ship){return n===1?new ExhibitionState():n===2?new ResearchState():n===5?new FlightState(ship):n===6?new RunnerState():new PuzzleState(n);}
