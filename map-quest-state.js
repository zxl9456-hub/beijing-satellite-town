// Discrete navigation and co-operation rules; the renderer never decides a win.
export const MAP_SIZE={cols:9,rows:7};
export const MAP_WALLS=[[1,1],[1,2],[1,3],[4,1],[5,3],[7,4],[8,1]];
export const MAP_CORES=[{id:'terrain',name:'地形核心',x:2,z:1},{id:'routes',name:'路网核心',x:5,z:5},{id:'position',name:'定位核心',x:8,z:3}];
export const MAP_RELAYS=[{id:'a',name:'中继 A',x:2,z:4,bridge:{x:3,z:4},lock:{x:4,z:4},requires:'terrain'},{id:'b',name:'中继 B',x:5,z:2,bridge:{x:6,z:2},lock:{x:7,z:2},requires:'routes'}];
export const MAP_MEMORIES=[{x:0,z:0},{x:4,z:0},{x:8,z:6}];
const key=(x,z)=>x+','+z;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
export class MapQuestState{
 constructor({difficulty='explore'}={}){
  this.difficulty=difficulty==='challenge'?'challenge':'explore';this.hard=this.difficulty==='challenge';this.time=0;this.done=false;this.phase='navigate';this.revision=0;this.mistakes=0;this.moves=0;this.collected=[];this.memories=[];this.locked=[];this.revealed=new Set();this.scanned=new Set();this.events=[];this.x=0;this.z=5;this.checkpoint={x:0,z:5};this.droneMode='follow';this.relay=null;this.droneTravel=0;this.scanUntil=0;this.scanReady=0;this.protectUntil=0;this.moveReady=0;this.path=[];this.bondUntil=0;this.charges={xingzai:Infinity,xunbao:Infinity};this.message='星仔：先请讯宝扫描街区，找到第一枚地形核心';this.reveal(this,2);
 }
 get max(){return 6;}
 get count(){return this.collected.length+this.locked.length+Number(this.done);}
 get score(){return Math.max(10,70+this.memories.length*10-this.mistakes*3);}
 get drone(){return this.droneMode==='relay'?MAP_RELAYS.find(r=>r.id===this.relay):this;}
 get guards(){const step=Math.floor(this.time/(this.hard?1.35:2.2));const loops=[[[4,5],[4,6],[5,6],[4,6]],[[7,0],[7,1]]];return loops.slice(0,this.hard?2:1).map((p,i)=>{const [x,z]=p[(step+i)%p.length],[nx,nz]=p[(step+i+1)%p.length];return {x,z,nx,nz};});}
 inBounds(x,z){return Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&x<9&&z>=0&&z<7;}
 isWall(x,z){return MAP_WALLS.some(p=>p[0]===x&&p[1]===z);}
 bridgeAt(x,z){return MAP_RELAYS.find(r=>r.bridge.x===x&&r.bridge.z===z);}
 bridgeOpen(id){return this.locked.includes(id)||(this.droneMode==='relay'&&this.relay===id&&this.droneTravel<=0);}
 passable(x,z){if(!this.inBounds(x,z)||this.isWall(x,z))return false;if(x===3||x===6){const r=this.bridgeAt(x,z);return !!r&&this.bridgeOpen(r.id);}return true;}
 reveal(p,r,scan=false){for(let z=0;z<7;z++)for(let x=0;x<9;x++)if(Math.max(Math.abs(p.x-x),Math.abs(p.z-z))<=r){this.revealed.add(key(x,z));if(scan)this.scanned.add(key(x,z));}}
 notify(message,type='notice'){this.message=message;this.revision++;this.events.push({type,message});return true;}
 reject(message){this.message=message;this.revision++;return false;}
 scan(){if(this.done)return false;if(this.time<this.scanReady)return this.reject('讯宝：扫描波正在充能，稍等一下');if(this.droneTravel>0)return this.reject('讯宝：正在飞往中继点，到达后再扫描');this.reveal(this.drone,this.hard?2:3,true);this.scanUntil=this.time+1.3;this.scanReady=this.time+2.4;return this.notify('讯宝：扫描完成，蓝色数据核心与道路已标记','scan');}
 dispatch(id){if(this.done)return false;const r=MAP_RELAYS.find(r=>r.id===id);if(!r)return false;if(this.bridgeAt(this.x,this.z)&&!this.locked.includes(this.bridgeAt(this.x,this.z).id))return this.reject('讯宝：你还在光桥上，我会守住中继，先走到对岸');if(!this.scanned.has(key(r.x,r.z)))return this.reject('讯宝：中继还未扫描，先靠近它再扫描');if(!this.collected.includes(r.requires))return this.reject('讯宝：先找到'+MAP_CORES.find(c=>c.id===r.requires).name+'，才能解码这座中继');if(this.locked.includes(id))return this.reject('这座桥已经锁定，讯宝可以去下一站');if(this.droneMode==='relay'&&this.relay===id)return this.reject('讯宝正在这座中继工作');this.droneMode='relay';this.relay=id;this.droneTravel=.7;this.path=[];return this.notify('讯宝：飞往'+r.name+'，我来接通光桥','dispatch');}
 recall(){if(this.done)return false;const r=this.bridgeAt(this.x,this.z);if(r&&!this.locked.includes(r.id))return this.reject('讯宝：你还在桥上，先走到对岸再叫我');if(this.droneMode==='follow')return this.reject('讯宝：我就在你身边');this.droneMode='follow';this.relay=null;this.droneTravel=0;this.path=[];return this.notify('讯宝：收到，回到星仔身边','recall');}
 step(dx,dz){if(this.done||Math.abs(dx)+Math.abs(dz)!==1||!Number.isInteger(dx)||!Number.isInteger(dz))return false;const x=this.x+dx,z=this.z+dz;if(!this.passable(x,z))return this.reject(this.bridgeAt(x,z)?'光桥尚未接通，请讯宝驻留对应中继':'星仔：这边走不通，换条路试试');this.x=x;this.z=z;this.moves++;this.reveal(this,1);this.revision++;this.checkGuard();if(MAP_CORES.some(c=>c.x===this.x&&c.z===this.z&&!this.collected.includes(c.id)))this.message='星仔：这里有一个核心，扫描后按互动键取出';if(MAP_RELAYS.some(r=>r.lock.x===this.x&&r.lock.z===this.z&&!this.locked.includes(r.id)))this.message='星仔：到锁定台了，按互动键把光桥固定下来';return true;}
 goTo(x,z){if(this.done||!this.inBounds(x,z))return false;if(!this.revealed.has(key(x,z)))return this.reject('先向这片街区前进，或让讯宝扫描未知道路');if(!this.passable(x,z))return this.reject(this.bridgeAt(x,z)?'请先派讯宝接通这座光桥':'这里不能通行');const queue=[{x:this.x,z:this.z,path:[]}],seen=new Set([key(this.x,this.z)]);for(let i=0;i<queue.length;i++){const p=queue[i];if(p.x===x&&p.z===z){this.path=p.path;return true;}for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=p.x+dx,nz=p.z+dz,k=key(nx,nz);if(!seen.has(k)&&this.revealed.has(k)&&this.passable(nx,nz)){seen.add(k);queue.push({x:nx,z:nz,path:[...p.path,{x:nx,z:nz}]});}}}return this.reject('当前道路尚未连通，先检查中继与未扫描街区');}
 interact(){if(this.done)return false;const c=MAP_CORES.find(c=>c.x===this.x&&c.z===this.z&&!this.collected.includes(c.id));if(c){if(!this.scanned.has(key(c.x,c.z)))return this.reject('星仔：找到一个未知装置，请讯宝扫描后再取出核心');this.collected.push(c.id);this.checkpoint={x:this.x,z:this.z};this.protectUntil=this.time+1.8;return this.notify('星仔：拿到'+c.name+'！讯宝，把它存进我们的地图','core');}
  const relay=MAP_RELAYS.find(r=>r.lock.x===this.x&&r.lock.z===this.z&&!this.locked.includes(r.id));if(relay){if(!this.bridgeOpen(relay.id))return this.reject('先让讯宝接通对应光桥');this.locked.push(relay.id);this.checkpoint={x:this.x,z:this.z};this.protectUntil=this.time+2;return this.notify('星仔：光桥已经锁定，讯宝可以离开中继了','lock');}
  const memory=MAP_MEMORIES.findIndex(p=>p.x===this.x&&p.z===this.z);if(memory>=0&&!this.memories.includes(memory)){this.memories.push(memory);this.bondUntil=this.time+1.5;return this.notify('讯宝：收下一枚旅途星光，我们的探险手册又多了一页','memory');}
  if(this.x===8&&this.z===0){if(this.collected.length<3||this.locked.length<2)return this.reject('需要收齐三枚核心，并锁定两座桥，才能上传完整地图');if(this.droneMode!=='follow')return this.reject('星仔：叫讯宝回来，我们一起上传地图');this.done=true;this.phase='complete';this.path=[];return this.notify('双星协作完成！三份数据已合成庆典导航地图','complete');}
  if(this.droneMode==='follow'){this.bondUntil=this.time+1.4;return this.notify('星仔：搭档，准备出发！　讯宝：收到，下一站我陪你','bond');}return this.reject('星仔：讯宝正在维持光桥，先去对岸的金色锁定台');
 }
 context(){if(MAP_CORES.some(c=>c.x===this.x&&c.z===this.z&&!this.collected.includes(c.id)))return '拾取数据核心';if(MAP_RELAYS.some(r=>r.lock.x===this.x&&r.lock.z===this.z&&!this.locked.includes(r.id)))return '锁定光桥';if(this.x===8&&this.z===0)return '双星上传地图';if(MAP_MEMORIES.some((p,i)=>p.x===this.x&&p.z===this.z&&!this.memories.includes(i)))return '收集旅途星光';return this.droneMode==='follow'?'和讯宝打招呼':'查看搭档状态';}
 checkGuard(){if(this.done||this.time<this.protectUntil||!this.guards.some(g=>g.x===this.x&&g.z===this.z))return;this.mistakes++;this.x=this.checkpoint.x;this.z=this.checkpoint.z;this.path=[];this.protectUntil=this.time+3;this.notify('讯宝：我接住你了！回到最近存档点，已收集的核心都在','rescue');}
 tick(dt,input={}){if(this.done)return;dt=Math.max(0,Math.min(.1,dt));this.time+=dt;if(this.droneTravel>0){this.droneTravel=Math.max(0,this.droneTravel-dt);if(this.droneTravel===0)this.notify('讯宝：光桥已接通！到对岸金色平台按互动键锁定','bridge');}if(this.time>=this.moveReady){if(input.dx||input.dz){this.path=[];this.step(input.dx||0,input.dz||0);this.moveReady=this.time+.22;}else if(this.path.length){const p=this.path.shift();if(!this.step(p.x-this.x,p.z-this.z))this.path=[];this.moveReady=this.time+.22;}}this.checkGuard();}
 clear(){this.path=[];}
 assist(who){return who==='xingzai'?this.interact():this.scan();}
 hint(){const core=MAP_CORES.find(c=>!this.collected.includes(c.id));if(!core)return '带讯宝一起到右上角上传台，按互动键完成地图';const index=MAP_CORES.indexOf(core);if(index>0&&!this.locked.includes(MAP_RELAYS[index-1].id)){const r=MAP_RELAYS[index-1];return this.x>r.bridge.x?'站到桥对岸的金色锁定台，按 E，然后召回讯宝':'先扫描'+r.name+'并派讯宝驻留，再沿青色光桥过河';}return '讯宝跟随时按 Q 扫描。'+['地形核心在左侧街区的后方','路网核心在中间街区的前方，避开橙色巡逻光束','定位核心在右侧街区，收齐后到右上角上传'][index];}
 outcome(){return {artifact:'双星导航地图',edition:'map-quest',cores:this.collected.length,bridges:this.locked.length,memories:this.memories.length,rescues:this.mistakes};}
}
