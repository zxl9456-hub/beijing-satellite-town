import {createParkDetail} from './park-detail.js?art=37a';
import {pixelRatioFor,RenderBudget,yieldToBrowser} from './render-budget.js?art=37a';
import {townAudio} from './town-audio.js?art=37a';
import * as THREE from 'three';
import {createCoreComposition} from './core-composition.js?art=37a';
import {regions,regionForBuilding,exploreURL} from './regions.js?art=37a';
import {createArtMaterials,populatePark} from './art-direction.js?art=37a';
import {createArchitecturalSky,addArchitecturalLighting} from './architectural-lighting.js?art=37a';
import {CinematicLensPass,createFilmGrade} from './cinematic-lens.js?art=37a';
import {createParkWater} from './park-water.min.js';
import {populateUploadedGarden} from './garden-planting.js?art=37a';
import {createInteractiveLight} from './interactive-light.js?art=37a';
import {createCursorLight} from './cursor-light.js?art=37a';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {CachedAOPass as SSAOPass} from './cached-ao.js?art=37a';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (s) => document.querySelector(s);
const icons = {
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  settings:'<path d="m9 3 .7 2.4a7 7 0 0 1 4.6 0L15 3l3 1.8-1.4 2a7 7 0 0 1 2.3 4L21 11v3l-2.2.2a7 7 0 0 1-2.3 4L18 20l-3 1.5-.7-2.2a7 7 0 0 1-4.6 0L9 21.5 6 20l1.4-1.8a7 7 0 0 1-2.3-4L3 14v-3l2.1-.2a7 7 0 0 1 2.3-4L6 4.8 9 3Z"/><circle cx="12" cy="12.2" r="3"/>',
  map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16m6-14v16"/>',
  building:'<path d="M4 21V7l8-4 8 4v14M2 21h20M8 8v2m4-3v3m4-2v2M8 13v2m4-2v2m4-2v2m-6 6v-3h4v3"/>',
  layers:'<path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/>',
  focus:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="4"/>',
  water:'<path d="M3 7c3-4 3 4 6 0s3 4 6 0 3 4 6 0M3 13c3-4 3 4 6 0s3 4 6 0 3 4 6 0M3 19c3-4 3 4 6 0s3 4 6 0 3 4 6 0"/>',
  camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3V7Z"/><circle cx="12" cy="13" r="4"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',plus:'<path d="M12 4v16M4 12h16"/>',minus:'<path d="M4 12h16"/>',
  arrow:'<path d="m9 5 7 7-7 7"/>',reset:'<path d="M3 10a9 9 0 1 1 1.5 8M3 4v6h6"/>'
};
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon]}</svg>`);

const canvas=$('#scene');
const cursorLight=createCursorLight({surface:canvas,pointer:$('#cursor-light-pointer'),enabled:$('#cursor-light-toggle').checked});
$('#cursor-light-toggle').checked=cursorLight.enabled;
const budget=new RenderBudget();let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'}); }
catch(e) { $('#loading-text').textContent='浏览器未启用 WebGL，请开启硬件加速后重新载入';throw e; }
renderer.setPixelRatio(pixelRatioFor(innerWidth,innerHeight,{scale:budget.scale,max:1.35}));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#c9d9df');scene.fog=new THREE.FogExp2('#becbc5',.00013);
const camera=new THREE.PerspectiveCamera(37,innerWidth/innerHeight,1,5000);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=65;controls.maxDistance=3400;controls.maxPolarAngle=Math.PI*.465;controls.minPolarAngle=.08;controls.target.set(0,10,10);controls.screenSpacePanning=false;controls.panSpeed=.7;controls.rotateSpeed=.5;controls.autoRotateSpeed=.28;
const hemisphere=new THREE.HemisphereLight('#aac5f2','#a09184',.65);scene.add(hemisphere);
const sun=new THREE.DirectionalLight('#ffc282',5.2);sun.position.set(-360,205,650);sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-570,right:570,top:490,bottom:-490,near:10,far:1650});sun.shadow.mapSize.set(innerWidth<760?2048:3072,innerWidth<760?2048:3072);sun.shadow.bias=-.000045;sun.shadow.normalBias=.12;sun.shadow.radius=2.8;sun.shadow.intensity=.96;scene.add(sun);scene.add(sun.target);sun.target.position.set(-30,0,20);
const fill=new THREE.DirectionalLight('#bfd4f2',.65);fill.position.set(300,200,-500);scene.add(fill);
const architecturalSky=createArchitecturalSky(renderer);scene.environment=architecturalSky.get('evening');scene.environmentIntensity=.8;

const composer=new EffectComposer(renderer);
for(const target of [composer.renderTarget1,composer.renderTarget2]){
 target.depthTexture=new THREE.DepthTexture(target.width,target.height,THREE.UnsignedIntType);target.depthTexture.minFilter=target.depthTexture.magFilter=THREE.NearestFilter;target.samples=2;
}
composer.addPass(new RenderPass(scene,camera));
const ao=new SSAOPass(scene,camera,Math.round(innerWidth*.65),Math.round(innerHeight*.65),16);ao.cacheStatic=true;ao.kernelRadius=6;ao.minDistance=.001;ao.maxDistance=.025;composer.addPass(ao);
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.30,.62,1.15);composer.addPass(bloom);
// Reject non-finite HDR samples before they spread through the bloom pyramid.
bloom.materialHighPassFilter.fragmentShader=bloom.materialHighPassFilter.fragmentShader.replace('vec4 texel = texture2D( tDiffuse, vUv );',`vec4 texel = texture2D( tDiffuse, vUv );
 texel.r=(texel.r>=0.&&texel.r<=128.)?texel.r:0.;
 texel.g=(texel.g>=0.&&texel.g<=128.)?texel.g:0.;
 texel.b=(texel.b>=0.&&texel.b<=128.)?texel.b:0.;`);
const lens=new CinematicLensPass(camera);composer.addPass(lens);
const grade=createFilmGrade();composer.addPass(grade);composer.addPass(new OutputPass());
const coreComposition=createCoreComposition();
const state={loaded:false,view:'overview',season:'autumn',light:'evening',markers:false,selected:null,selectionRecord:null};
const views={
 overview:{position:[330,330,450],target:[-38,18,45],label:'中央酒店 · 核心组团',portrait:{position:[250,290,420],target:[-56,20,46],label:'中央酒店 · 核心组团'}},
 offices:{position:[390,215,365],target:[157,15,184],label:'卫星研发区'},
 hotel:{position:[180,145,240],target:[-55,22,25],label:'卫星人才社区'},
 apartments:{position:[-320,240,460],target:[-54,19,244],label:'空间数据应用区'},
 courtyard:{position:[199,109,141],target:[114,19,4],label:'光影特写'},
 water:{position:[36,51,-288],target:[-31,1,-178],label:'水系近景'},
 garden:{position:[161,12,103],target:[145,.50,86],label:'花园近景'},
 trees:{position:[176,18,112],target:[154.8,1.9,137.4],label:'林荫近景'},
 foliage:{position:[160,14,106],target:[143.335,5.6,85.697],label:'树冠光影'}
};
const landmarks=regions.map(r=>({title:r.title,position:r.anchor,ground:[r.anchor[0],Math.max(5,r.anchor[1]*.48),r.anchor[2]],description:r.summary,camera:[r.anchor[0]+150,r.anchor[1]+140,r.anchor[2]+180]}));

let parkDetail,town,flight=null,lastTime=performance.now(),lastMapTime=0,toastTimer,renderCount=0;
const artMaterials=createArtMaterials();const matCache=artMaterials.cache,glassMaterials=[];let parkArt=null,architectureLights=null,parkWater=null,uploadedGarden=null,interactionLight=null;const originalAORender=ao.render.bind(ao);ao.render=(...args)=>{const excluded=[...(parkArt?.aoExcluded??[]),...(uploadedGarden?.aoExcluded??[]),...(parkWater?.meshes??[]),...(architectureLights?[architectureLights.group]:[]),...(interactionLight?[interactionLight.group]:[])];const visibility=excluded.map(o=>o.visible);excluded.forEach(o=>o.visible=false);try{return originalAORender(...args);}finally{excluded.forEach((o,i)=>o.visible=visibility[i]);}};
const grassNames=new Set(['*4','*5','*6','*9','*18','*19','*20','*24','*26','*28','*32','*41','*48','*66','[Vegetation Grass Artificial]','[Vegetation Grass]2','自定义 (1)']);
const glassNames=new Set(['*11','*12','*25','*29','*38','*65','_9U)HQBFXUM5HCINFK2_Y(3','Material.002','sqbl','Enscape','Enscape (1)']);
function remapMaterial(source){const m=artMaterials.material(source);if(m.userData.glass){m.polygonOffset=true;m.polygonOffsetFactor=-.5;m.polygonOffsetUnits=-1;}if(m.userData.glass&&!glassMaterials.includes(m))glassMaterials.push(m);return m;}
function seeded(seed=7351){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const random=seeded();
function grassTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const cx=c.getContext('2d');cx.fillStyle='#82926c';cx.fillRect(0,0,256,256);
 for(let i=0;i<15000;i++){const x=random()*256,y=random()*256;cx.fillStyle=random()>.5?'#a3ae8522':'#45582b1b';cx.fillRect(x,y,random()*4+1,random()*3+1);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(110,110);t.anisotropy=4;return t;
}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(7000,7000),new THREE.MeshStandardMaterial({map:grassTexture(),color:'#c0c7a5',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-6.65;ground.receiveShadow=true;scene.add(ground);

const mapCanvas=$('#map-canvas'),mapContext=mapCanvas.getContext('2d');let mapImage=null;const mapRange=530;
function captureMinimap(){
 const mini=new THREE.OrthographicCamera(-mapRange,mapRange,mapRange,-mapRange,1,1500);mini.position.set(0,1050,0);mini.up.set(0,0,-1);mini.lookAt(0,0,0);
 const w=innerWidth,h=innerHeight;renderer.setPixelRatio(1);renderer.setSize(400,400,false);renderer.render(scene,mini);mapImage=new Image();mapImage.src=renderer.domElement.toDataURL('image/png');mapImage.onload=drawMinimap;
 renderer.setPixelRatio(pixelRatioFor(innerWidth,innerHeight,{scale:budget.scale,max:1.35}));renderer.setSize(w,h,false);composer.setSize(w,h);ao.setSize(Math.round(w*.65),Math.round(h*.65));
}
function drawMinimap(){
 const ctx=mapContext;ctx.clearRect(0,0,400,400);if(mapImage?.complete)ctx.drawImage(mapImage,0,0,400,400);else {ctx.fillStyle='#9da989';ctx.fillRect(0,0,400,400);}
 const px=200+controls.target.x/mapRange*200,py=200+controls.target.z/mapRange*200;
 const angle=Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z);
 ctx.save();ctx.translate(px,py);ctx.rotate(-angle);ctx.fillStyle='#1de3e935';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-48,-75);ctx.quadraticCurveTo(0,-90,48,-75);ctx.closePath();ctx.fill();ctx.shadowColor='#06cddc';ctx.shadowBlur=12;ctx.fillStyle='#00b8d1';ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(12,11);ctx.lineTo(0,6);ctx.lineTo(-12,11);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 if(state.markers)landmarks.forEach((p,i)=>{const x=200+p.ground[0]/mapRange*200,y=200+p.ground[2]/mapRange*200;ctx.fillStyle='#ff9726';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.stroke();});
}
mapCanvas.addEventListener('click',e=>{if(!state.loaded)return;const rect=mapCanvas.getBoundingClientRect();const x=((e.clientX-rect.left)/rect.width*2-1)*mapRange,z=((e.clientY-rect.top)/rect.height*2-1)*mapRange;const p=new THREE.Vector3(x,10,z);const offset=camera.position.clone().sub(controls.target).setLength(320);flyTo(p.clone().add(offset),p,'自由浏览');});
const markerElements=landmarks.map((p,i)=>{const b=document.createElement('button');b.className='landmark';b.setAttribute('aria-label',p.title);b.innerHTML=`<span class="pin-number">${i+1}</span><span class="pin-name">${p.title}</span>`;b.addEventListener('click',()=>selectBuilding(i));$('#landmarks').appendChild(b);return b;});
function updateMarkers(){
 $('#landmarks').style.display=state.markers?'block':'none';if(!state.markers)return;
 const forward=new THREE.Vector3();camera.getWorldDirection(forward);
 landmarks.forEach((p,i)=>{const v=new THREE.Vector3(...p.position),dir=v.clone().sub(camera.position);v.project(camera);const b=markerElements[i];const visible=forward.dot(dir)>0&&Math.abs(v.x)<.97&&Math.abs(v.y)<.92;b.style.display=visible?'flex':'none';b.style.left=`${(v.x*.5+.5)*innerWidth}px`;b.style.top=`${(-v.y*.5+.5)*innerHeight}px`;b.classList.toggle('selected',state.selected===i);});
}
function clearBuilding(){state.selected=null;state.selectionRecord=null;$('#building-card').classList.add('hidden');interactionLight?.clear();}
function selectBuilding(i,record=null){townAudio.effect('discover');
 const region=regions[i]??regions[3];state.selected=i;state.selectionRecord=record;
 if(!record){const footprint=interactionLight?.buildings.find(b=>region.buildings.includes(b.id));if(footprint)interactionLight.select(footprint);}
 const context=record&&!regionForBuilding(record.id);
 $('#building-number').textContent=String(i+1).padStart(2,'0');$('#building-title').textContent=context?'周边公寓 · 园区配套':region.title;$('#building-description').textContent=context?'这里是核心分区之外的周边公寓。进入人才社区，可了解园区的居住、运动与生活配套。':region.summary;
 $('#building-card-tags').innerHTML=(context?['周边配套','居住生活']:region.tags).map(t=>`<span>${t}</span>`).join('');$('#building-card-metrics').innerHTML=(context?[]:region.metrics).map(([v,l])=>`<div><b>${v}</b><small>${l}</small></div>`).join('');
 $('#building-card').classList.remove('hidden');$('#settings').classList.add('hidden');$('#region-directory').classList.add('hidden');$('#regions-button').setAttribute('aria-expanded','false');
}
$('#close-card').addEventListener('click',clearBuilding);
$('#visit-building').addEventListener('click',()=>{if(state.selected===null)return;location.href=exploreURL(regions[state.selected],regionForBuilding(state.selectionRecord?.id)?state.selectionRecord?.id:null);});
$('#approach-building').addEventListener('click',()=>{if(state.selected===null)return;const p=landmarks[state.selected],r=state.selectionRecord;if(r){const target=new THREE.Vector3(...r.center);const span=Math.max(...r.footprint.map(([x,z])=>Math.hypot(x-target.x,z-target.z)));const offset=camera.position.clone().sub(controls.target).setLength(Math.max(130,span*3.8));flyTo(target.clone().add(offset),target,r.title);}else flyTo(new THREE.Vector3(...p.camera),new THREE.Vector3(...p.ground),p.title);});
$('#region-entries').innerHTML=regions.map((r,i)=>`<a href="${exploreURL(r)}"><span class="region-index" style="color:${r.color}">${String(i+1).padStart(2,'0')}</span><span><b>${r.title}</b><small>${r.tags.join(' · ')}</small></span><span class="region-arrow">↗</span></a>`).join('');
$('#loading-regions').innerHTML=regions.map(r=>`<a href="${exploreURL(r)}">${r.title} ↗</a>`).join('');
$('#regions-button').addEventListener('click',()=>{const open=$('#region-directory').classList.toggle('hidden')===false;$('#regions-button').setAttribute('aria-expanded',String(open));$('#settings').classList.add('hidden');clearBuilding();});
$('#close-regions').addEventListener('click',()=>{$('#region-directory').classList.add('hidden');$('#regions-button').setAttribute('aria-expanded','false');});

function flyTo(position,target,label){canvas.setAttribute('aria-busy','true');flight={from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone(),start:performance.now(),duration:1600};controls.autoRotate=false;$('#orbit-toggle').checked=false;$('#view-label').textContent=label;}
function setView(name,instant=false){const v=name==='overview'&&camera.aspect<.95?views.overview.portrait:views[name];state.view=name;coreComposition.setView(name);camera.near=['garden','trees','foliage'].includes(name)?.4:name==='overview'?4:1.2;camera.updateProjectionMatrix();controls.minDistance=['garden','trees','foliage'].includes(name)?10:65;focusSunShadows();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('#view-label').textContent=v.label;clearBuilding();if(['garden','trees','foliage'].includes(name))$('#settings').classList.add('hidden');
 const position=new THREE.Vector3(...v.position),target=new THREE.Vector3(...v.target);
 if(['overview','hotel','courtyard','water','garden','trees','foliage'].includes(name)){const factor=Math.max(1,(name==='overview'?(camera.aspect<.95?1:1.36):name==='hotel'?.92:name==='water'?.82:['garden','trees','foliage'].includes(name)?.74:.65)/camera.aspect);position.sub(target).multiplyScalar(factor).add(target);}
 
 if(instant){camera.position.copy(position);controls.target.copy(target);controls.update();}else flyTo(position,target,v.label);
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('#brand-home').addEventListener('click',()=>setView('overview'));$('#reset-view').addEventListener('click',()=>setView('overview'));
controls.addEventListener('start',()=>{flight=null;canvas.setAttribute('aria-busy','false');});
function toast(message){$('#toast').textContent=message;$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),2600);}
function focusSunShadows(){
 const near=['garden','trees','foliage'].includes(state.view),base=new THREE.Vector3(-30,0,20),offset=new THREE.Vector3(-360,state.light==='evening'?225:390,650).sub(base),focus=near?new THREE.Vector3(...views[state.view].target):base;
 sun.target.position.copy(focus);sun.position.copy(focus).add(offset);
 Object.assign(sun.shadow.camera,{left:near?-95:-570,right:near?95:570,top:near?95:490,bottom:near?-95:-490});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=near?-.000006:-.000045;sun.shadow.normalBias=near?.035:.12;sun.shadow.radius=near?1.8:2.8;renderer.shadowMap.needsUpdate=true;parkWater?.setLight(state.light);
}
function setLight(mode){
 renderer.shadowMap.needsUpdate=true;state.light=mode;const evening=mode==='evening';
 sun.color.set(evening?'#ffdaa9':'#ffe9ce');sun.intensity=evening?7.0:5.2;sun.position.set(-360,evening?225:390,650);
 focusSunShadows();
 hemisphere.intensity=evening?1.02:1.16;fill.intensity=evening?.50:.66;
 scene.environment=architecturalSky.get(mode);scene.environmentIntensity=evening?.50:.58;
 scene.background.set(evening?'#e7d8c3':'#d4e3eb');scene.fog.color.set(evening?'#edddc6':'#d2ded9');scene.fog.density=evening?.00010:.000085;
 renderer.toneMappingExposure=evening?1.38:1.16;grade.uniforms.uWarmth.value=evening?.032:.008;grade.uniforms.uGlow.value=evening?.039:.014;grade.uniforms.uShadowLift.value=evening?.006:.004;bloom.strength=evening?.30:.15;bloom.radius=.56;bloom.threshold=1.25;
 glassMaterials.forEach(m=>m.emissiveIntensity=evening?2.1:.24);architectureLights?.setLight(mode);parkArt?.setLight(mode);parkWater?.setLight(mode);
 $('#time-label').textContent=evening?'17:40':'16:20';$('#weather-label').textContent=evening?'夕阳 · 晴':'秋日 · 晴';
 document.querySelectorAll('[data-light]').forEach(b=>b.classList.toggle('active',b.dataset.light===mode));if(state.loaded)captureMinimap();
}
function setSeason(season){ao.invalidate();renderer.shadowMap.needsUpdate=true;state.season=season;parkArt?.setSeason(season);uploadedGarden?.setSeason(season);matCache.forEach(m=>{if(m.userData.grass)m.color.set(season==='autumn'?'#d2d6a5':'#b9cb97');});document.querySelectorAll('[data-season]').forEach(b=>b.classList.toggle('active',b.dataset.season===season));if(state.loaded)captureMinimap();}
$('#light-toggle').addEventListener('click',()=>setLight(state.light==='afternoon'?'evening':'afternoon'));document.querySelectorAll('[data-light]').forEach(b=>b.addEventListener('click',()=>setLight(b.dataset.light)));document.querySelectorAll('[data-season]').forEach(b=>b.addEventListener('click',()=>setSeason(b.dataset.season)));
$('#settings-button').addEventListener('click',()=>{$('#settings').classList.toggle('hidden');$('#building-card').classList.add('hidden');});$('#close-settings').addEventListener('click',()=>$('#settings').classList.add('hidden'));
$('#cursor-light-toggle').addEventListener('change',e=>cursorLight.setEnabled(e.target.checked));
$('#interaction-toggle').addEventListener('change',e=>interactionLight?.setEnabled(e.target.checked));
$('#dof-toggle').addEventListener('change',e=>{lens.enabled=e.target.checked;});
$('#water-motion-toggle').addEventListener('change',e=>{parkWater?.setPaused(!e.target.checked);});
$('#markers-toggle').addEventListener('change',e=>{state.markers=e.target.checked;drawMinimap();});$('#orbit-toggle').addEventListener('change',e=>{flight=null;controls.autoRotate=e.target.checked;});$('#shadow-toggle').addEventListener('change',e=>{renderer.shadowMap.enabled=e.target.checked;renderer.shadowMap.needsUpdate=true;scene.traverse(m=>{if(m.isMesh&&m.material){const ms=Array.isArray(m.material)?m.material:[m.material];ms.forEach(mat=>mat.needsUpdate=true);}});captureMinimap();});
function zoom(amount){const direction=camera.position.clone().sub(controls.target);direction.setLength(THREE.MathUtils.clamp(direction.length()*amount,controls.minDistance,controls.maxDistance));flyTo(controls.target.clone().add(direction),controls.target.clone(),$('#view-label').textContent);}
$('#zoom-in').addEventListener('click',()=>zoom(.77));$('#zoom-out').addEventListener('click',()=>zoom(1.3));
$('#screenshot-button').addEventListener('click',()=>{if(!state.loaded)return;composer.render();canvas.toBlob(blob=>{if(!blob){toast('画面生成失败，请重试');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`北京卫星小镇-${views[state.view]?.label??'建筑'}-${state.light}.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('已生成 PNG，可在浏览器下载列表查看');},'image/png');});
const raycaster=new THREE.Raycaster();
function approachSurface(hit,e){
 if(!hit&&town){const p=new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(p,camera);const exact=raycaster.intersectObject(town,true)[0];if(exact)hit={point:exact.point};}
 if(hit){const target=hit.point.clone();const dir=camera.position.clone().sub(controls.target).setLength(200);controls.minDistance=65;flyTo(target.clone().add(dir),target,hit.record?.title??'自由浏览');}
}
const keys=new Set();addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&!e.target.matches('input,button')){keys.add(e.code);e.preventDefault();flight=null;}if(e.code==='Escape'){$('#settings').classList.add('hidden');$('#region-directory').classList.add('hidden');clearBuilding();}});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
function resize(adaptive=false){renderer.setPixelRatio(pixelRatioFor(innerWidth,innerHeight,{scale:budget.scale,max:1.35}));composer.setPixelRatio(renderer.getPixelRatio());camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);ao.setSize(Math.round(innerWidth*.6*budget.scale),Math.round(innerHeight*.6*budget.scale));parkWater?.invalidate();if(adaptive!==true&&['overview','hotel','courtyard','water','garden','trees','foliage'].includes(state.view)&&!flight)setView(state.view,true);}
addEventListener('resize',resize);setView('overview',true);

async function loadTown(){
 try{
  const info=await fetch('./assets/model-info.json?asset=34a').then(r=>r.json());const initial=info.overview??info;const [responses,landscape]=await Promise.all([Promise.all(initial.modelFiles.map(name=>fetch('./assets/'+name))),fetch('./assets/landscape.json').then(r=>{if(!r.ok)throw new Error('Landscape file missing');return r.json();})]);
  if(responses.some(r=>!r.ok))throw new Error('模型分块请求失败');
  const total=initial.compressedBytes;const chunks=[];let loaded=0;
  for(const response of responses){const reader=response.body.getReader();while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.byteLength;$('#loading-progress').style.width=`${Math.min(78,loaded/total*78)}%`;$('#loading-text').textContent=`正在载入园区建筑 · ${Math.min(99,Math.round(loaded/total*100))}%`;}}
  $('#loading-text').textContent='正在构建立面与秋日景观';
  const packed=new Blob(chunks);const buffer=await new Response(packed.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const gltf=await new GLTFLoader().parseAsync(buffer,'./assets/');await yieldToBrowser();town=gltf.scene;town.name='原始 Blender 园区建筑';town.traverse(o=>{if(o.isMesh){o.material=remapMaterial(o.material);artMaterials.setUV(o);o.castShadow=true;o.receiveShadow=true;}});scene.add(town);if(info.overview)parkDetail=createParkDetail({town,info,materials:artMaterials,onChange:()=>{renderer.shadowMap.needsUpdate=true;ao.invalidate();parkWater?.invalidate();}});
  $('#loading-progress').style.width='88%';$('#loading-text').textContent='正在布置七色花坛、附件树木与夕阳反射';parkArt=await populatePark({scene,renderer,camera,landscape,ground,materials:artMaterials});await yieldToBrowser();uploadedGarden=await populateUploadedGarden({scene,camera});uploadedGarden.setSeason(state.season);await yieldToBrowser();architectureLights=await addArchitecturalLighting(scene);parkWater=await createParkWater({scene,renderer,camera,town,sun});interactionLight=await createInteractiveLight({scene,camera,canvas,materials:artMaterials,describeBuilding:record=>{const r=regionForBuilding(record.id);return r?r.title+' · 楼宇 '+String(r.buildings.indexOf(record.id)+1).padStart(2,'0'):'周边公寓 · 配套空间';},onSelect:(record,options)=>{const r=regionForBuilding(record.id);if(r&&!options?.approach){location.href=exploreURL(r,record.id);}else selectBuilding(r?regions.indexOf(r):3,record);},onClear:clearBuilding,onApproach:approachSurface});interactionLight.setEnabled($('#interaction-toggle').checked);coreComposition.install(scene);state.treeCount=parkArt.treeCount;state.gardenInfo=uploadedGarden.info;setLight(state.light);renderer.shadowMap.needsUpdate=true;
  ao.invalidate();state.loaded=true;state.modelInfo=info;captureMinimap();composer.render();$('#loading-progress').style.width='100%';$('#loading').style.opacity='0';setTimeout(()=>$('#loading').classList.add('hidden'),700);
  // Exposes review diagnostics without putting implementation details in the interface.
  window.__town={state,scene,camera,controls,renderer,composer,setView,setLight,setSeason,landmarks,getDiagnostics:()=>({loaded:state.loaded,sourceObjects:info.sourceObjects,triangles:info.triangles,drawBatches:info.drawBatches,trees:state.treeCount,view:state.view,light:state.light,season:state.season,drawCalls:renderer.info.render.calls,renderTriangles:renderer.info.render.triangles})};
 }catch(e){console.error('Town loading error',e);$('#loading-text').textContent=`载入失败：${e.message}`;$('#retry-button').classList.remove('hidden');$('#loading-progress').style.width='0%';}
}
$('#retry-button').addEventListener('click',()=>location.reload());loadTown();
function animate(now){
 const elapsed=Math.min((now-lastTime)/1000,.25),dt=Math.min(elapsed,.05);lastTime=now;
 if(document.hidden)return;
 if(flight){let t=THREE.MathUtils.clamp((now-flight.start)/flight.duration,0,1);t=t*t*(3-2*t);camera.position.lerpVectors(flight.from,flight.to,t);controls.target.lerpVectors(flight.targetFrom,flight.targetTo,t);if(t>=1){flight=null;canvas.setAttribute('aria-busy','false');}}
 if(keys.size){const f=camera.position.clone().sub(controls.target);f.y=0;f.normalize();const right=new THREE.Vector3(f.z,0,-f.x);const move=new THREE.Vector3();if(keys.has('KeyW')||keys.has('ArrowUp'))move.sub(f);if(keys.has('KeyS')||keys.has('ArrowDown'))move.add(f);if(keys.has('KeyA')||keys.has('ArrowLeft'))move.sub(right);if(keys.has('KeyD')||keys.has('ArrowRight'))move.add(right);move.normalize().multiplyScalar(dt*85);if(Math.abs(controls.target.x+move.x)<600&&Math.abs(controls.target.z+move.z)<550){controls.target.add(move);camera.position.add(move);}}
 const cameraChanged=controls.update(dt);if(cameraChanged)updateMarkers();if(cameraChanged&&now-lastMapTime>100){drawMinimap();lastMapTime=now;}if(state.loaded){canvas.dataset.detail=parkDetail?.update(controls.getDistance(),!!flight||keys.size>0,now)??'full';if(budget.sample(now))resize(true);artMaterials.update(now/1000);const treeShadowChanged=parkArt?.update(camera,now/1000);if(treeShadowChanged){renderer.shadowMap.needsUpdate=true;ao.invalidate();}const plantedShadowChanged=uploadedGarden?.update(camera,now/1000);if(plantedShadowChanged&&['garden','trees','foliage'].includes(state.view))renderer.shadowMap.needsUpdate=true;parkWater?.update(elapsed);interactionLight?.update(now/1000,dt,!!flight||keys.size>0||controls.autoRotate);lens.updateFocus(controls.target,state.view,interactionLight?.getFocus(),dt);composer.render();renderCount++;canvas.dataset.renders=String(renderCount);canvas.dataset.renderScale=String(budget.scale);}
}
renderer.setAnimationLoop(animate);
addEventListener('visibilitychange',()=>{lastTime=performance.now();budget.reset();renderer.setAnimationLoop(document.hidden?null:animate);});
addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);cursorLight.dispose();parkDetail?.dispose();controls.dispose();composer.passes.forEach(p=>p.dispose?.());composer.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.isMesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});parkArt?.dispose();uploadedGarden?.dispose();parkWater?.dispose();interactionLight?.dispose();lens.dispose();grade.dispose();architectureLights?.dispose();artMaterials.dispose();architecturalSky.dispose();renderer.dispose();});

addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
