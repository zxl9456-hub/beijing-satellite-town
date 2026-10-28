import {pixelRatioFor,RenderBudget} from './render-budget.js?art=39a';
import {architectureCard,mountArchitectureGallery} from './architecture-gallery.js?art=39a';
import {townAudio} from './town-audio.js?art=39a';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCompanionStudio,prepareCompanionMaterials} from './companion-look.js?art=39a';
import {createHomeCompanions} from './home-companions.js?art=39a';
import {regions,exploreURL} from './regions.js?art=39a';
const $=s=>document.querySelector(s),hero=$('.hero'),stage=$('#companions-stage'),canvas=$('#companions-canvas');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches;try{if(!reduced.matches)paused=localStorage.getItem('town-home-motion')==='paused';}catch{}
$('#home-regions').innerHTML=regions.map((r,i)=>`<article class="region-card" data-kind="${i<4?'district':'center'}">${architectureCard(r.id,String(i+1).padStart(2,'0')+' / '+(i<4?'DISTRICT':'CENTER'))}<div class="region-card-body"><small>${r.english}</small><h3>${r.title}</h3><p>${r.tagline}</p><a class="region-enter" href="${exploreURL(r)}">探索建筑与区域故事 <b>↗</b></a></div></article>`).join('');
mountArchitectureGallery($('#home-regions'));
$('#home-regions').dataset.filter='all';
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{$('#home-regions').dataset.filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});document.querySelectorAll('.region-card').forEach(card=>card.hidden=b.dataset.filter!=='all'&&card.dataset.kind!==b.dataset.filter);}));
const budget=new RenderBudget();
let renderer,scene,camera,sky,last=performance.now(),disposed=false,inView=true,needsRender=true,elapsed=0,previousW=0,previousH=0,contextLost=false;
const buddies=new Map(),loaded=new Map(),pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();let cursorX=0,cursorY=0,pointerActive=false,pointerClientX=0,pointerClientY=0,activeMessage=null,selectedBuddy='xingzai',interactions;
function updateMotionButton(){const b=$('#home-motion');b.textContent=paused?'▷':'Ⅱ';b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',paused?'播放首页动态':'暂停首页动态');stage.dataset.motion=paused?'paused':'playing';if(stage.dataset.interaction&&stage.dataset.interaction!=='idle')$('#interaction-caption').textContent=paused?'已暂停 · 点击播放继续动作':'伙伴正在回应你';else $('#interaction-caption').textContent=paused?'动态已暂停 · 播放后跟随鼠标':'移动鼠标，和我们对视 · 点击互动';}
updateMotionButton();
$('#home-motion').addEventListener('click',()=>{paused=!paused;if(paused)resetPointerLook();updateMotionButton();needsRender=true;try{localStorage.setItem('town-home-motion',paused?'paused':'playing');}catch{}});
reduced.addEventListener('change',()=>{paused=reduced.matches;if(paused)resetPointerLook();updateMotionButton();needsRender=true;});
const actionCopy={
 wave:{xingzai:['星仔向你挥挥手','你好呀，今天一起发现新风景'],xunbao:['讯宝收到你的招呼','伙伴已连接，探索随时出发']},
 heart:{xingzai:['星仔送来一颗心','把这份小小的喜欢，送给好奇的你'],xunbao:['讯宝发送爱心信号','叮，你的快乐能量已补满']},
 duet:{xingzai:['双星合拍 · 默契满分','一二三，一起为今天的探索加油'],xunbao:['双星合拍 · 默契满分','一二三，一起为今天的探索加油']}
};
function finishInteraction(){stage.dataset.interaction='idle';document.querySelectorAll('[data-companion-action]').forEach(b=>b.setAttribute('aria-pressed','false'));$('#interaction-caption').textContent='移动鼠标，和我们对视 · 点击互动';}
function interact(mode='wave',key=selectedBuddy,scroll=false){
 selectedBuddy=key;townAudio.effect('greet');
 if(scroll){hero.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});$('#buddy-'+key).focus({preventScroll:true});}
 const lines=actionCopy[mode][key];$('#guide-bubble p').replaceChildren();
 lines.forEach((line,i)=>{const el=document.createElement(i?'b':'span');el.textContent=line;$('#guide-bubble p').append(el);if(!i)$('#guide-bubble p').append(document.createElement('br'));});
 activeMessage=key;document.querySelectorAll('[data-buddy]').forEach(b=>{const selected=b.dataset.buddy===key;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
 $('#interaction-target').textContent=mode==='duet'?'星仔 × 讯宝':(key==='xingzai'?'星仔':'讯宝')+'陪你玩';
 $('#interaction-caption').textContent=stage.dataset.models!=='ready'?'伙伴已收到你的心意':paused?'静态回应 · 播放动态可看完整动作':mode==='wave'?'挥挥手，认识新伙伴':mode==='heart'?'一颗小小的心，送给你':'双星合拍，快乐加倍';
 document.querySelectorAll('[data-companion-action]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.companionAction===mode)));
 stage.dataset.interaction=mode;interactions?.play(mode,key,paused);needsRender=true;
}
const greeting=(key,scroll=false)=>interact('wave',key,scroll);
document.querySelectorAll('[data-buddy]').forEach(b=>b.addEventListener('click',()=>greeting(b.dataset.buddy)));
document.querySelectorAll('[data-greet]').forEach(b=>b.addEventListener('click',()=>greeting(b.dataset.greet,true)));
document.querySelectorAll('[data-companion-action]').forEach(b=>b.addEventListener('click',()=>interact(b.dataset.companionAction)));
const faceScreen=new THREE.Vector3();
function resetPointerLook(){
 pointerActive=false;cursorX=cursorY=0;interactions?.clearLook();stage.dataset.gaze='resting';
 hero.style.setProperty('--back-x','0px');hero.style.setProperty('--back-y','0px');needsRender=true;
}
function updatePointerLook(){
 if(!pointerActive||!camera||paused)return;
 const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;
 camera.updateMatrixWorld();
 for(const [key,b] of buddies){
  // The rest-position face anchor avoids feedback as the model itself turns.
  faceScreen.copy(b.lookAnchor).project(camera);
  const x=rect.left+(faceScreen.x*.5+.5)*rect.width,y=rect.top+(-faceScreen.y*.5+.5)*rect.height;
  const sideRoom=pointerClientX<x?x:innerWidth-x;
  const horizontalReach=Math.max(160,Math.min(innerWidth*.34,sideRoom));
  interactions.setLookTarget(key,(pointerClientX-x)/horizontalReach,(pointerClientY-y)/Math.max(innerHeight*.38,180));
 }
}
function trackPointerLook(e){
 if(e.pointerType==='touch'||paused){if(pointerActive)resetPointerLook();return;}
 const rect=hero.getBoundingClientRect();
 if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom){if(pointerActive)resetPointerLook();return;}
 pointerClientX=e.clientX;pointerClientY=e.clientY;pointerActive=true;stage.dataset.gaze='following';
 cursorX=THREE.MathUtils.clamp(((e.clientX-rect.left)/rect.width-.5)*2,-1,1);cursorY=THREE.MathUtils.clamp(((e.clientY-rect.top)/rect.height-.5)*2,-1,1);
 hero.style.setProperty('--back-x',`${-cursorX*5}px`);hero.style.setProperty('--back-y',`${-cursorY*3}px`);updatePointerLook();needsRender=true;
}
addEventListener('pointermove',trackPointerLook,{passive:true});
addEventListener('blur',resetPointerLook);
document.documentElement.addEventListener('pointerleave',resetPointerLook);
addEventListener('scroll',resetPointerLook,{passive:true});
function layout(){if(!renderer||disposed)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;if(w!==previousW||h!==previousH){renderer.setPixelRatio(pixelRatioFor(w,h,{scale:budget.scale}));renderer.setSize(w,h,false);const vertical=Math.max(innerWidth<761?3.9:3.45,(innerWidth<761?4.55:5.0)*h/w);camera.position.x=innerWidth<761?.38:0;camera.lookAt(camera.position.x,1.05,0);camera.left=-vertical*w/h/2;camera.right=vertical*w/h/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();previousW=w;previousH=h;needsRender=true;updatePointerLook();}positionLabels();}
function positionLabels(){if(!camera)return;camera.updateMatrixWorld();for(const [key,b] of buddies){const p=b.group.position.clone();p.y-=.16;p.project(camera);const button=$('#buddy-'+key);button.style.left=(p.x*.5+.5)*stage.clientWidth+'px';button.style.top=(-p.y*.5+.5)*stage.clientHeight+'px';}}
async function loadBuddy(key){if(loaded.has(key))return loaded.get(key);const response=await fetch(`./assets/characters/${key}.glb.gz?art=27a`);if(!response.ok)throw new Error(key+'模型载入失败');const raw=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();const gltf=await new GLTFLoader().parseAsync(raw,'./assets/characters/');if(disposed){gltf.scene.traverse(o=>o.geometry?.dispose());return;}
 const group=new THREE.Group(),model=gltf.scene;model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());model.position.set(-center.x,-box.min.y,-center.z);const scale=(key==='xingzai'?1.95:1.27)/Math.max(size.y,.001);model.scale.setScalar(scale);model.position.multiplyScalar(scale);group.add(model);group.position.set(key==='xingzai'?-.78:1.04,key==='xingzai'?0:.36,0);group.rotation.y=key==='xingzai'?-.12:-.16;
 prepareCompanionMaterials(model,key);
 const meshes=[];model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;meshes.push(o);}});scene.add(group);
 const mixer=new THREE.AnimationMixer(model),actions=new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
 const lookAnchor=group.position.clone().add(new THREE.Vector3(0,key==='xingzai'?1.45:.78,.1));
 const buddy={key,group,model,mixer,actions,meshes,lookAnchor};buddies.set(key,buddy);loaded.set(key,buddy);interactions.register(buddy);updatePointerLook();positionLabels();needsRender=true;return buddy;
}
async function loadCharacters(){if(contextLost){location.reload();return;}const retry=$('#character-retry');retry.hidden=true;retry.disabled=true;$('#character-status').textContent='探索伙伴正在准备出发';const results=await Promise.allSettled(['xingzai','xunbao'].map(loadBuddy));if(disposed)return;const ok=results.every(r=>r.status==='fulfilled'&&r.value);if(ok){hero.classList.add('characters-ready');stage.dataset.models='ready';$('#character-status').textContent='星仔和讯宝已就绪';}else{stage.dataset.models='fallback';$('#character-status').textContent='暂以静态形象陪伴你，点击可重试三维角色';retry.hidden=false;results.forEach(r=>{if(r.status==='rejected')console.warn('Companion asset',r.reason);});}retry.disabled=false;needsRender=true;}
let resizeObserver,intersectionObserver;
try{
 renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(pixelRatioFor(stage.clientWidth,stage.clientHeight,{scale:budget.scale}));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();interactions=createHomeCompanions(scene,finishInteraction);camera=new THREE.OrthographicCamera(-3,3,1.75,-1.75,.1,60);camera.position.set(0,2.6,8);camera.lookAt(0,1.05,0);
 sky=createCompanionStudio(renderer,scene);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:.20,color:'#665437'}));ground.rotation.x=-Math.PI/2;ground.position.y=-.018;ground.receiveShadow=true;scene.add(ground);
 resizeObserver=new ResizeObserver(layout);resizeObserver.observe(stage);intersectionObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;last=performance.now();budget.reset();needsRender=true;renderer.setAnimationLoop(inView&&!document.hidden?homeFrame:null);},{threshold:0});intersectionObserver.observe(hero);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;hero.classList.remove('characters-ready');stage.dataset.models='fallback';$('#character-status').textContent='三维已暂停，静态伙伴仍陪你探索';$('#character-retry').hidden=false;needsRender=true;});canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;if(buddies.size===2){hero.classList.add('characters-ready');stage.dataset.models='ready';$('#character-retry').hidden=true;}needsRender=true;});
 layout();loadCharacters();$('#character-retry').addEventListener('click',loadCharacters);
 canvas.addEventListener('click',e=>{if(!hero.classList.contains('characters-ready'))return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);const candidates=[...buddies.values()];scene.updateMatrixWorld(true);let chosen=null,distance=Infinity;for(const b of candidates){const box=new THREE.Box3().setFromObject(b.group),hit=raycaster.ray.intersectBox(box,new THREE.Vector3());if(hit){const d=raycaster.ray.origin.distanceToSquared(hit);if(d<distance){distance=d;chosen=b.key;}}}if(chosen)greeting(chosen);});
 function homeFrame(now){if(disposed)return;const dt=Math.min((now-last)/1000,.04);last=now;if(document.hidden||!inView||contextLost)return;if(budget.sample(now)){previousW=0;layout();}if(!paused){elapsed+=dt;interactions.update(dt,elapsed);needsRender=true;}if(needsRender){if(now-(positionLabels.lastTime||0)>50){positionLabels();positionLabels.lastTime=now;}renderer.render(scene,camera);canvas.dataset.renders=String((Number(canvas.dataset.renders)||0)+1);needsRender=false;}}
 renderer.setAnimationLoop(homeFrame);renderer.userDataFrame=homeFrame;
}catch(error){console.warn('Homepage 3D fallback',error);stage.dataset.models='fallback';$('#character-status').textContent='当前设备显示静态伙伴，探索入口仍可使用';}
addEventListener('visibilitychange',()=>{if(document.hidden)resetPointerLook();last=performance.now();budget.reset();needsRender=true;renderer?.setAnimationLoop(!document.hidden&&inView?renderer.userDataFrame:null);});addEventListener('pageshow',e=>{if(e.persisted)location.reload();});addEventListener('pagehide',()=>{disposed=true;removeEventListener('pointermove',trackPointerLook);removeEventListener('blur',resetPointerLook);removeEventListener('scroll',resetPointerLook);document.documentElement.removeEventListener('pointerleave',resetPointerLook);renderer?.setAnimationLoop(null);resizeObserver?.disconnect();intersectionObserver?.disconnect();buddies.forEach(b=>b.mixer.stopAllAction());const textures=new Set();scene?.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}});textures.forEach(t=>t.dispose());interactions?.dispose();sky?.dispose();renderer?.dispose();});
