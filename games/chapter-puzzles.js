import * as THREE from 'three';
import {part,finishMaterial,pavement,flowerbed,plantedTree,glazedBuilding,batchStatic} from '../mission-scenery.js?art=34b';
import {V,disk,arc,line,screen,heroAsset} from '../chapter-art.js?art=34b';
import {radarConsole,globeMonument,celebrationStage,diningChair,guestModel} from '../chapter-props.js?art=34b';
import {label,satellite,star} from '../mission-stage.js?art=34b';
import {guests} from '../mission-data.js?art=34b';

export function createChapterPuzzle(stage,state,mission,api){
 const root=stage.content,dock=api.dock,updates=[],cleanup=[];let selected=null,dragToken=null,ignoreClickUntil=0;
 stage.height=14;stage.width=22;stage.camera.position.set(6,12,19);stage.camera.lookAt(0,1,0);stage.resize();
 for(const [key,x] of [['xingzai',-6.2],['xunbao',6.2]])stage.buddies[key].group.position.set(x,key==='xunbao'?.5:0,3.8);
 pavement(root,15,12,0,.4,.02);for(const s of [-1,1])part(root,.035,.015,11,'gold',s*7.2,.08,.4);
 const active=fn=>{if(api.active())fn();};
 const say=(text,good=true)=>{api.message(text);api.feedback(text,good);};
 const spot=(text,p,fn,options={})=>stage.hotspot(text,p,()=>active(fn),options);
 if(mission.n===3){
  const consoleGroup=new THREE.Group();root.add(consoleGroup);const fallback=radarConsole(consoleGroup);heroAsset(stage,'operations',consoleGroup,8.1,fallback);
  // Live radar remains a separate plane: the imported artwork never owns the hit window.
  const radar=new THREE.Group();radar.position.set(0,.82,.25);root.add(radar);
  const radarFace=disk(radar,2.75,.015,'glass');radarFace.material=finishMaterial('glass').clone();radarFace.material.color.set('#153744');radarFace.material.roughness=.3;
  for(let i=1;i<=4;i++){const m=arc(radar,i*.64,.012,'gold');m.rotation.x=-Math.PI/2;m.position.y=.02;}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;line(radar,[V(Math.sin(a)*.2,.022,Math.cos(a)*.2),V(Math.sin(a)*2.65,.022,Math.cos(a)*2.65)],'metal',.006);}
  const sweep=new THREE.Group();radar.add(sweep);line(sweep,[V(0,.04,0),V(0,.04,-2.7)],'cyan',.025);
  const fan=new THREE.Mesh(new THREE.CircleGeometry(2.7,48,0,.3),new THREE.MeshBasicMaterial({color:'#4ed2bf',opacity:.15,transparent:true,depthWrite:false,side:THREE.DoubleSide}));fan.rotation.x=-Math.PI/2;fan.rotation.z=Math.PI/2;fan.position.y=.03;fan.userData.aoExclude=true;sweep.add(fan);
  const target=new THREE.Group();radar.add(target);const tr=arc(target,.24,.025,'warm');tr.rotation.x=-Math.PI/2;disk(target,.07,.04,'warm');
  const sats=[];for(let i=0;i<3;i++){const pad=disk(root,.55,.18,'stone',(i-1)*2.1,.16,4.6);const rim=arc(root,.49,.014,'gold');rim.rotation.x=-Math.PI/2;rim.position.set(pad.position.x,.27,4.6);const s=satellite(root,['navigation','communication','weather'][i],.38);s.position.set(pad.position.x,.28,4.6);sats.push({s,rim});label(root,['导航链路','通信链路','观测链路'][i],pad.position.x,.35,5.35,1.45);}
  label(root,'星座测控 · 地面接收站',0,4.8,-3.8,4.5);
  dock.innerHTML='<div class="chapter-eyebrow">ORBITAL CONTROL / 03</div><h3>捕获来自太空的回声</h3><p>观察扫描光与金色信标的重合时刻，依次建立三条链路</p><div class="chapter-channels">'+['导航','通信','观测'].map((x,i)=>`<span data-channel="${i}"><i></i>${x}</span>`).join('')+'</div><div class="signal-readout"><small>当前链路</small><strong id="signal-channel">导航卫星</strong><span id="signal-status">等待扫描光进入金色区域</span></div><button class="signal-button" id="connect-signal">连接信号 <kbd>空格</kbd></button><p class="chapter-tip">讯宝会提示接收窗口，错过后等待下一圈即可</p><div id="signal-messages" aria-live="polite"></div>';
  const button=dock.querySelector('#connect-signal');const connect=()=>active(()=>{if(state.connect()){say(['讯宝：导航测试完成，位置数据已回传','讯宝：通信链路接通，听见你的问候了','星仔：三条链路全部接通，地面站点亮了'][state.connections-1]);}else say('扫描光还没到达信标，再等一下',false);});button.onclick=connect;api.key=e=>{if(e.code==='Space'){e.preventDefault();connect();}};
  updates.push((dt,t)=>{sweep.rotation.y=-state.scan;target.position.set(Math.sin(state.signalTarget)*2.35,.06,-Math.cos(state.signalTarget)*2.35);target.scale.setScalar(1+Math.sin(t*4)*.08);button.classList.toggle('open',state.signalOpen);button.disabled=state.cooldown>0;button.innerHTML=state.signalOpen?'✦ 现在连接 <kbd>空格</kbd>':'连接信号 <kbd>空格</kbd>';dock.querySelector('#signal-status').textContent=state.signalOpen?'信号重合 · 接收窗口已打开':state.cooldown?'正在接收数据…':'等待扫描光进入金色区域';dock.querySelector('#signal-channel').textContent=['导航卫星','通信卫星','观测卫星','全部链路已建立'][state.connections];sats.forEach(({s,rim},i)=>{s.rotation.y=t*.13;s.position.y=.3+Math.sin(t*1.2+i)*.035;rim.material=finishMaterial(i<state.connections?'cyan':'gold');dock.querySelector(`[data-channel="${i}"]`).classList.toggle('connected',i<state.connections);});});
 }else if(mission.n===4){
  stage.camera.position.set(0,18,17);stage.camera.lookAt(0,1,0);stage.width=24;stage.height=14;stage.depthOfField={band:16,aperture:1.7};stage.resize();
  const monument=new THREE.Group();monument.position.set(0,0,-5.1);monument.scale.setScalar(.9);root.add(monument);heroAsset(stage,'data',monument,3.5,globeMonument(monument));
  const maps=[],foundMarkers=[];
  for(const side of [-1,1]){const g=new THREE.Group();g.position.set(side*3.6,.15,.9);root.add(g);maps.push(g);
   part(g,6.7,.55,5.6,'stone',0,.275);part(g,6.55,.07,5.45,'gold',0,.58);part(g,6.4,.12,5.3,'grass',0,.67);part(g,6.6,.035,.035,'warm',0,.41,2.81);
   for(const s of [-1,1]){part(g,.1,.16,5.3,'metal',s*3.24,.77);part(g,6.5,.16,.1,'metal',0,.77,s*2.65);}
   for(let i=0;i<5;i++){glazedBuilding(g,-2.5+i*1.05,1.7,.65,.45+(i%3)*.22,.62).position.y=.73;}
   for(let j=0;j<3;j++){glazedBuilding(g,-2.4+j*.72,-.15,.5,.5+j*.15,.55).position.y=.73;part(g,.6,.025,.7,'stone',-2.4+j*.72,.75,-.15);}
   for(let j=0;j<9;j++){const x=-2.7+j*.65;part(g,.14,.045,.065,j%3===0?'gold':'metal',x,.795,.6);}
   for(const x of [-1.1,2.5])part(g,.28,.015,4.7,'glass',x,.747,0);part(g,5.9,.018,.3,'glass',0,.75,.6);
   for(let i=0;i<16;i++)part(g,.16,.01,.018,'metal',-2.9+i*.37,.765,.6);
   const park=part(g,2.25,.04,1.3,side===1?'grass':'stone',1.35,.76,-1.5);
   if(side===-1){park.material=new THREE.MeshStandardMaterial({color:'#bbab8d',roughness:1});for(let j=0;j<3;j++)part(g,.5,.12,.36,'stone',.65+j*.7,.83,-1.4);}
   if(side===1){part(g,2.1,.015,.075,'stone',1.35,.79,-1.5);part(g,.08,.015,1.2,'stone',1.4,.79,-1.5);}
   if(side===1)for(let j=0;j<7;j++)plantedTree(g,.55+j*.27,-1.5+(j%2)*.35,.19,j%3===0).position.y=.8;
   const riverPts=[V(-2.9,.77,-1.6),V(-2,.77,-1.2),V(-.7,.77,-.8),V(.8,.77,-.5),V(2.9,.77,-.7)];
   const river=line(g,riverPts,'glass',side===1?.16:.07);river.scale.y=.08;river.position.y=.72;river.material=finishMaterial('glass').clone();river.material.color.set(side===1?'#5cabb7':'#72989a');
   for(const s of [-1,1])line(g,riverPts.map(p=>p.clone().add(V(0,.005,s*(side===1?.18:.09)))),'stone',.018);
   if(side===1){const rd=part(g,3.4,.025,.28,'stone',.85,.79,.3);rd.rotation.y=-.23;for(let j=0;j<9;j++){const p=part(g,.15,.01,.018,'gold',-.5+j*.33,.81,-.01+j*.077);}}
   for(let j=0;j<4;j++)plantedTree(g,-2.55+j*.4,-2.2,.17,j%2===0).position.y=.78;
   label(g,side<0?'01 / 建设前':'02 / 焕新后',0,.6,3.18,2.9);
  }
  const changes=[{id:'park',title:'植被覆盖',point:V(4.95,1.15,-.6),text:'绿地增加：植被覆盖是遥感观察城市生态的重要线索'},{id:'river',title:'地表水域',point:V(2.6,1.05,.05),text:'河道变宽：水域面积与岸线变化可以从不同时刻的影像中识别'},{id:'road',title:'交通建设',point:V(4.5,1.05,1.7),text:'新增道路：连接关系的变化反映了城市交通建设'}];
  changes.forEach((c,i)=>{const m=arc(root,.35,.02,'cyan');m.position.copy(c.point).add(V(0,-.2,0));m.rotation.x=-Math.PI/2;m.visible=false;foundMarkers.push(m);const a=spot('观察 '+String(i+1).padStart(2,'0'),c.point,()=>{if(state.collect(c.id)){a.el.classList.add('done');a.el.textContent='✓ '+c.title;a.el.disabled=true;m.visible=true;dock.querySelector(`[data-observation="${c.id}"]`).classList.add('connected');say('讯宝：'+c.text);}}, {className:'observation',label:'观察右侧沙盘第'+(i+1)+'处变化'});a.el.dataset.marker=String(i+1);});
  dock.innerHTML='<div class="chapter-eyebrow">EARTH OBSERVATORY / 04</div><h3>让变化被看见</h3><p>对照两座地貌沙盘，找出焕新后出现的三类变化</p><div class="observation-log">'+changes.map((c,i)=>`<div data-observation="${c.id}"><span>0${i+1}</span><strong>${c.title}</strong><i>待观察</i></div>`).join('')+'</div><p class="chapter-tip">星仔：先看形状，再看范围，最后比较连接关系</p><small class="map-disclaimer">游戏地貌示意，非园区实测影像</small>';
  updates.push((dt,t)=>{changes.forEach(c=>{if(state.found.includes(c.id))dock.querySelector(`[data-observation="${c.id}"] i`).textContent='已记录';});foundMarkers.forEach(m=>m.scale.setScalar(1+Math.sin(t*2)*.04));});
 }else{
  const stageRoot=new THREE.Group();stageRoot.position.set(0,0,-4.3);root.add(stageRoot);heroAsset(stage,'exchange',stageRoot,9,celebrationStage(stageRoot));
  for(let i=-1;i<=1;i++){const s=star(root,.38);s.position.set(i*1.35,3.4+Math.cos(i)*.35,-4);updates.push((dt,t)=>s.rotation.y=Math.sin(t*.5+i)*.16);}
  label(root,'卫星小镇 · 星光之约',0,1.7,-3.8,3.8);
  const cloth=new THREE.MeshPhysicalMaterial({color:'#f4ead7',roughness:.85,sheen:.5});const table=disk(root,2,.12,'stone',0,1.05,.65);table.material=cloth;disk(root,.85,.15,'gold',0,.1,.65);disk(root,.17,.9,'metal',0,.57,.65);
  const vase=disk(root,.16,.25,'gold',0,1.23,.65);for(let i=0;i<7;i++){line(root,[V(0,1.3,.65),V(Math.sin(i)*.28,1.6+Math.cos(i)*.07,.65+Math.cos(i)*.26)],'gold',.012);const f=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),finishMaterial('stone'));f.position.set(Math.sin(i)*.28,1.6+Math.cos(i)*.07,.65+Math.cos(i)*.26);root.add(f);}
  const seats=[V(-1.9,0,-.7),V(1.9,0,-.7),V(1.9,0,2.1),V(-1.9,0,2.1)],anchors=[];
  seats.forEach((p,i)=>{const angle=Math.atan2(-p.x,.65-p.z);diningChair(root,p.x,p.z,angle);const m=disk(root,.29,.026,'metal',p.x*.62,1.13,.65+(p.z-.65)*.62);disk(root,.22,.018,'stone',m.position.x,1.15,m.position.z);const glass=disk(root,.075,.22,'glass',m.position.x+.32,1.23,m.position.z);const a=spot('座位 '+(i+1),p.clone().add(V(0,1.65,0)),()=>seat(selected,i),{label:'座位'+(i+1)+(i<2?'，靠展示台':'')});anchors.push(a);});
  const people=new Map();guests.forEach((g,i)=>{const model=guestModel(root,g.color);model.position.set((i-1.5)*1.2,0,4.8);people.set(g.id,{model,home:model.position.clone()});});
  dock.innerHTML='<div class="chapter-eyebrow">GARDEN CELEBRATION / 07</div><h3>为每个心愿留个座位</h3><p>邀请四位来宾入座，让朋友相邻，让讲解员靠近展示台</p><div class="control-grid">'+guests.map(g=>`<button data-guest="${g.id}"><b>${g.title}</b><small>${g.note}</small></button>`).join('')+'</div><div class="wishes"><span id="friends-wish">♡ 小林与小周相邻</span><span id="guide-wish">♡ 讲解员靠展示台</span></div><p class="chapter-tip">点选来宾后选择座位，也可以拖动来宾卡片到座位；重复安排会交换座位</p>';
  function seat(id,index){if(!id){say('先选择一位来宾，再为他安排座位',false);return;}state.seat(id,index);selected=null;dock.querySelectorAll('[data-guest]').forEach(b=>b.classList.remove('selected'));say(state.done?'星仔：每个心愿都实现了，一起迎接庆典吧':'来宾已入座，还可以交换座位调整');}
  dock.querySelectorAll('[data-guest]').forEach(b=>{b.onclick=()=>active(()=>{if(performance.now()<ignoreClickUntil)return;selected=b.dataset.guest;dock.querySelectorAll('[data-guest]').forEach(x=>x.classList.toggle('selected',x===b));api.message('为'+b.querySelector('b').textContent+'选择一个座位');});let down=null;const end=e=>{if(dragToken){const r=stage.canvas.getBoundingClientRect();let nearest=null,distance=80;anchors.forEach((a,i)=>{const p=stage.project(a.point),d=Math.hypot((p.x*.5+.5)*r.width+r.left-e.clientX,(-p.y*.5+.5)*r.height+r.top-e.clientY);if(d<distance){nearest=i;distance=d;}});if(nearest!==null)active(()=>seat(b.dataset.guest,nearest));dragToken.remove();dragToken=null;ignoreClickUntil=performance.now()+180;}down=null;};b.onpointerdown=e=>{if(!api.active())return;down={x:e.clientX,y:e.clientY};b.setPointerCapture(e.pointerId);};b.onpointermove=e=>{if(!down)return;if(!dragToken&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>8){dragToken=document.createElement('div');dragToken.id='drag-token';dragToken.textContent=b.querySelector('b').textContent;document.body.append(dragToken);}if(dragToken){dragToken.style.left=e.clientX+12+'px';dragToken.style.top=e.clientY+12+'px';}};b.onpointerup=end;b.onpointercancel=()=>{dragToken?.remove();dragToken=null;down=null;};b.style.touchAction='none';});
  updates.push((dt,t)=>{for(const g of guests){const o=people.get(g.id),i=state.seats[g.id],to=i===undefined?o.home:seats[i].clone().add(V(0,.35,0));o.model.position.lerp(to,1-Math.exp(-dt*7));o.model.rotation.y=i===undefined?0:Math.atan2(-to.x,.65-to.z);o.model.userData.legs.forEach(l=>{l.rotation.x=i===undefined?0:-1.05;});}for(const [id,met,text] of [['friends',state.friendsTogether,'小林与小周相邻'],['guide',state.guideNear,'讲解员靠展示台']]){const el=dock.querySelector('#'+id+'-wish');el.classList.toggle('met',met);el.textContent=(met?'♥ ':'♡ ')+text;}});
 }
 return {update(dt,t){updates.forEach(fn=>fn(dt,t));},dispose(){dragToken?.remove();cleanup.forEach(f=>f());}};
}
