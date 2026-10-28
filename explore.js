import {pixelRatioFor,RenderBudget,yieldToBrowser} from './render-budget.js?art=38a';
import {townAudio} from './town-audio.js?art=38a';
import {mountMissionEntry} from './mission-entry.js?art=38a';
import * as THREE from 'three';
import {GROWTH_DURATION,arrivalAt,growthPhase,growthVertex,growthFragment,bindGrowthMaterial} from './building-growth.js?art=38a';
import {createParticleWorkbench} from './particle-workbench.js?art=38a';
import {createSurfaceFeedback} from './surface-feedback.js?art=38a';
import {createArchitectureTour} from './architecture-tour.js?art=38a';
import {readExplorationView,saveExplorationView} from './exploration-flow.js?art=38a';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createRegionMaterials} from './region-materials.js?art=38a';
import {createRegionLandscape} from './region-landscape.js?art=38a';
import {CachedAOPass as SSAOPass} from './cached-ao.js?art=38a';
import {CinematicLensPass,createFilmGrade} from './cinematic-lens.js?art=38a';
import {createArchitecturalSky} from './architectural-lighting.js?art=38a';
import {regions,regionById,exploreURL,sharedSpaceFacts,buildingHighlights} from './regions.js?art=38a';
const $=s=>document.querySelector(s);const params=new URLSearchParams(location.search);
const region=regionById(params.get('region'))??regions[0];
let selectedId=region.buildings.includes(Number(params.get('building')))?Number(params.get('building')):region.buildings[0];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
document.title=region.title+' · 北京卫星小镇';document.documentElement.style.setProperty('--accent',region.color);
$('#region-kind').textContent=region.english+' / '+region.kind;$('#region-title').textContent=region.title;$('#region-tagline').textContent=region.tagline;
$('#region-navigation').innerHTML=regions.map(r=>`<a href="${exploreURL(r)}" class="${r.id===region.id?'active':''}" ${r.id===region.id?'aria-current="page"':''}>${r.title}</a>`).join('');
$('#region-menu').addEventListener('click',()=>{if(innerWidth>700){$('#planning-dialog').showModal();return;}if(document.body.classList.contains('intro-open'))setIntro(false);const open=$('#region-navigation').classList.toggle('menu-open');$('#region-menu').setAttribute('aria-expanded',String(open));});
const gallery=['talent','incubation','exchange','exhibition'].includes(region.id)?`<div class="intro-gallery"><img src="./assets/explore/${region.id}-1.webp" alt="${region.title}配套示意图一"><img src="./assets/explore/${region.id}-2.webp" alt="${region.title}配套示意图二"></div><div class="gallery-caption">项目配套示意</div>`:'';
$('#intro-content').innerHTML=`<p class="intro-kicker">${region.kind} / ${String(regions.indexOf(region)+1).padStart(2,'0')}</p><h2>${region.title}</h2><p class="intro-summary">${region.summary}</p><div id="selected-building" class="selected-building"></div><section class="building-observation"><h3>建筑观察</h3><p id="building-note" class="intro-body"></p></section><div class="intro-tags">${region.tags.map(t=>`<span>${t}</span>`).join('')}</div><div class="intro-metrics">${region.metrics.map(([v,l])=>`<div><strong>${v}</strong><small>${l}</small></div>`).join('')}</div>${gallery}${region.sections.map(([h,p])=>`<section><h3>${h}</h3><p class="intro-body">${p}</p></section>`).join('')}<details><summary style="font-size:11px;margin-top:24px;cursor:pointer">查看项目整体空间参数</summary><div class="space-facts">${sharedSpaceFacts.map(([v,l])=>`<div><strong>${v}</strong><small>${l}</small></div>`).join('')}</div><p class="source-note">以上为项目整体参数范围，并非当前楼栋的独立测量或招商条件。</p></details>`;
mountMissionEntry(region);
function updateSelectedLabel(){const ordinal=region.buildings.indexOf(selectedId)+1;const feature=buildingHighlights[selectedId];$('#selected-building').textContent=`当前建筑：${feature?.[0]??region.title} · 楼宇 ${String(ordinal).padStart(2,'0')}`;$('#building-note').textContent=feature?.[1]??'切换局部取景，观察建筑的立面、屋顶与入口。';document.querySelectorAll('.building-hotspot').forEach(b=>b.classList.toggle('active',Number(b.dataset.building)===selectedId));}
updateSelectedLabel();
let returnFocus=null,detailTour,surfaceFeedback,autoReveal=true,restored=false,flowStep='',introFitTimer;
let resumeView=null;try{if(params.get('resume')==='1')resumeView=readExplorationView(sessionStorage,region.id);}catch{}
function setIntro(open,id=selectedId){if(open)townAudio.effect('discover');$('.discovery-note')?.setAttribute('hidden','');if(open)workbench?.closeCamera();selectedId=id;updateSelectedLabel();if(particleMaterial)particleMaterial.uniforms.uSelected.value=id;document.body.classList.toggle('intro-open',open);$('#intro-open').setAttribute('aria-expanded',String(open));if(open){returnFocus=document.activeElement;$('#intro-close').focus();}else{if(returnFocus&&returnFocus!==$('#intro-close'))returnFocus?.focus?.();else $('#intro-open').focus();}clearTimeout(introFitTimer);introFitTimer=setTimeout(()=>{if(ready)focus(focusMode);},370);}
$('#intro-open').addEventListener('click',()=>setIntro(true));$('#intro-close').addEventListener('click',()=>setIntro(false));
$('#planning-open').addEventListener('click',()=>$('#planning-dialog').showModal());$('#planning-close').addEventListener('click',()=>$('#planning-dialog').close());
$('#planning-dialog').addEventListener('click',e=>{if(e.target===$('#planning-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
const stage=$('.particle-stage'),canvas=$('#building-scene');
const budget=new RenderBudget();let renderDirty=true,feedbackActive=false,lastShadow=-Infinity,renderTotal=0,previousVisual="";
let renderer,composer,camera,controls,scene,particleMaterial,points,model,depthModel,meta,sky,artMaterials,workbench,sourcePoints,sourceModel,lens,sun,ao,landscape;
let cohesion=0,modelFailed=false,materialReady=false,dust;const surfaceUniform={value:0},surfaceProgress={value:0};
let ready=false,disposed=false,paused=false,growth=reducedMotion.matches?1:0,clock=0,last=performance.now(),modelMode='particles',focusMode='whole',flight=null,pointerDown=null,selectedMeshBounds=new Map(),meshes=[],hotspots=[],baseCenter=new THREE.Vector3(),span=100;
let shownBuilding;let mainBox=new THREE.Box3(),height=50;const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const particleUniforms={uGrowth:{value:0},uTime:{value:0},uHeight:{value:50},uSize:{value:1},uSelected:{value:0},uPulse:{value:0},uCohesion:{value:0},uSpan:{value:100},uGrowthBounds:{value:new THREE.Vector4()},uDust:{value:0}};
function initRenderer(){
 const w=stage.clientWidth,h=stage.clientHeight;renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(pixelRatioFor(w,h,{scale:budget.scale}));renderer.setSize(w,h,false);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();scene.background=new THREE.Color('#f0e6d5');camera=new THREE.PerspectiveCamera(38,w/h,.1,5000);controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=.14;controls.rotateSpeed=.55;controls.autoRotateSpeed=.45;
 scene.add(new THREE.HemisphereLight('#c7ddf3','#b3a68d',.56));sun=new THREE.DirectionalLight('#ffd297',4.8);sun.position.set(-140,130,230);sun.castShadow=true;sun.shadow.mapSize.set(w<760?1024:2048,w<760?1024:2048);Object.assign(sun.shadow.camera,{left:-230,right:230,top:230,bottom:-230,near:1,far:650});sun.shadow.normalBias=.10;sun.shadow.bias=-.00008;scene.add(sun);const fill=new THREE.DirectionalLight('#abcce5',.45);fill.position.set(180,75,-180);scene.add(fill);
 sky=createArchitecturalSky(renderer);scene.environment=sky.get('evening');scene.environmentIntensity=.43;
 composer=new EffectComposer(renderer);for(const t of [composer.renderTarget1,composer.renderTarget2]){t.depthTexture=new THREE.DepthTexture(t.width,t.height,THREE.UnsignedIntType);t.samples=2;}
 const beauty=new RenderPass(scene,camera);const beautyRender=beauty.render.bind(beauty);beauty.render=(r,w,b,...args)=>{if(lens)lens.depthTexture=b.depthTexture;beautyRender(r,w,b,...args);};composer.addPass(beauty);ao=new SSAOPass(scene,camera,w,h,16);ao.kernelRadius=2.0;ao.minDistance=.0002;ao.maxDistance=.012;composer.addPass(ao);ao.cacheStatic=true;ao.setSize(Math.round(w*.6),Math.round(h*.6));
 const aoRender=ao.render.bind(ao);ao.render=(...args)=>{const hidden=[];scene.traverse(o=>{if(o.visible&&(o.userData.aoExclude||o.isPoints)){hidden.push(o);o.visible=false;}});try{aoRender(...args);}finally{hidden.forEach(o=>o.visible=true);}};
 composer.addPass(new UnrealBloomPass(new THREE.Vector2(w,h),.24,.5,1.25));lens=new CinematicLensPass(camera);composer.addPass(lens);const grade=createFilmGrade();grade.uniforms.uWarmth.value=.018;grade.uniforms.uShadowLift.value=.008;grade.uniforms.uGlow.value=.018;composer.addPass(grade);composer.addPass(new OutputPass());
 artMaterials=createRegionMaterials();controls.addEventListener('start',()=>{flight=null;surfaceFeedback?.clear();});controls.addEventListener('change',()=>renderDirty=true);
 new ResizeObserver(resize).observe(stage);
 renderer.setAnimationLoop(animate);
}
function resize(){
 if(!renderer||disposed)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
 const previousAspect=camera.aspect,nextAspect=w/h;
 if(ready&&focusMode==='whole'){
  const scale=Math.max(1,1.30/nextAspect)/Math.max(1,1.30/previousAspect);
  camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
  if(flight){flight.from.sub(flight.fromTarget).multiplyScalar(scale).add(flight.fromTarget);flight.to.sub(flight.toTarget).multiplyScalar(scale).add(flight.toTarget);}
 }
 camera.aspect=nextAspect;camera.updateProjectionMatrix();renderer.setPixelRatio(pixelRatioFor(w,h,{scale:budget.scale}));renderer.setSize(w,h,false);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);ao.setSize(Math.round(w*.6*budget.scale),Math.round(h*.6*budget.scale));renderDirty=true;
}
async function getPacked(name){const r=await fetch('./assets/explore/'+region.id+name+'?asset=19a');if(!r.ok)throw new Error('局部资源载入失败');const packed=await r.arrayBuffer();if(name==='.glb.gz')sourceModel=packed;return new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
function buildPoints(buffer){
 const view=new DataView(buffer),count=view.getUint32(4,true);if(view.getUint32(0,true)!==0x31505453||buffer.byteLength!==8+count*16)throw new Error('粒子数据不完整');
 const positions=new Float32Array(buffer,8,count*3).slice(),rgb=new Uint8Array(buffer,8+count*12,count*3),id=new Uint8Array(buffer,8+count*15,count),colors=new Float32Array(count*3),seeds=new Float32Array(count),ids=new Float32Array(count),arrivals=new Float32Array(count);
 const bounds=[mainBox.min.x,mainBox.max.x,mainBox.min.z,mainBox.max.z];
 for(let i=0;i<count;i++){positions[i*3]-=baseCenter.x;positions[i*3+2]-=baseCenter.z;colors[i*3]=rgb[i*3]/255;colors[i*3+1]=rgb[i*3+1]/255;colors[i*3+2]=rgb[i*3+2]/255;let hash=Math.imul(i+17,374761393);hash=Math.imul(hash^(hash>>>13),1274126177);seeds[i]=((hash^(hash>>>16))>>>0)/4294967296;ids[i]=id[i];arrivals[i]=arrivalAt(positions[i*3],positions[i*3+1],positions[i*3+2],bounds,height);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('aHome',new THREE.BufferAttribute(positions.slice(),3));g.getAttribute('position').setUsage(THREE.DynamicDrawUsage);g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));g.setAttribute('aBuilding',new THREE.BufferAttribute(ids,1));
 g.setAttribute('aArrival',new THREE.BufferAttribute(arrivals,1));
 particleMaterial=new THREE.ShaderMaterial({uniforms:particleUniforms,transparent:true,depthWrite:true,vertexColors:true,vertexShader:growthVertex,fragmentShader:growthFragment});
 points=new THREE.Points(g,particleMaterial);points.name='区域建筑 / 原网格表面粒子';points.frustumCulled=false;points.renderOrder=2;scene.add(points);
 const dustGeometry=new THREE.BufferGeometry(),dustCount=Math.min(6500,Math.floor(count/4));
 for(const key of ['position','aHome','aSeed','aArrival','aBuilding','color']){const source=g.getAttribute(key),array=new Float32Array(dustCount*source.itemSize);for(let i=0;i<dustCount;i++){const index=Math.floor(i*count/dustCount);for(let j=0;j<source.itemSize;j++)array[i*source.itemSize+j]=source.array[index*source.itemSize+j];}dustGeometry.setAttribute(key,new THREE.BufferAttribute(array,source.itemSize));}
 const dustMaterial=new THREE.ShaderMaterial({uniforms:{...particleUniforms,uDust:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,vertexShader:growthVertex,fragmentShader:growthFragment});
 dust=new THREE.Points(dustGeometry,dustMaterial);dust.name='生长前缘 / 细密流光';dust.frustumCulled=false;dust.renderOrder=3;scene.add(dust);
 particleUniforms.uSpan.value=span;particleUniforms.uGrowthBounds.value.fromArray(bounds);
 particleUniforms.uHeight.value=height;particleUniforms.uSize.value=span*.015;particleUniforms.uSelected.value=selectedId;
}
function createBase(){
 const extent=span*.85;sun.position.set(-span*.8,span*.82,span*1.25);sun.target.position.set(0,height*.25,0);scene.add(sun.target);Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:1,far:span*5});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.035;sun.shadow.radius=3;
 scene.fog=new THREE.Fog('#f0e6d5',span*2.8,span*6);
}
function boundsFor(id){return selectedMeshBounds.get(Number(id))??mainBox;}
function focus(mode,instant=false){
 if(mode==='whole')$('.discovery-note').hidden=true;
 if(!ready)return;focusMode=mode;document.querySelectorAll('[data-focus]').forEach(b=>b.classList.toggle('active',b.dataset.focus===mode));const box=mode==='whole'?mainBox:boundsFor(selectedId),size=box.getSize(new THREE.Vector3()),target=box.getCenter(new THREE.Vector3());
 let direction=new THREE.Vector3(1.3,1.12,1.65),distance=Math.max(size.x,size.y,size.z)*2.08;
 if(mode==='whole'){
  target.y=height*.40;const toward=direction.clone().normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),toward).normalize(),up=new THREE.Vector3().crossVectors(toward,right),tan=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));distance=0;
  for(const x of [box.min.x-9,box.max.x+9])for(const y of [0,box.max.y+5])for(const z of [box.min.z-9,box.max.z+9]){const q=new THREE.Vector3(x,y,z).sub(target),depth=q.dot(toward);distance=Math.max(distance,Math.abs(q.dot(right))/(tan*camera.aspect*.86)+depth,Math.abs(q.dot(up))/(tan*.73)+depth);}
  if(camera.aspect>1.25)distance=Math.min(distance,Math.max(size.x,size.y,size.z)*(meta.buildings.length===1?2.08:1.6));
 }

 if(mode==='facade'){target.y=box.min.y+size.y*.55;direction.set(.45,.15,1.7);distance=Math.max(size.x,size.y)*1.65;}
 if(mode==='roof'){target.y=box.max.y-1;direction.set(.70,1.8,1.2);distance=Math.max(size.x,size.z)*1.50;}
 if(mode==='entry'){target.y=box.min.y+Math.min(4,size.y*.15);target.z=box.max.z;direction.set(.6,.30,1.4);distance=Math.max(25,Math.min(size.x,size.z)*1.10);}
 if(mode!=='whole'&&camera.aspect<.75)target.y-=size.y*.65;
 if(mode!=='whole')distance*=Math.max(1,1.30/camera.aspect);direction.normalize().multiplyScalar(distance);const pos=target.clone().add(direction);controls.minDistance=mode==='whole'?span*.25:8;controls.maxDistance=span*8;
 if(instant||reducedMotion.matches){camera.position.copy(pos);controls.target.copy(target);controls.update();}else{flight={from:camera.position.clone(),to:pos,fromTarget:controls.target.clone(),toTarget:target,age:0};}
}
function addHotspots(){
 hotspots=meta.buildings.map((b,i)=>{const button=document.createElement('button');button.className='building-hotspot';button.dataset.building=b.id;button.setAttribute('aria-label',region.title+'楼宇'+(i+1)+'介绍');button.textContent=meta.buildings.length===1?'探索建筑':(buildingHighlights[b.id]?.[0]??'楼宇 '+String(i+1).padStart(2,'0'));button.addEventListener('click',()=>showDetail('facade',b.id));$('#building-hotspots').append(button);return {b,button};});updateSelectedLabel();
}
async function load(){
 try{meta=await fetch('./assets/explore/'+region.id+'.json?asset=19a').then(r=>{if(!r.ok)throw new Error('区域资料载入失败');return r.json();});const min=new THREE.Vector3(...meta.min),max=new THREE.Vector3(...meta.max);baseCenter.addVectors(min,max).multiplyScalar(.5);height=max.y;span=Math.max(max.x-min.x,max.z-min.z,height)*1.10;
  mainBox.set(new THREE.Vector3(min.x-baseCenter.x,min.y,min.z-baseCenter.z),new THREE.Vector3(max.x-baseCenter.x,max.y,max.z-baseCenter.z));
  for(const b of meta.buildings){selectedMeshBounds.set(b.id,new THREE.Box3(new THREE.Vector3(b.min[0]-baseCenter.x,b.min[1],b.min[2]-baseCenter.z),new THREE.Vector3(b.max[0]-baseCenter.x,b.max[1],b.max[2]-baseCenter.z)));}
  const buffer=await getPacked('.points.gz');if(disposed)return;sourcePoints=buffer;buildPoints(buffer);createBase();ready=true;focus('whole',true);addHotspots();initWorkbench();$('#viewer-loading-text').textContent='正在准备建筑与花园';loadMaterial();
 }catch(e){console.error('Region viewer',e);$('#viewer-loading-text').textContent='载入未完成，请重试';$('#viewer-retry').classList.remove('hidden');}
}
async function loadMaterial(){modelFailed=false;try{const buffer=await getPacked('.glb.gz');const gltf=await new GLTFLoader().parseAsync(buffer,'./assets/');if(disposed){gltf.scene.traverse(o=>o.geometry?.dispose());return;}model=gltf.scene;model.position.set(-baseCenter.x,0,-baseCenter.z);model.traverse(o=>{if(o.isMesh){if(o.material.name==='*28'){o.visible=false;return;}o.material=artMaterials.material(o.material);artMaterials.setUV(o);o.castShadow=o.receiveShadow=true;meshes.push(o);}});model.visible=false;scene.add(model);model.updateMatrixWorld(true);
 try{landscape=await createRegionLandscape({scene,model,meta,baseCenter,region});stage.dataset.landscape='ready';}catch(e){console.error('Region landscape',e);stage.dataset.landscape='failed';}
 if(disposed)return;
 const surfaceUniforms={...particleUniforms,uGrowth:surfaceProgress,uCohesion:surfaceUniform};
 const unique=new Set();model.traverse(o=>{if(!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];
  for(const m of materials){if(!unique.has(m)){unique.add(m);bindGrowthMaterial(m,surfaceUniforms);}}
  if(o.castShadow){const m=materials[0];const depth=o.customDepthMaterial?.clone()??new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:m.map,alphaMap:m.alphaMap,alphaTest:m.alphaTest,side:m.side});bindGrowthMaterial(depth,surfaceUniforms);o.customDepthMaterial=depth;}
 });
 surfaceFeedback=createSurfaceFeedback({scene,camera,canvas,root:model,scale:span,onDirty:()=>renderDirty=true,enabled:()=>modelMode==='material'&&!workbench?.isPlaying()});
 detailTour=createArchitectureTour({host:stage,content:$('#discovery-content'),camera,root:model,region,getBox:()=>boundsFor(selectedId),onFocus:mode=>focus(mode),onChange:current=>{if(current)$('.discovery-note').hidden=false;}});
 renderDirty=true;renderer.shadowMap.needsUpdate=true;ao.invalidate();materialReady=true;$('#growth-skip').hidden=false;if(reducedMotion.matches)cohesion=1;
 if(resumeView&&!restored){restored=true;growth=1;cohesion=1;autoReveal=false;modelMode='material';if(region.buildings.includes(resumeView.selectedId))selectedId=resumeView.selectedId;focusMode=resumeView.focusMode||'whole';camera.position.fromArray(resumeView.camera);controls.target.fromArray(resumeView.target);if(resumeView.aspect)camera.position.sub(controls.target).multiplyScalar(Math.max(1,1.30/camera.aspect)/Math.max(1,1.30/resumeView.aspect)).add(controls.target);controls.update();detailTour.rebuild();setMaterialMode();updateSelectedLabel();document.querySelectorAll('[data-focus]').forEach(b=>b.classList.toggle('active',b.dataset.focus===focusMode));}$('#viewer-loading').classList.add('hidden');
 $('#record-start').disabled=false;
 document.querySelector('[data-render="material"]').disabled=false;
 }catch(e){modelFailed=true;$('#viewer-loading').classList.add('hidden');console.error('Regional material',e);const button=document.querySelector('[data-render="material"]');button.disabled=false;button.textContent='重试材质';button.dataset.failed='true';}}
$('#viewer-retry').addEventListener('click',()=>location.reload());
document.querySelectorAll('[data-render]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.failed){b.disabled=true;delete b.dataset.failed;b.textContent='建筑材质';loadMaterial();return;}autoReveal=false;modelMode=b.dataset.render;if(modelMode==='material'&&!model)return;points.visible=modelMode==='particles';workbench?.setMaterial(modelMode==='material');if(model)model.visible=modelMode==='material';document.querySelectorAll('[data-render]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});}));
document.querySelectorAll('[data-focus]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.focus==='whole')focus('whole');else showDetail(b.dataset.focus);}));$('#model-reset').addEventListener('click',()=>{controls.autoRotate=false;$('#model-rotate').setAttribute('aria-pressed','false');focus('whole');});$('#model-rotate').addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;$('#model-rotate').setAttribute('aria-pressed',String(controls.autoRotate));});
$('#growth-replay').addEventListener('click',()=>{if(!ready||workbench&&!workbench.reset())return;autoReveal=true;$('.discovery-note').hidden=true;setIntro(false);focus('whole');cohesion=reducedMotion.matches?1:0;clock=0;growth=reducedMotion.matches?1:0;paused=false;modelMode='particles';workbench?.setMaterial(false);points.visible=true;if(model)model.visible=false;document.querySelectorAll('[data-render]').forEach(x=>{const active=x.dataset.render==='particles';x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));});$('#growth-pause').setAttribute('aria-pressed','false');$('#growth-pause').textContent='Ⅱ 暂停动态';});
$('#growth-pause').addEventListener('click',()=>{paused=!paused;$('#growth-pause').setAttribute('aria-pressed',String(paused));$('#growth-pause').textContent=paused?'▷ 继续动态':'Ⅱ 暂停动态';});
$('#growth-seek').addEventListener('input',e=>{if(!ready||!workbench?.reset())return;autoReveal=false;growth=Number(e.target.value)/100;clock=growth*GROWTH_DURATION;cohesion=1;paused=true;modelMode='particles';workbench.setMaterial(false);points.visible=true;$('#growth-pause').setAttribute('aria-pressed','true');$('#growth-pause').textContent='▷ 继续动态';document.querySelectorAll('[data-render]').forEach(b=>{const active=b.dataset.render==='particles';b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});});
function pick(event){const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);
 if(meshes.length){model.updateMatrixWorld(true);const hits=raycaster.intersectObjects(meshes.filter(o=>o.visible),false);if(hits.length){let o=hits[0].object;while(o&&!o.userData.buildingId)o=o.parent;return o?.userData.buildingId??selectedId;}}
 // Point-only fallback remains interactive if the optional material asset fails.
 const hit=new THREE.Vector3();let best=null,distance=Infinity;for(const [id,box] of selectedMeshBounds){if(raycaster.ray.intersectBox(box,hit)){const d=hit.distanceTo(camera.position);if(d<distance){distance=d;best=id;}}}return best;}
const activePointers=new Set();let multiTouch=false;
canvas.addEventListener('pointerdown',e=>{activePointers.add(e.pointerId);if(activePointers.size>1){multiTouch=true;pointerDown=null;return;}if(e.button===0&&!multiTouch)pointerDown={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};else pointerDown=null;});
canvas.addEventListener('pointermove',e=>{if(pointerDown&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>6)pointerDown.moved=true;});
canvas.addEventListener('pointerup',e=>{if(!multiTouch&&pointerDown?.id===e.pointerId&&!pointerDown.moved&&performance.now()-pointerDown.time<250&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)<=6){const id=pick(e);if(id&&growth>=1){showDetail('facade',id);particleUniforms.uPulse.value=1;}}pointerDown=null;activePointers.delete(e.pointerId);if(activePointers.size===0)multiTouch=false;});
canvas.addEventListener('pointercancel',e=>{pointerDown=null;activePointers.delete(e.pointerId);if(activePointers.size===0)multiTouch=false;});
canvas.addEventListener('keydown',e=>{if(workbench?.isPlaying())return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const delta=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(delta);if(e.key==='ArrowLeft')spherical.theta-=.10;if(e.key==='ArrowRight')spherical.theta+=.10;if(e.key==='ArrowUp')spherical.phi=Math.max(.16,spherical.phi-.08);if(e.key==='ArrowDown')spherical.phi=Math.min(1.49,spherical.phi+.08);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));flight=null;}if(e.key==='Enter')setIntro(true);});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#planning-dialog').open){setIntro(false);$('#region-navigation').classList.remove('menu-open');$('#region-menu').setAttribute('aria-expanded','false');}if(e.key==='Tab'&&document.body.classList.contains('intro-open')&&innerWidth<700){const els=[...$('#intro-panel').querySelectorAll('button,summary,a')],first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
function viewState(){return {camera:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov,growth,clock,cohesion,pulse:particleUniforms.uPulse.value,mode:modelMode,paused,selectedId};}
function applyView(v){camera.position.fromArray(v.camera);controls.target.fromArray(v.target);camera.fov=v.fov;camera.updateProjectionMatrix();growth=v.growth;clock=v.clock;particleUniforms.uPulse.value=v.pulse??0;cohesion=v.cohesion;modelMode=v.mode;paused=false;flight=null;controls.autoRotate=false;points.visible=modelMode==='particles';selectedId=region.buildings.includes(v.selectedId)?v.selectedId:selectedId;particleUniforms.uSelected.value=selectedId;updateSelectedLabel();document.querySelectorAll('[data-render]').forEach(b=>{b.classList.toggle('active',b.dataset.render===modelMode);b.setAttribute('aria-pressed',String(b.dataset.render===modelMode));});}
function prepareInteraction(){autoReveal=false;workbench?.setMaterial(false);growth=1;paused=false;modelMode='particles';points.visible=true;controls.autoRotate=false;$('#model-rotate').setAttribute('aria-pressed','false');$('#growth-pause').setAttribute('aria-pressed','false');$('#growth-pause').textContent='Ⅱ 暂停动态';document.querySelectorAll('[data-render]').forEach(b=>{const active=b.dataset.render==='particles';b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
function initWorkbench(){workbench=createParticleWorkbench({canvas,stage,camera,controls,home:points.geometry.getAttribute('aHome').array,span,region,meta,getView:viewState,applyView,prepare:prepareInteraction,
 resources:async()=>{if(!sourceModel||!model)throw new Error('完整建筑尚未载入');const response=await fetch('./particle-motion.js'),visual=await fetch('./building-growth.js?art=38a');if(!response.ok||!visual.ok)throw new Error('模拟规则载入失败');return new Map([['source.points',sourcePoints],['source.glb.gz',sourceModel],['region.json',JSON.stringify(meta)],['particle-motion.js',await response.text()],['building-growth.js',await visual.text()]]);},
 updateGeometry:p=>{points.geometry.getAttribute('position').array=p;points.geometry.getAttribute('position').needsUpdate=true;},
 onChange:m=>{if(!workbench?.isPlaying()){cohesion+=((m.moving===0?1:0)-cohesion)*(m.moving===0?.08:.22);if(cohesion>.997)cohesion=1;if(cohesion<.0003)cohesion=0;}}
 });}
function animate(now){const dt=Math.min((now-last)/1000,.05);last=now;if(disposed||document.hidden)return;if(!ready){if(renderDirty){renderer.render(scene,camera);renderDirty=false;}return;}if(!paused&&!workbench?.isPlaying()&&(materialReady||modelFailed)){clock+=dt;growth=Math.min(1,growth+dt/GROWTH_DURATION);}particleUniforms.uGrowth.value=growth;particleUniforms.uTime.value=reducedMotion.matches?0:clock;particleUniforms.uPulse.value=Math.max(0,particleUniforms.uPulse.value-dt*.4);
 if(flight){flight.age+=dt;let t=Math.min(1,flight.age/1.15);t=t*t*(3-2*t);camera.position.lerpVectors(flight.from,flight.to,t);controls.target.lerpVectors(flight.fromTarget,flight.toTarget,t);if(t>=1)flight=null;}
 const rotating=controls.autoRotate;controls.autoRotate=rotating&&!paused&&!reducedMotion.matches&&!workbench?.isPlaying();controls.update(dt);controls.autoRotate=rotating;if(!disposed)workbench?.tick(dt,now);artMaterials.update(clock);
 particleUniforms.uGrowth.value=growth;particleUniforms.uTime.value=reducedMotion.matches?0:clock;surfaceProgress.value=modelMode==='material'?1:growth;surfaceUniform.value=modelMode==='material'?1:cohesion;particleUniforms.uCohesion.value=model?surfaceUniform.value:0;if(model)model.visible=materialReady&&surfaceUniform.value>.003&&surfaceProgress.value>.015;if(dust)dust.visible=modelMode==='particles'&&growth<1;
 if(autoReveal&&growth===1&&cohesion>.995&&materialReady&&!workbench?.isRecording()&&!workbench?.isPlaying()){autoReveal=false;setMaterialMode();}
 const onlyBuilding=modelMode==='material'&&focusMode!=='whole'?selectedId:null;if(shownBuilding!==onlyBuilding){renderer.shadowMap.needsUpdate=true;ao.invalidate();renderDirty=true;shownBuilding=onlyBuilding;meshes.forEach(o=>{o.visible=onlyBuilding===null||Number(o.userData.buildingId)===Number(onlyBuilding);});landscape?.architecture.children.forEach(o=>{o.visible=onlyBuilding===null||Number(o.userData.buildingId)===Number(onlyBuilding);});detailTour?.rebuild();}
 const previousFeedback=feedbackActive;feedbackActive=surfaceFeedback?.update(dt,now)||false;const visual=[modelMode,focusMode,selectedId,paused,growth.toFixed(4),surfaceUniform.value.toFixed(3)].join('|');const activeMotion=!paused&&(growth<1||!!workbench?.motion.moving||!!workbench?.isPlaying()||!!workbench?.isRecording());const visualChanged=visual!==previousVisual;const draw=renderDirty||flight||previousFeedback||feedbackActive||visualChanged||activeMotion||particleUniforms.uPulse.value>0;renderDirty=false;previousVisual=visual;if(!draw){budget.reset();return;}if(budget.sample(now))resize();if(visualChanged||activeMotion){ao.invalidate();if(now-lastShadow>80||!activeMotion){renderer.shadowMap.needsUpdate=true;lastShadow=now;}}detailTour?.update((meta.buildings.length===1||focusMode!=='whole')&&(modelMode==='material'||growth===1&&cohesion>.99)&&!workbench?.motion.moving);
 updateFlow();
 const phase=growthPhase(growth);stage.dataset.growthPhase=phase;const seek=$('#growth-seek');seek.disabled=!materialReady||workbench?.isRecording()||workbench?.isPlaying();if(document.activeElement!==seek)seek.value=Math.round(growth*100);$('#growth-phase').textContent=phase+' · '+Math.round(growth*100)+'%';
 let status=modelMode==='material'?(paused?'建筑材质 · 动态已暂停':'建筑实景 · 夕照花园'):growth<1?(paused?phase+'已暂停 · '+Math.round(growth*100)+'%':phase+' · '+Math.round(growth*100)+'%'):paused?'动态已暂停 · 可继续浏览':modelMode==='material'?'建筑实景 · 夕照花园':workbench?.isPlaying()?'粒子动作回放中':workbench?.motion.moving?'星尘运动中 · 松手凝聚完整建筑':model&&surfaceUniform.value>.96?'完整建筑已凝聚 · 点击探索':modelFailed?'完整材质载入失败 · 请点击重试材质':'粒子已成形 · 正在衔接完整材质';if(workbench?.isRecording())status='动作录制中 · '+status;if($('#growth-status').textContent!==status)$('#growth-status').textContent=status;
 const forward=new THREE.Vector3();camera.getWorldDirection(forward);for(const {b,button} of hotspots){const p=new THREE.Vector3(b.center[0]-baseCenter.x,b.max[1]+4,b.center[2]-baseCenter.z),direction=p.clone().sub(camera.position);p.project(camera);const visible=focusMode==='whole'&&(modelMode==='material'||growth>arrivalAt(b.center[0]-baseCenter.x,b.max[1],b.center[2]-baseCenter.z,[mainBox.min.x,mainBox.max.x,mainBox.min.z,mainBox.max.z],height)+.29)&&forward.dot(direction)>0&&p.z<1&&Math.abs(p.x)<.9&&p.y<.78&&p.y>-.5;button.style.display=visible?'block':'none';button.style.left=(p.x*.5+.5)*stage.clientWidth+'px';button.style.top=(-p.y*.5+.5)*stage.clientHeight+'px';}
 ao.enabled=(modelMode==='material'||growth>=1)&&cohesion>.98;
 stage.dataset.particleState=workbench?.motion.moving?'moving':growth<1?'growing':model&&surfaceUniform.value>.96?'complete':'settling';if(lens){const direction=new THREE.Vector3();camera.getWorldDirection(direction);lens.uniforms.focusDistance.value=controls.target.clone().sub(camera.position).dot(direction);if(scene.fog){scene.fog.near=lens.uniforms.focusDistance.value+span*1.2;scene.fog.far=lens.uniforms.focusDistance.value+span*4.5;}lens.uniforms.focusBand.value=span*(focusMode==='whole'?.40:.34);lens.uniforms.aperture.value=modelMode==='material'?14:3+11*THREE.MathUtils.smoothstep(growth,.85,1)*cohesion;}composer.render();canvas.dataset.renders=String(++renderTotal);canvas.dataset.renderScale=String(budget.scale);}

function setMaterialMode(){modelMode='material';workbench?.setMaterial(true);points.visible=false;if(model)model.visible=true;$('#growth-skip').hidden=true;document.querySelectorAll('[data-render]').forEach(b=>{b.classList.toggle('active',b.dataset.render==='material');b.setAttribute('aria-pressed',String(b.dataset.render==='material'));});$('.model-invitation strong').textContent='走近建筑，发现细节';}
function showDetail(mode,id=selectedId){if(!materialReady||(growth<1&&modelMode!=='material'))return;selectedId=id;updateSelectedLabel();particleUniforms.uSelected.value=id;detailTour?.rebuild();if(document.body.classList.contains('intro-open'))setIntro(false);detailTour?.select(mode,true);$('.discovery-note').hidden=false;}
function updateFlow(){const complete=modelMode==='material'||growth===1&&cohesion>.99,step=complete?'observe':'grow';if(step!==flowStep){flowStep=step;stage.dataset.flow=step;$('#flow-grow').setAttribute('aria-current',step==='grow'?'step':'false');$('#flow-observe').setAttribute('aria-current',step==='observe'?'step':'false');$('#flow-observe').disabled=!complete;$('#growth-skip').hidden=complete||!materialReady;$('.model-invitation strong').textContent=complete?'走近建筑，发现细节':'星尘汇聚，建筑渐现';}
 const a=$('#region-challenge-link');if($('#flow-challenge').getAttribute('href')!==a.getAttribute('href'))$('#flow-challenge').href=a.getAttribute('href');}
$('#growth-skip').onclick=()=>{if(!materialReady||!workbench?.reset())return;growth=1;cohesion=1;autoReveal=false;setMaterialMode();};
$('#flow-grow').onclick=()=>$('#growth-replay').click();$('#flow-observe').onclick=()=>showDetail('facade');
$('#discovery-close').onclick=()=>{$('.discovery-note').hidden=true;$('#flow-observe').focus();};
$('#discovery-story').onclick=()=>setIntro(true);
function rememberView(){if(!ready)return;try{saveExplorationView(sessionStorage,region.id,{camera:camera.position.toArray(),target:controls.target.toArray(),selectedId,focusMode,aspect:camera.aspect});}catch{}}
addEventListener('pagehide',rememberView);document.addEventListener('click',e=>{if(e.target.closest('a[href*="game.html"],a[href*="journey.html"]'))rememberView();});

for(const event of ['click','input','keydown'])document.addEventListener(event,()=>{renderDirty=true;});
addEventListener('visibilitychange',()=>{last=performance.now();budget.reset();renderDirty=true;renderer?.setAnimationLoop(document.hidden?null:animate);});
try{initRenderer();load();}catch(e){console.error('Region WebGL',e);$('#viewer-loading-text').textContent='请启用浏览器硬件加速后重试';$('#viewer-retry').classList.remove('hidden');}
addEventListener('pagehide',()=>{disposed=true;workbench?.dispose();surfaceFeedback?.dispose();detailTour?.dispose();clearTimeout(introFitTimer);renderer?.setAnimationLoop(null);controls?.dispose();composer?.passes.forEach(p=>p.dispose?.());composer?.dispose();scene?.traverse(o=>{o.geometry?.dispose();o.customDepthMaterial?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});sky?.dispose();artMaterials?.dispose();renderer?.dispose();});

addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
