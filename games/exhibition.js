import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createExhibit,createOrrery} from '../exhibition-environment.js?art=38a';
import {createHatch,createArchiveDrawer,createCalibrationConsole,createStarChart,inscription} from '../exhibition-machinery.js?art=38a';
import {exhibitNames,exhibitTypes} from '../exhibition-state.js?art=38a';
const clues={
 navigation:{title:'稳定的节拍',hardware:'顶部的环形天线周围，排列着精密计时模块。地面接收器比较信号抵达的时间，推算自己的位置。',note:'用时间与轨道信息帮助地面确定坐标。'},
 communication:{title:'遥远的回声',hardware:'展开的抛物面天线指向远方，中央馈源与通信载荷相连。它接收信号，再转发到另一处。',note:'在相隔遥远的地面站之间建立通信链路。'},
 weather:{title:'看见云的眼睛',hardware:'前部装有观测镜头，旁边排列着散热片。它持续获取大气和云层的图像。',note:'观测云层与大气，帮助人们分析天气。'}
};
const positions=[new THREE.Vector3(-5,.72,-1.6),new THREE.Vector3(5,.72,-1.6),new THREE.Vector3(3.9,.72,4)],letters=['A','B','C'];
const phaseNames={brief:'寻找检修记录',inspect:'检查展品与模块',chart:'解读星图墙',assemble:'组合三枚模块',align:'校准刻度环',sequence:'恢复返航链路',launch:'启动轨道仪',complete:'逐星信号已恢复'};
const journalText='轨道仪的三枚校准模块已存入展品背面的检修舱。先确认展品用途，再翻到背面，记下模块的符号与刻度。插槽顺序记录在星图墙上。';
const chartText='从左至右：先观察沿途云层，再确定当前位置，最后建立远程链路。每枚模块的背面数字表示它的校准刻度；北位为 0，顺时针每格 45°。';
const routeText='出发前先确定自己的位置，然后判断沿途云雨，最后把安全航线传回地面。';
const btn=(action,text,cls='exhibit-primary',disabled=false)=>`<button class="${cls}" data-action="${action}" ${disabled?'disabled':''}>${text}</button>`;
const paper=(title,text)=>`<div class="clue-paper"><span>${title}</span>${text}</div>`;
export function createExhibitionPuzzle(stage,state,mission,api){
 const root=stage.content,dock=api.dock,anchors=[],models=[],cleanup=[];let panel='overview',selected=0,selectedChip=null,notebook=false,cameraMove=null,lastRevision=-1,lastCooldown=-1,lastRear=false,down=null,drawerOpen=false,disposed=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const controls=new OrbitControls(stage.camera,stage.canvas);controls.target.set(0,2,0);controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.minDistance=4;controls.maxDistance=45;controls.minPolarAngle=.25;controls.maxPolarAngle=1.37;controls.minAzimuthAngle=-1;controls.maxAzimuthAngle=1.15;controls.rotateSpeed=.55;controls.zoomSpeed=.65;controls.update();
 const home={position:stage.camera.position.clone(),target:controls.target.clone()},orrery=createOrrery(root),drawer=createArchiveDrawer(root),consoleModel=createCalibrationConsole(root),starChart=createStarChart(root);
 // The manifest is local and only names a Rodin file after it has actually been downloaded.
 fetch('./assets/exhibition/rodin-manifest.json?art=24c').then(r=>r.ok?r.json():null).then(m=>m?.files?.length&&!disposed?consoleModel.loadRodin(m):null).then(()=>{stage.needsRender=true;}).catch(e=>console.warn('Rodin cabinet unavailable',e));
 stage.buddies.xingzai.group.position.set(-3.4,.04,5.6);stage.buddies.xingzai.group.rotation.y=.3;stage.buddies.xunbao.group.position.set(.6,.5,5.3);
 function focus(point,wide=false){cameraMove={from:stage.camera.position.clone(),fromTarget:controls.target.clone(),to:wide?home.position.clone():point.clone().add(new THREE.Vector3(panel==='exhibit'?1.8:3.5,panel==='exhibit'?2:3.1,6.1)),target:wide?home.target.clone():point.clone(),t:reduced?1:0};}
 function say(text,good=true){api.message(text);api.feedback(text,good);}
 function mark(text,p,fn,label){const a=stage.hotspot(text,p,()=>{if(api.active())fn();},{className:'exhibit-beacon',label:label||text});anchors.push(a);return a;}
 positions.forEach((p,i)=>{const group=new THREE.Group();group.position.copy(p);root.add(group);const object=createExhibit(group,state.layout[i]),hatch=createHatch(object,state.symbols[state.layout[i]],state.codes[state.layout[i]]);object.rotation.y=.25;models.push({group,object,hatch,spin:0});
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.3),inscription('展柜 '+letters[i],512,128));plate.position.set(0,.15,1.17);group.add(plate);mark(letters[i],p.clone().add(new THREE.Vector3(0,2.9,0)),()=>inspect(i),'检查展柜 '+letters[i]);});
 mark('检修档案',new THREE.Vector3(-5,1.9,4.2),()=>open('archive',new THREE.Vector3(-5,1,4.2)));
 mark('校准台',new THREE.Vector3(6.7,2.9,3.35),()=>open('console',new THREE.Vector3(6.7,1.3,3.35)));
 mark('轨道仪',new THREE.Vector3(0,5.1,-1),()=>open('orrery',new THREE.Vector3(0,2.9,-1)));
 mark('星图墙',new THREE.Vector3(0,5,-5.7),()=>open('chart',new THREE.Vector3(0,3.8,-5.9)));
 const latchAnchor=mark('打开检修盖',positions[0],()=>hatchAction(),'打开当前卫星检修盖');
 const beams=positions.map(p=>{const curve=new THREE.CatmullRomCurve3([p.clone().setY(.14),new THREE.Vector3(p.x*.6,.15,p.z*.6),new THREE.Vector3(0,.16,-1)]),m=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.035,6,false),new THREE.MeshStandardMaterial({color:'#b9f4f0',emissive:'#24d5e5',emissiveIntensity:3,transparent:true,opacity:.8}));m.userData.aoExclude=true;m.visible=false;root.add(m);return m;});
 function open(name,point){panel=name;notebook=false;focus(point);render();}
 function inspect(i){selected=i;state.inspect(i);open('exhibit',positions[i].clone().add(new THREE.Vector3(0,1.3,0)));api.effect('click');}
 function overview(){panel='overview';notebook=false;focus(home.target,true);render();}
 function isRear(i=selected){return Math.cos(models[i].spin)<-.55;}
 function turn(delta){models[selected].spin+=delta;api.effect('click');}
 function hatchAction(){if(!isRear()||!state.journal)return;if(state.openHatch(selected)){say('星仔：检修盖打开了！这枚模块的符号和刻度要一起记住。');render();}}
 function notebookHTML(){return '<div class="evidence-grid">'+exhibitTypes.map(id=>{const known=state.identified.includes(id),chip=state.chips.includes(id);return `<article class="evidence-card ${known?'':'unread'}"><span class="note-symbol">${chip?state.symbols[id]:'?'}</span><strong>${known?exhibitNames[id]:'尚待辨识'}</strong><p>${known?clues[id].note:'检查展品结构，确认用途'}</p><small>${chip?'背面刻度 '+state.codes[id]+' · '+state.codes[id]*45+'°':'检修模块未取出'}</small></article>`;}).join('')+'</div>'+(state.journal?paper('检修记录',journalText):'')+(state.chart?paper('星图墙 · 安装顺序与刻度',chartText):'')+(state.signal?paper('返航任务 · 新的工作顺序',routeText):'');}
 function archivePanel(){return '<div class="exhibit-kicker">01 / 档案柜</div><h3>失联前的检修记录</h3><p>星仔发现中央抽屉留着一道缝，里面压着一张维护单。</p>'+(!drawerOpen?btn('drawer','拉开档案抽屉'):paper('抽屉中的记录',journalText)+(state.journal?'<div class="exhibit-lock success">✓ 维护单已加入线索板</div>'+btn('next-pending','检查尚未完成的展品'):btn('journal','阅读并收好维护单')));}
 function exhibitPanel(){const id=state.layout[selected],known=state.identified.includes(id),rear=state.rearSeen.includes(id),openH=state.hatches.includes(id),chip=state.chips.includes(id);return `<div class="exhibit-kicker">展柜 ${letters[selected]} / 可旋转检查</div><h3>${known?exhibitNames[id]:clues[id].title}</h3><p>${clues[id].hardware}</p>`+(!state.journal?paper('星仔的提醒','档案柜里可能保存着检修方法，先去看看。')+btn('archive','前往档案柜'):!known?'<div class="exhibit-answers">'+exhibitTypes.map(type=>`<button data-answer="${type}" ${state.cooldown?'disabled':''}>${exhibitNames[type]}</button>`).join('')+'</div>':'<div class="exhibit-lock success">✓ 用途已确认</div>')+'<div class="inspect-rotation"><button data-turn="-1" aria-label="向左转动展品">↶ 左转</button>'+btn('rear','查看背面','')+'<button data-turn="1" aria-label="向右转动展品">右转 ↷</button></div><p class="exhibit-micro">在模型上左右拖动，也能直接转动展品</p>'+(rear?paper('背面铭牌',`模块符号 <b>${state.symbols[id]}</b> · 校准刻度 <b>${state.codes[id]}</b><br>${chip?'符号、刻度和模块已收入线索板。':'符号和刻度已记录，模块还需要从检修舱取出。'}`):'<div class="exhibit-lock">转到背面寻找铭牌与检修盖</div>')+(state.journal&&rear&&!openH?btn('hatch','打开检修盖','exhibit-primary',!isRear()):openH&&!chip?btn('collect','取出校准模块'):chip?'<div class="exhibit-lock success">✓ 模块已放入工具包</div>':'')+(state.phase==='sequence'?btn('pulse','发送返航脉冲','exhibit-primary',!!state.cooldown):'')+btn('next-pending','查看下一件展品','exhibit-text')+(state.identified.length===3&&state.chips.length===3?btn(state.chart?'console':'chart',state.chart?'前往校准台':'解读星图墙'):'');}
 function chartPanel(){return '<div class="exhibit-kicker">02 / 星图墙</div><h3>三条能力，一条链路</h3>'+paper('星图上的任务说明',chartText)+'<div class="chart-diagram"><span>☁<small>云层</small></span><i>→</i><span>⌖<small>坐标</small></span><i>→</i><span>◉<small>链路</small></span></div><p>把星图描述的能力与三件展品对应起来，再用模块符号确定插槽。</p>'+(!state.journal?btn('archive','先查阅检修记录'):!state.chart?btn('chart-read','记录星图线索'):btn('console','前往校准台'));}
 function consolePanel(){const can=state.identified.length===3&&state.chips.length===3&&state.chart;return '<div class="exhibit-kicker">03 / 星图校准台</div><h3>'+(!state.slots.every(Boolean)?'把能力装回轨道仪':'对准三枚刻度环')+'</h3>'+(!can?'<div class="exhibit-lock">需要三件展品的用途、三枚模块，以及星图墙的安装说明。</div>'+btn(state.chips.length<3?'next-pending':'chart',state.chips.length<3?'继续检查展品':'查看星图墙'):
 '<p>先选工具包中的模块，再点击插槽。已装入的模块会亮起。</p><div class="module-inventory">'+state.chips.map(id=>`<button data-chip="${id}" aria-pressed="${selectedChip===id}" ${state.slots.includes(id)?'disabled':''}><b>${state.symbols[id]}</b><small>${state.slots.includes(id)?'已安装':exhibitNames[id]}</small></button>`).join('')+'</div><div class="module-slots">'+state.slots.map((id,i)=>`<button data-socket="${i}" ${id||state.cooldown?'disabled':''} aria-label="安装到第${i+1}个插槽"><b>${id?state.symbols[id]:'＋'}</b><small>插槽 ${i+1}</small></button>`).join('')+'</div>'+btn('notebook','对照线索板','exhibit-text')+(state.slots.every(Boolean)?state.signal?'<div class="exhibit-lock success">✓ 校准完成 · 返航星图已展开</div>'+btn('orrery','阅读返航任务'):'<p>刻度从北位 0 开始，顺时针每格 45°。将每个环的光标转到对应模块的铭牌刻度。</p><div class="frequency-dials">'+state.dials.map((d,i)=>`<div><button data-dial="${i}" data-step="1" aria-label="第${i+1}环顺时针转一格" ${state.cooldown?'disabled':''}>↻</button><output>${d}<small>${d*45}°</small></output><button data-dial="${i}" data-step="-1" aria-label="第${i+1}环逆时针转一格" ${state.cooldown?'disabled':''}>↺</button></div>`).join('')+'</div>'+btn('verify','检查刻度并接通信号','exhibit-primary',!!state.cooldown):''));}
 function orreryPanel(){return '<div class="exhibit-kicker">04 / 轨道仪</div><h3>修复失联的逐星信号</h3>'+(state.signal?paper('新的返航任务',routeText)+'<p>这次按实际工作流程，回到展柜依次发送脉冲。</p><div class="route-progress">'+[0,1,2].map(i=>`<span class="${i<state.sequence.length?'lit':''}">${i<state.sequence.length?'✓':i+1}</span>`).join('<i>—</i>')+'</div>'+btn(state.phase==='launch'?'launch':'overview',state.phase==='launch'?'✦ 启动轨道仪':'回到展柜发送脉冲'):'<div class="exhibit-lock">轨道仪失去校准信号，三条线路暂未连接。</div>'+btn('archive','从检修档案开始调查'));}
 function overviewPanel(){const p=state.phase;return '<div class="exhibit-kicker">EXHIBITION / 失联的逐星信号</div><h3>'+phaseNames[p]+'</h3><p>'+({brief:'中央轨道仪停止运转。和星仔一起查看档案柜，找出上一次检修留下的线索。',inspect:'观察三件展品的结构，确认用途，再翻到背面寻找铭牌，打开检修盖取出模块。',chart:'三枚模块已找齐。星图墙记录着插槽顺序与校准方法。',assemble:'将模块符号与展品用途、星图任务相互对应，装入三个正确的插槽。',align:'模块已装好。按背面铭牌的刻度，转动三个校准环。',sequence:'供电恢复了！阅读中央轨道仪上的返航任务，再安排三件展品协作。',launch:'三束信号已经汇合，亲手启动轨道仪，完成这次检修。',complete:'三种卫星能力组成了一条回家的路。'}[p])+'</p><div class="exhibit-chapters">'+[['检修记录',Number(state.journal),1],['用途辨识',state.identified.length,3],['检修模块',state.chips.length,3],['星图线索',Number(state.chart),1],['模块安装',state.slots.filter(Boolean).length,3],['刻度校准',Number(state.signal),1],['返航链路',state.sequence.length,3]].map(([t,n,max])=>`<span class="${n===max?'complete':''}">${t}<b>${n}/${max}</b></span>`).join('')+'</div>'+({brief:btn('archive','查看档案柜'),inspect:btn('next-pending','检查尚未完成的展品'),chart:btn('chart','查看星图墙'),assemble:btn('console','前往校准台'),align:btn('console','转动刻度环'),sequence:btn('orrery','阅读返航任务'),launch:btn('launch','✦ 启动轨道仪'),complete:''}[p])+'<p class="exhibit-micro">全景拖动旋转 · 滚轮缩放<br>检查展品时，拖动会转动模型本身</p>';}
 function render(){const activeEl=dock.contains(document.activeElement)?document.activeElement:null,key=activeEl?.dataset.focusKey,scroll=dock.parentElement.scrollTop;
  dock.innerHTML='<div class="exhibit-toolbar">'+btn('overview','↖ 全景','')+'<button data-action="notebook" aria-expanded="'+notebook+'">线索板 <b>'+state.chips.length+'/3</b></button></div><div class="exhibit-selector">'+letters.map((l,i)=>`<button data-slot="${i}" class="${panel==='exhibit'&&selected===i?'selected':''}" aria-label="检查展柜 ${l}">${l} <span>${state.chips.includes(state.layout[i])&&state.identified.includes(state.layout[i])?'✓':'展柜'}</span></button>`).join('')+'</div>'+(notebook?'<div class="exhibit-kicker">FIELD NOTES / 交叉比对</div><h3>星仔与讯宝的线索板</h3>'+notebookHTML()+btn('notebook','返回当前机关','exhibit-text'):panel==='archive'?archivePanel():panel==='exhibit'?exhibitPanel():panel==='chart'?chartPanel():panel==='console'?consolePanel():panel==='orrery'?orreryPanel():overviewPanel())+'<div class="exhibit-score">探索评价 <strong>'+state.score+'</strong><span>失误 '+state.mistakes+' · 提示 '+state.hints+'</span></div>';
  dock.querySelectorAll('button').forEach(b=>b.dataset.focusKey=JSON.stringify({...b.dataset}));if(key){[...dock.querySelectorAll('button')].find(b=>b.dataset.focusKey===key&&!b.disabled)?.focus({preventScroll:true});dock.parentElement.scrollTop=scroll;}
  anchors.forEach((a,i)=>{a.el.hidden=i===7?true:panel!=='overview'||notebook;if(i<3)a.el.classList.toggle('done',state.chips.includes(state.layout[i])&&state.identified.includes(state.layout[i]));});
  controls.enableRotate=panel!=='exhibit';lastRevision=state.revision;
 }
 function nextPending(){const i=state.layout.findIndex(id=>!state.chips.includes(id)||!state.identified.includes(id));inspect(i<0?(selected+1)%3:i);}
 function install(i){if(!selectedChip){say('讯宝：先从工具包选择一枚模块，再点插槽。',false);return;}const ok=state.install(selectedChip,i);say(ok?'星仔：接口扣合了！'+(state.phase==='align'?'接下来按铭牌刻度转动三个环。':'继续对照星图安装另外两枚。'):'讯宝：这个插槽的任务与模块用途不相符。对照星图墙和展品说明再试。',ok);if(ok)selectedChip=null;render();}
 dock.onclick=e=>{const b=e.target.closest('button');if(!b||!api.active()||b.disabled)return;
  if(b.dataset.slot!==undefined){inspect(+b.dataset.slot);return;}
  if(b.dataset.turn){turn(+b.dataset.turn*Math.PI/4);return;}
  if(b.dataset.answer){const ok=state.identify(selected,b.dataset.answer);say(ok?'讯宝：用途确认！再看看背面的检修舱。':'星仔：观察关键结构，再想想它承担的任务。',ok);render();return;}
  if(b.dataset.chip){selectedChip=b.dataset.chip;api.effect('click');render();return;}
  if(b.dataset.socket!==undefined){install(+b.dataset.socket);return;}
  if(b.dataset.dial!==undefined){if(state.turnDial(+b.dataset.dial,+b.dataset.step)){api.effect('tick');render();}return;}
  switch(b.dataset.action){
   case 'overview':overview();break;case 'notebook':notebook=!notebook;render();break;
   case 'archive':open('archive',new THREE.Vector3(-5,1,4.2));break;
   case 'drawer':drawerOpen=true;api.effect('click');render();break;
   case 'journal':if(state.readJournal())say('星仔：模块就在展品背面，我们先观察它们的用途。');render();break;
   case 'next-pending':nextPending();break;
   case 'rear':models[selected].spin=Math.PI;break;
   case 'hatch':hatchAction();break;
   case 'collect':if(state.collectChip(selected))say('讯宝：模块已收好，符号与刻度也记入线索板了。');render();break;
   case 'chart':open('chart',new THREE.Vector3(0,3.8,-5.9));break;
   case 'chart-read':state.readChart();say('讯宝：星图已记录，可以随时打开线索板对照。');render();break;
   case 'console':open('console',new THREE.Vector3(6.7,1.3,3.35));break;
   case 'verify':{const ok=state.verifySignal();say(ok?'讯宝：校准完成！地面线路恢复，轨道仪展开了返航任务。':'讯宝：还有光标没有对齐。模块上的数字对应顺时针刻度，北位是 0。',ok);render();break;}
   case 'orrery':open('orrery',new THREE.Vector3(0,2.9,-1));break;
   case 'pulse':{const ok=state.activate(state.layout[selected]);say(ok?'讯宝：第 '+state.sequence.length+' 束信号已抵达。'+(state.phase==='launch'?'可以启动轨道仪了！':'继续完成下一项任务。'):'讯宝：返航顺序不匹配，链路已复位。模块和校准进度仍然保留。',ok);overview();break;}
   case 'launch':if(state.launch()){overview();say('星仔：定位、观测、通信协同完成！逐星信号回来了！');}break;
  }
 };
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function hit(e){const r=stage.canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,stage.camera);return ray.intersectObjects([...models.map(m=>m.group),...consoleModel.sockets],true)[0]?.object;}
 function pick(e){let p=hit(e);while(p){const i=models.findIndex(m=>m.group===p);if(i>=0)return{slot:i};if(p.userData.socket!==undefined)return{socket:p.userData.socket};p=p.parent;}return null;}
 const start=e=>{if(!api.active()||e.button!==0)return;down={x:e.clientX,y:e.clientY,lastX:e.clientX,moved:false};cameraMove=null;if(panel==='exhibit')stage.canvas.setPointerCapture(e.pointerId);};
 const move=e=>{if(!api.active())return;if(down&&panel==='exhibit'){const delta=e.clientX-down.lastX;models[selected].spin+=delta*.014;down.lastX=e.clientX;down.moved||=Math.hypot(e.clientX-down.x,e.clientY-down.y)>5;}else if(!e.buttons)stage.canvas.style.cursor=pick(e)?'pointer':'grab';};
 const end=e=>{if(down&&!down.moved&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5&&api.active()){const p=pick(e);if(p?.slot!==undefined&&panel!=='exhibit')inspect(p.slot);else if(p?.socket!==undefined&&panel==='console')install(p.socket);}down=null;};
 for(const [event,fn] of [['pointerdown',start],['pointermove',move],['pointerup',end],['pointercancel',()=>{down=null;}]]){stage.canvas.addEventListener(event,fn);cleanup.push(()=>stage.canvas.removeEventListener(event,fn));}
 render();
 const hints={brief:['档案柜的中央抽屉没有完全合上。','打开档案柜，再拉开抽屉。','拉开抽屉后，点击“阅读并收好维护单”。'],inspect:['用途、背面铭牌和检修舱，三个细节都要检查。','环形天线与计时模块用于导航；抛物面天线用于通信；观测镜头用于气象。','确认用途后点“查看背面”，打开检修盖，再取出模块。'],chart:['模块的安装顺序藏在展厅后方。','星图墙上的三个任务，对应三种卫星用途。','打开星图墙，记录云层、坐标、链路的顺序。'],assemble:['插槽从左至右对应星图上的三项任务。','云层需要观测，坐标需要定位，远程链路需要通信。','依次装入气象、导航、通信模块；先选模块，再点插槽。'],align:['模块铭牌上的数字还没有用到。','北位是 0，顺时针每转一格增加 45°。','按左到右的模块用途，在手册找到它们的刻度，逐一转到相同数字。'],sequence:['返航任务与刚才的安装顺序不同。','先定位出发位置，再观测天气，最后发送指令。','依次在导航、气象、通信展柜发送脉冲。'],launch:['所有线路都已经恢复。','回到中央轨道仪。','点击“启动轨道仪”完成检修。'],complete:['逐星信号已恢复。']};
 return {closeInspection(){if(panel==='overview'&&!notebook)return false;overview();return true;},hint(explicit=false){const level=explicit?state.hint():1;if(explicit)render();return (state.phase==='inspect'?'星仔：':'讯宝：')+hints[state.phase][Math.min(level-1,hints[state.phase].length-1)];},
 update(dt,time){controls.enabled=api.active();if(cameraMove){cameraMove.t=Math.min(1,cameraMove.t+(reduced?1:dt*1.5));const t=cameraMove.t*cameraMove.t*(3-2*cameraMove.t);stage.camera.position.lerpVectors(cameraMove.from,cameraMove.to,t);controls.target.lerpVectors(cameraMove.fromTarget,cameraMove.target,t);if(cameraMove.t===1)cameraMove=null;}controls.update();stage.focusTarget.copy(controls.target);orrery.update(dt,state.done);drawer.update(dt,drawerOpen);consoleModel.update(dt,state);models.forEach((m,i)=>{const id=state.layout[i];m.object.rotation.y=THREE.MathUtils.damp(m.object.rotation.y,.25+m.spin,9,dt);m.hatch.update(dt,state.hatches.includes(id),state.chips.includes(id));beams[i].visible=state.sequence.includes(id);if(panel==='exhibit'&&i===selected&&Math.cos(m.object.rotation.y-.25)<-.55)state.inspectRear(i);});
  const showLatch=panel==='exhibit'&&!notebook&&state.journal&&isRear()&&!state.hatches.includes(state.layout[selected]);latchAnchor.el.hidden=!showLatch;if(showLatch){models[selected].object.updateWorldMatrix(true,false);latchAnchor.point.copy(models[selected].object.localToWorld(new THREE.Vector3(0,1.3,-.6)));}
  starChart.visible=state.journal;const cd=Math.ceil(state.cooldown),rear=isRear();if(lastRevision!==state.revision||cd!==lastCooldown||(panel==='exhibit'&&rear!==lastRear)){lastCooldown=cd;lastRear=rear;render();}},
 dispose(){disposed=true;controls.dispose();consoleModel.dispose();cleanup.forEach(fn=>fn());dock.onclick=null;stage.canvas.style.cursor='';}
 };
}
