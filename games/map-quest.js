import * as THREE from 'three';
import {MAP_CORES,MAP_RELAYS,MAP_WALLS,MAP_MEMORIES} from '../map-quest-state.js?art=40a';
import {part,finishMaterial,glazedBuilding,plantedTree,batchStatic} from '../mission-scenery.js?art=40a';
import {disk,arc,V} from '../chapter-art.js?art=40a';
import {label,star} from '../mission-stage.js?art=40a';

export function createMapQuest(stage,state,mission,api){
 const root=stage.content,dock=api.dock,cleanup=[],size=1.6,tiles=[],cores=[],bridges=[],pads=[],memories=[],held=new Set();
 const point=(x,z,y=.42)=>V((x-4)*size,y,(z-3)*size);
 stage.mapQuest=true;stage.arcade=true;stage.width=22;stage.height=14.4;stage.camera.position.set(1.5,19,19);stage.camera.lookAt(0,.4,0);stage.depthOfField={band:24,aperture:.4};stage.resize();
 const fixed=new THREE.Group();root.add(fixed);
 part(fixed,15.6,.5,12.2,'stone',0,-.1,0,.16);part(fixed,15.4,.06,12,'gold',0,.18);const lake=part(fixed,15.2,.08,11.8,'glass',0,.24);lake.material=finishMaterial('glass').clone();lake.material.color.set('#528c99');lake.material.roughness=.19;
 const dark=new THREE.MeshStandardMaterial({color:'#748e92',roughness:.7});
 const lit=finishMaterial('stone');
 for(let z=0;z<7;z++)for(let x=0;x<9;x++){
  if((x===3||x===6)&&!state.bridgeAt(x,z))continue;
  const p=point(x,z),bridge=state.bridgeAt(x,z);
  const tile=part(fixed,1.52,.14,1.52,'stone',p.x,.35,p.z,.055);tile.material=lit;
  tile.userData.keepSeparate=true;tile.userData.cell={x,z};tiles.push(tile);
  if(bridge){tile.material=new THREE.MeshStandardMaterial({color:'#47d1dc',emissive:'#39c4d3',emissiveIntensity:.6,roughness:.28,metalness:.25,transparent:true,opacity:.8});bridges.push({id:bridge.id,mesh:tile});for(const s of [-1,1]){part(fixed,1.55,.04,.04,'gold',p.x,.46,p.z+s*.68);}}
 }
 MAP_WALLS.forEach(([x,z],i)=>{const p=point(x,z);const b=glazedBuilding(fixed,p.x,p.z,1.14,1.2+(i%3)*.46,1.12);b.position.y=.42;});
 // Framing details stay off the navigable cells, leaving all routes legible.
 for(const s of [-1,1]){for(let i=0;i<4;i++){const x=-5.6+i*3.6;part(fixed,.03,.02,.42,'warm',x,.28,s*5.85);}plantedTree(fixed,s*7.15,5.25,.48,s<0);plantedTree(fixed,s*7.15,-5.3,.55,s>0);}
 label(fixed,'双星地图实验室',0,.3,6.02,3.4);
 for(const c of MAP_CORES){const p=point(c.x,c.z),g=new THREE.Group();g.position.copy(p);root.add(g);disk(g,.45,.12,'metal',0,.06);const ring=arc(g,.38,.025,'gold');ring.rotation.x=-Math.PI/2;ring.position.y=.14;const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.24,0),new THREE.MeshPhysicalMaterial({color:'#76d9e8',emissive:'#26a9bf',emissiveIntensity:.35,roughness:.18,metalness:.22,clearcoat:.6}));crystal.position.y=.65;g.add(crystal);const tag=label(g,c.name,0,1.25,0,1.5);cores.push({...c,g,crystal,tag});}
 for(const r of MAP_RELAYS){const p=point(r.x,r.z);const pad=disk(root,.51,.12,'metal',p.x,.5,p.z),ring=arc(root,.47,.025,'cyan');ring.rotation.x=-Math.PI/2;ring.position.copy(p).y=.58;label(root,r.id.toUpperCase(),p.x,.65,p.z, .7);pads.push({id:r.id,ring,pad});const lock=point(r.lock.x,r.lock.z);disk(fixed,.44,.08,'gold',lock.x,.48,lock.z);label(fixed,'锁定',lock.x,.6,lock.z, .75);}
 for(const [i,m] of MAP_MEMORIES.entries()){const s=star(root,.18,'#edc275');s.position.copy(point(m.x,m.z,.9));memories.push(s);}
 const exit=point(8,0);disk(fixed,.64,.12,'metal',exit.x,.5,exit.z);const portal=arc(root,.65,.04,'gold');portal.position.copy(exit).y=1.2;label(fixed,'上传台',exit.x,2.05,exit.z,1.4);
 const guardMeshes=state.guards.map(()=>{const g=new THREE.Group();root.add(g);const rim=arc(g,.53,.032,'gold');rim.rotation.x=-Math.PI/2;const m=new THREE.Mesh(new THREE.ConeGeometry(.52,1.3,20,1,true),new THREE.MeshBasicMaterial({color:'#e0a057',transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}));m.position.y=.65;g.add(m);const eye=new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),new THREE.MeshBasicMaterial({color:'#edbb6b'}));eye.position.y=1.3;g.add(eye);return g;});
 const scanRing=arc(root,1,.025,'cyan');scanRing.rotation.x=-Math.PI/2;scanRing.visible=false;
 const tether=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(),V()]),new THREE.LineBasicMaterial({color:'#56bac6',transparent:true,opacity:.65}));root.add(tether);tether.frustumCulled=false;
 const transfer=star(root,.17);transfer.visible=false;let transferTime=-10,transferStart=V();
 const bond=arc(root,.5,.025,'gold');bond.visible=false;
 const xing=stage.buddies.xingzai,xun=stage.buddies.xunbao;xing.group.scale.setScalar(.7);xun.group.scale.setScalar(.64);xing.group.position.copy(point(state.x,state.z));xun.group.position.copy(point(state.x+.52,state.z-.4,1.45));stage.pose('xingzai','Walk',0);stage.pose('xunbao','Walk',.25);
 // Layer a small, real arm greeting after the locomotion mixer, without altering the mesh.
 for(const [buddy,isStar] of [[xing,true],[xun,false]]){
  const names=isStar?['UpperArm.L','Forearm.L','Hand.L']:['Arm.L','Hand.L'];
  const bones=names.map(name=>{const b=buddy.model.getObjectByName(name);return b?{b,q:b.quaternion.clone()}:null;}).filter(Boolean);
  const mq=new THREE.Quaternion(),pq=new THREE.Quaternion(),dq=new THREE.Quaternion(),tq=new THREE.Quaternion(),from=V(),to=V();
  buddy.poseOverlay=()=>{const remaining=state.bondUntil-state.time;if(remaining<=0)return;const w=Math.sin(Math.min(1,remaining/1.4)*Math.PI),swing=Math.sin(state.time*9)*.18;
   bones.forEach(({b,q},i)=>{if(b.name==='Hand.L'){tq.setFromEuler(new THREE.Euler(0,0,swing)).premultiply(q);b.quaternion.slerp(tq,w);return;}
    buddy.model.updateWorldMatrix(true,true);buddy.model.getWorldQuaternion(mq);b.parent.getWorldQuaternion(pq).invert();to.set(...(i===0?[.95,.14,.24]:[.42,1,.12])).normalize().applyQuaternion(mq).applyQuaternion(pq);from.set(0,1,0).applyQuaternion(q);dq.setFromUnitVectors(from,to);tq.copy(dq).multiply(q);b.quaternion.slerp(tq,w);
   });
  };
 }
 const pointerRing=arc(root,.5,.025,'cyan');pointerRing.rotation.x=-Math.PI/2;pointerRing.position.copy(xing.group.position).y=.47;
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 const act=fn=>{if(!api.active())return;const ok=fn();if(!ok){api.message(state.message);api.feedback(state.message,false);}render();};
 dock.innerHTML=`<div class="chapter-eyebrow">DUAL COMPANION / 04</div><h3>让地图重新连接</h3><div class="map-core-status" aria-label="数据核心收集进度">${MAP_CORES.map((c,i)=>`<span data-core="${c.id}"><i>0${i+1}</i>${c.name.replace('核心','')}</span>`).join('')}</div><p id="map-objective"></p><div class="map-ip-status"><img src="./assets/characters/xingzai.webp?art=40a" alt="星仔"><span>星仔 · 地面行动<b id="map-position"></b></span><img src="./assets/characters/xunbao.webp?art=40a" alt="讯宝"><span>讯宝 · 空中支援<b id="map-drone-status"></b></span><button id="map-hint" aria-label="下一步提示">提示</button></div><div class="map-action-row"><button id="map-scan">讯宝扫描 <kbd>Q</kbd></button><button id="map-recall">召回讯宝 <kbd>R</kbd></button></div><div class="map-relays" aria-label="指挥讯宝驻留中继"><button data-relay="a">中继 A <small>连接第一座桥</small></button><button data-relay="b">中继 B <small>连接第二座桥</small></button></div><div class="map-controls"><div class="map-dpad" aria-label="移动星仔"><button data-dir="up" aria-label="星仔向前">↑</button><button data-dir="left" aria-label="星仔向左">←</button><button data-dir="down" aria-label="星仔向后">↓</button><button data-dir="right" aria-label="星仔向右">→</button></div><button id="map-interact">互动 <kbd>E</kbd></button></div><p id="map-status" role="status"></p><div class="map-stats"><span id="map-bonus"></span></div><p class="chapter-tip">方向键 / WASD 移动 · 点击道路寻路<br>橙色光束会送你回存档点，核心保留<br>金色小星星是可选的探索奖励</p>`;
 const dirs={up:[0,-1],left:[-1,0],down:[0,1],right:[1,0]};let last=-1;
 const move=(name)=>{state.clear();const [dx,dz]=dirs[name];return state.step(dx,dz);};
 dock.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>act(()=>move(b.dataset.dir)));
 dock.querySelector('#map-scan').onclick=()=>act(()=>state.scan());dock.querySelector('#map-recall').onclick=()=>act(()=>state.recall());dock.querySelector('#map-interact').onclick=()=>act(()=>state.interact());dock.querySelector('#map-hint').onclick=()=>{if(api.active()){api.message(state.hint());api.feedback(state.hint());}};
 dock.querySelectorAll('[data-relay]').forEach(b=>b.onclick=()=>act(()=>state.dispatch(b.dataset.relay)));
 const keys={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
 api.key=e=>{if(!api.active())return;if(keys[e.code]){e.preventDefault();if(!e.repeat){act(()=>move(keys[e.code]));state.moveReady=state.time+.22;}held.add(e.code);}else if(!e.repeat&&['KeyQ','KeyE','KeyR','Digit1','Digit2'].includes(e.code)){e.preventDefault();act(()=>e.code==='KeyQ'?state.scan():e.code==='KeyE'?state.interact():e.code==='KeyR'?state.recall():state.dispatch(e.code==='Digit1'?'a':'b'));}};
 const release=e=>held.delete(e.code),clear=()=>{held.clear();state.clear();};window.addEventListener('keyup',release);window.addEventListener('blur',clear);cleanup.push(()=>window.removeEventListener('keyup',release),()=>window.removeEventListener('blur',clear));
 const pick=e=>{if(!api.active())return;const rect=stage.canvas.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);ray.setFromCamera(mouse,stage.camera);const hit=ray.intersectObjects(tiles,false)[0];if(hit){const {x,z}=hit.object.userData.cell;act(()=>x===state.x&&z===state.z?state.interact():state.goTo(x,z));}};stage.canvas.addEventListener('click',pick);cleanup.push(()=>stage.canvas.removeEventListener('click',pick));
 function render(){last=state.revision;dock.querySelector('#map-position').textContent=`位置 ${state.x+1} · ${state.z+1}`;dock.querySelector('#map-drone-status').textContent=state.droneMode==='follow'?'跟随星仔':state.droneTravel>0?'正在飞往中继':'守住中继 '+state.relay.toUpperCase();dock.querySelector('#map-interact').innerHTML=state.context()+' <kbd>E</kbd>';dock.querySelector('#map-status').textContent=state.message;dock.querySelector('#map-objective').textContent=state.collected.length<3?'找回 '+state.collected.length+' / 3 核心 · 锁定 '+state.locked.length+' / 2 光桥':'核心已齐 · 与讯宝一起到右上角上传';dock.querySelector('#map-bonus').textContent='旅途星光 '+state.memories.length+'/3';dock.querySelectorAll('[data-core]').forEach(el=>{el.classList.toggle('collected',state.collected.includes(el.dataset.core));});dock.querySelectorAll('[data-relay]').forEach(b=>{const id=b.dataset.relay;b.disabled=state.done||state.locked.includes(id);b.setAttribute('aria-pressed',String(state.droneMode==='relay'&&state.relay===id));b.querySelector('small').textContent=state.locked.includes(id)?'光桥已锁定':state.droneMode==='relay'&&state.relay===id?'讯宝正在驻留':'派出讯宝接通光桥';});}
 batchStatic(fixed);render();
 return {input(){const name=keys[[...held].at(-1)];return name?{dx:dirs[name][0],dz:dirs[name][1]}:{};},clear,hint:()=>state.hint(),update(dt,t){
  if(last!==state.revision)render();dock.querySelector('#map-scan').disabled=state.done||state.time<state.scanReady||state.droneTravel>0;
  // Only gameplay time moves characters; pause and countdown keep the puzzle frozen.
  const target=point(state.x,state.z),delta=target.clone().sub(xing.group.position),moving=delta.length()>.025;
  xing.group.position.lerp(target,1-Math.exp(-dt*13));if(moving)xing.group.rotation.y=Math.atan2(delta.x,delta.z);stage.pose('xingzai','Walk',moving?1.6:0);
  const dp=state.drone,droneTarget=point(dp.x+(state.droneMode==='follow'?.55:0),dp.z-(state.droneMode==='follow'?.35:0),1.4+Math.sin(state.time*2.8)*.08);xun.group.position.lerp(droneTarget,1-Math.exp(-dt*6));xun.group.rotation.y=Math.atan2(xing.group.position.x-xun.group.position.x,xing.group.position.z-xun.group.position.z)*.3;
  pointerRing.position.copy(xing.group.position).y=.45;
  tiles.forEach(m=>{const {x,z}=m.userData.cell;if(!state.bridgeAt(x,z))m.material=state.revealed.has(x+','+z)?lit:dark;});
  bridges.forEach(({id,mesh})=>{const open=state.bridgeOpen(id);mesh.material.opacity=open?.88:.1;mesh.position.y=open?.35:.27;});pads.forEach(({id,ring})=>ring.material=finishMaterial(state.locked.includes(id)?'warm':state.bridgeOpen(id)?'cyan':'gold'));
  cores.forEach(c=>{c.g.visible=!state.collected.includes(c.id)&&state.scanned.has(c.x+','+c.z);c.crystal.rotation.y=state.time*.7;c.crystal.position.y=.65+Math.sin(state.time*2)*.08;});memories.forEach((m,i)=>{const p=MAP_MEMORIES[i];m.visible=!state.memories.includes(i)&&state.revealed.has(p.x+','+p.z);m.rotation.y=state.time;});
  state.guards.forEach((g,i)=>{guardMeshes[i].visible=state.revealed.has(g.x+','+g.z);guardMeshes[i].position.copy(point(g.x,g.z,.48));});
  scanRing.visible=state.time<state.scanUntil;if(scanRing.visible){scanRing.position.copy(xun.group.position).y=.48;scanRing.scale.setScalar(.2+(1-(state.scanUntil-state.time)/1.3)*4.7);}
  tether.visible=state.droneMode==='relay'&&state.droneTravel<=0;if(tether.visible){const r=MAP_RELAYS.find(r=>r.id===state.relay),p=point(r.bridge.x,r.bridge.z,.48),a=xun.group.position,arr=tether.geometry.attributes.position;arr.setXYZ(0,a.x,a.y,a.z);arr.setXYZ(1,p.x,p.y,p.z);arr.needsUpdate=true;}
  const events=state.events;for(const ev of events){api.message(ev.message);api.effect(ev.type==='rescue'?'hit':ev.type==='core'||ev.type==='memory'?'collect':'tick');if(ev.type==='core'){transferTime=state.time;transferStart.copy(xing.group.position).y+=1.1;}}
  if(state.time-transferTime<.8){const k=(state.time-transferTime)/.8;transfer.visible=true;transfer.position.lerpVectors(transferStart,xun.group.position,k);transfer.position.y+=Math.sin(k*Math.PI)*1.2;}else transfer.visible=false;
  bond.visible=state.time<state.bondUntil;if(bond.visible){bond.position.copy(xing.group.position).lerp(xun.group.position,.5).y=1.9;bond.rotation.y=state.time*2;xun.group.rotation.z=Math.sin((state.bondUntil-state.time)*8)*.13;}else xun.group.rotation.z=0;
  portal.rotation.z=state.time*.2;portal.material=finishMaterial(state.collected.length===3?'cyan':'gold');
 },dispose(){clear();api.key=null;delete xing.poseOverlay;delete xun.poseOverlay;cleanup.forEach(fn=>fn());}};
}
