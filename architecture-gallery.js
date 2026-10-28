import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createRegionMaterials} from './region-materials.js?art=38a';
import {createArchitecturalSky} from './architectural-lighting.js?art=38a';
import {createSurfaceFeedback} from './surface-feedback.js?art=38a';
import {createArchitectureTour} from './architecture-tour.js?art=38a';
import {heroBuilding} from './architecture-details.js?art=38a';
import {regions,exploreURL} from './regions.js?art=38a';

// One GPU context serves the visible cards and the enlarged viewer. Each card
// retains its last rendered frame; idle and off-screen cards do not render.
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer:fine)');
const assets=new Map(),views=new Set(),loader=new GLTFLoader();
let renderer,sky,finishes,composer,beauty,ao,trees,frame=0,dead=false,modalView=null,returnFocus=null;
let activeLoads=0;const loadQueue=[];
const byId=id=>regions.find(r=>r.id===id);

export function architectureCard(id,number,status=''){
 const r=byId(id);
 return `<div class="architecture-view" data-architecture="${id}" data-state="waiting">
 <canvas tabindex="0" role="img" aria-label="${r.title}三维建筑，拖动或方向键旋转，按回车放大" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter"></canvas>
 <div class="architecture-label"><span>${number}</span><span class="architecture-live"><i></i> 3D 建筑</span></div>
 ${status?`<span class="architecture-status ${status}">${status==='done'?'✦ 已点亮':status==='ready'?'下一站 · 可挑战':'待解锁'}</span>`:''}
 <div class="architecture-loading" role="status"><span class="architecture-spinner"></span><span>正在准备建筑</span><button type="button" data-architecture-retry hidden>重新加载</button></div>
 <div class="architecture-tools"><span>轻点探索 · 拖动旋转</span><div><button type="button" data-architecture-reset aria-label="复位${r.title}视角" title="复位视角">↺</button><button type="button" data-architecture-expand aria-label="放大查看${r.title}">放大查看 ↗</button></div></div>
 </div>`;
}

function getRenderer(){
 if(renderer)return renderer;
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.shadowMap.autoUpdate=false;
 sky=createArchitecturalSky(renderer);finishes=createRegionMaterials();
 const placeholder=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.05,150);
 composer=new EffectComposer(renderer);composer.renderTarget1.samples=composer.renderTarget2.samples=2;
 beauty=new RenderPass(placeholder,camera);composer.addPass(beauty);
 ao=new SSAOPass(placeholder,camera,512,512,16);ao.kernelRadius=.25;ao.minDistance=.00015;ao.maxDistance=.008;composer.addPass(ao);composer.addPass(new OutputPass());
 const aoRender=ao.render.bind(ao);ao.render=(...args)=>{const foliage=[];ao.scene.traverse(o=>{if(o.isMesh&&o.visible&&o.material.name==='foliage'){foliage.push(o);o.visible=false;}});try{aoRender(...args);}finally{foliage.forEach(o=>o.visible=true);}};
 trees=loadTrees();
 renderer.domElement.addEventListener('webglcontextlost',e=>{
  e.preventDefault();cancelAnimationFrame(frame);frame=0;
  for(const v of views)fail(v,'显示已暂停，请重新加载');
 });
 renderer.domElement.addEventListener('webglcontextrestored',()=>{
  for(const v of views){v.host.dataset.state=v.scene?'ready':'waiting';v.dirty=true;v.shadowDirty=true;}
  invalidate();
 });
 return renderer;
}
async function loadTrees(){
 try{const [{scene},alpha]=await Promise.all([loader.loadAsync('./assets/detail/urban-tree.glb'),new THREE.TextureLoader().loadAsync('./assets/detail/tree/leaves-alpha.png')]);
 alpha.flipY=false;scene.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(scene),c=b.getCenter(new THREE.Vector3()),h=b.max.y-b.min.y;
 const template=new THREE.Group();scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);g.translate(-c.x,-b.min.y,-c.z);g.scale(1/h,1/h,1/h);const m=o.material.clone();if(m.name==='foliage'){m.alphaMap=alpha;m.alphaTest=.35;m.color.set('#a1a78a');m.side=THREE.DoubleSide;}m.envMapIntensity=.45;const t=new THREE.Mesh(g,m);t.castShadow=t.receiveShadow=true;template.add(t);});return template;
 }catch{return null;}
}
function loadAsset(id){
 if(assets.has(id))return assets.get(id);
 const job=new Promise((resolve,reject)=>{loadQueue.push({id,resolve,reject});pumpLoads();});
 assets.set(id,job);job.catch(()=>assets.delete(id));return job;
}
function pumpLoads(){
 while(activeLoads<2&&loadQueue.length){
  const job=loadQueue.shift();activeLoads++;
  (async()=>{
   const response=await fetch(`./assets/explore/${job.id}.glb.gz?asset=19a`);
   if(!response.ok)throw new Error('Model request failed');
   const buffer=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
   const {scene}=await loader.parseAsync(buffer,'./assets/');getRenderer();
   scene.traverse(o=>{if(!o.isMesh)return;
    if(o.material.name==='*28'){o.visible=false;return;}
    o.material=finishes.material(o.material);
    if(o.material.userData.glass){o.material.color.set('#53727b');o.material.metalness=.22;o.material.clearcoat=.35;o.material.emissiveIntensity=.36;o.material.roughness=.30;o.material.envMapIntensity=.95;}
    else if(o.material.userData.roofGarden)o.material.color.set('#74816a');
    o.castShadow=o.receiveShadow=true;
   });
   scene.updateMatrixWorld(true);
   const bounds=new THREE.Box3();scene.traverse(o=>{if(o.isMesh&&o.visible)bounds.expandByObject(o);});
   return {scene,bounds,tree:await trees};
  })().then(job.resolve,job.reject).finally(()=>{activeLoads--;pumpLoads();});
 }
}
function mesh(parent,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function createScene(asset){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#dedbd2');scene.environment=sky.get('evening');scene.environmentIntensity=.40;
 const group=new THREE.Group();scene.add(group);
 const size=asset.bounds.getSize(new THREE.Vector3()),center=asset.bounds.getCenter(new THREE.Vector3()),scale=10/Math.max(size.x,size.z,size.y);
 const model=asset.scene.clone(true);model.scale.setScalar(scale);model.position.set(-center.x*scale,-asset.bounds.min.y*scale,-center.z*scale);group.add(model);
 const sx=size.x*scale,sz=size.z*scale,h=size.y*scale,pw=sx+1.6,pd=sz+1.6;
 const stone=new THREE.MeshStandardMaterial({color:'#d2c7b5',roughness:.72,metalness:.03});
 stone.onBeforeCompile=s=>{s.vertexShader='varying vec3 stonePosition;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstonePosition=position;');s.fragmentShader='varying vec3 stonePosition;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=fract(sin(dot(floor(stonePosition.xz*180.),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=.97+grain*.06;');};
 const border=new THREE.MeshStandardMaterial({color:'#b4ada0',roughness:.55,metalness:.12});
 const dark=new THREE.MeshStandardMaterial({color:'#4c6262',roughness:.4,metalness:.45});
 const wood=new THREE.MeshStandardMaterial({color:'#a99674',roughness:.75});
 const planted=new THREE.MeshStandardMaterial({color:'#7b876c',roughness:.92});
 const led=new THREE.MeshStandardMaterial({color:'#fff0ce',emissive:'#ffd99d',emissiveIntensity:.8});
 mesh(group,new RoundedBoxGeometry(pw,.18,pd,2,.05),border,0,-.14);
 mesh(group,new RoundedBoxGeometry(pw-.08,.08,pd-.08,2,.025),stone,0,-.025);
 // Four low beds and only two widely separated trees keep every facade open.
 for(const x of [-1,1])for(const z of [-1,1]){
  mesh(group,new RoundedBoxGeometry(.76,.12,.32,2,.04),border,x*(pw/2-.7),.055,z*(pd/2-.4));
  mesh(group,new RoundedBoxGeometry(.68,.08,.24,2,.04),planted,x*(pw/2-.7),.15,z*(pd/2-.4));
 }
 for(const x of [-1,1]){
  const z=pd/2-.28;
  mesh(group,new THREE.BoxGeometry(.7,.035,.16),wood,x*(pw/2-1.8),.17,z);
  for(const offset of [-.24,.24])mesh(group,new THREE.BoxGeometry(.04,.16,.10),dark,x*(pw/2-1.8)+offset,.08,z);
  mesh(group,new THREE.CylinderGeometry(.018,.024,.36,8),dark,x*(pw/2-.3),.18,z);
  mesh(group,new THREE.CylinderGeometry(.028,.028,.09,8),led,x*(pw/2-.3),.4,z);
 }
 if(asset.tree)for(const sign of [-1,1]){
  const t=asset.tree.clone(true);t.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=o.material.clone();}});
  t.position.set(sign*(pw/2-.7),.17,-(pd/2-.4));t.scale.setScalar(Math.min(1.5,Math.max(.95,h*.3)));t.rotation.y=sign*.6;group.add(t);
 }
 const lines=[];for(let x=-pw/2+.8;x<pw/2;x+=.8)lines.push(x,.019,-pd/2,x,.019,pd/2);
 for(let z=-pd/2+.8;z<pd/2;z+=.8)lines.push(-pw/2,.019,z,pw/2,.019,z);
 const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
 group.add(new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({color:'#a8a69d',transparent:true,opacity:.2})));
 const ground=mesh(scene,new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#d5d1c7',roughness:.95}),0,-.26);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
 const ambient=new THREE.HemisphereLight('#d6e7f5','#a79883',.75);scene.add(ambient);
 const sun=new THREE.DirectionalLight('#ffdb9f',3.7);sun.position.set(-9,12,9);sun.castShadow=true;
 sun.shadow.mapSize.set(innerWidth<760?1024:1536,innerWidth<760?1024:1536);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:50});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);
 const fill=new THREE.DirectionalLight('#bfd9ea',.7);fill.position.set(9,5,-8);scene.add(fill);
 const cursor=new THREE.PointLight('#fff0d2',0,30,2);cursor.position.set(0,h+2,6);scene.add(cursor);
 const bounds=new THREE.Box3(new THREE.Vector3(-pw/2,-.3,-pd/2),new THREE.Vector3(pw/2,h,pd/2));
 return {scene,group,model,bounds,height:h,sun,ambient,fill,cursor};
}
function fit(v,mode='whole',instant=false){
 if(!v.scene)return;
 v.model.traverse(o=>{if(o.isMesh&&o.userData.buildingId&&o.material.name!=='*28')o.visible=mode==='whole'||Number(o.userData.buildingId)===(v.selectedBuilding??heroBuilding[v.id]);});
 if(v===modalView){dialog.querySelector('.architecture-story').href=exploreURL(byId(v.id))+'&from=gallery&building='+(v.selectedBuilding??heroBuilding[v.id]);}if(v===modalView)dialog.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===mode)));
 const b=mode==='whole'?v.bounds:buildingBox(v),sz=b.getSize(new THREE.Vector3()),target=b.getCenter(new THREE.Vector3());target.y=mode==='whole'?v.height*.20:mode==='entry'?b.min.y+sz.y*.15:mode==='roof'?b.max.y:target.y;
 const dir=(mode==='roof'?new THREE.Vector3(.5,2.6,1):mode==='entry'?new THREE.Vector3(.3,.25,1.6):mode==='facade'?new THREE.Vector3(.35,.48,1.6):new THREE.Vector3(1.15,1.05,1.5)).normalize();
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right);
 const tan=Math.tan(THREE.MathUtils.degToRad(v.camera.fov*.5));let dist=0;
 for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
  const q=new THREE.Vector3(x,y,z).sub(target),d=q.dot(dir);
  dist=Math.max(dist,Math.abs(q.dot(right))/(tan*v.camera.aspect*.92)+d,Math.abs(q.dot(up))/(tan*.93)+d);
 }
 const destination=target.clone().addScaledVector(dir,dist*(mode==='whole'?1:mode==='entry'?.95:1.10));
 if(instant||reduce.matches){v.camera.position.copy(destination);v.controls.target.copy(target);v.controls.update();}else v.flight={from:v.camera.position.clone(),to:destination,fromTarget:v.controls.target.clone(),toTarget:target,age:0};v.controls.saveState();
 v.tour?.rebuild();v.group.rotation.y=0;v.look=0;v.auto=false;v.controls.autoRotate=false;
 v.host.dataset.view=mode;v.host.dataset.rotation='0';v.shadowDirty=true;v.dirty=true;v.settle=2;invalidate();
}
function buildingBox(v){const box=new THREE.Box3();v.model.updateWorldMatrix(true,true);v.model.traverse(o=>{if(!o.isMesh||!o.visible)return;let a=o;while(a&&!a.userData.buildingId)a=a.parent;if(Number(a?.userData.buildingId)===(v.selectedBuilding??heroBuilding[v.id]))box.expandByObject(o);});return box.isEmpty()?new THREE.Box3().setFromObject(v.model):box;}
function invalidate(){if(!frame&&!dead&&!document.hidden)frame=requestAnimationFrame(tick);}
let lastFrame=performance.now(),bufferWidth=0,bufferHeight=0;
function tick(now){
 const dt=Math.min(.05,(now-lastFrame)/1000||.016);lastFrame=now;
 frame=0;if(dead||document.hidden)return;let again=false,rendered=false;
 for(const v of views){
  if(!v.host.isConnected||!v.scene||!v.visible||v.host.closest('[hidden]'))continue;
  if(dialog.open&&v!==modalView)continue;
  if(!v.dirty&&!v.settle&&!v.auto&&!v.flight&&!v.feedbackActive)continue;
  if(rendered){again=true;continue;}
  if(v.settle)v.settle--;
  if(v.flight){const f=v.flight;f.age+=dt;const t=THREE.MathUtils.smoothstep(f.age,0,.85);v.camera.position.lerpVectors(f.from,f.to,t);v.controls.target.lerpVectors(f.fromTarget,f.toTarget,t);if(t===1)v.flight=null;}
  v.controls.update();
  const turn=v.hover&&!v.dragging&&!reduce.matches?v.look:0;
  const previous=v.group.rotation.y;v.group.rotation.y=THREE.MathUtils.lerp(previous,turn,.16);
  if(Math.abs(previous-v.group.rotation.y)>.0002)v.shadowDirty=true;
  const feedbackActive=v.feedback?.update(dt,now);v.cursor.intensity=0;v.tour?.update();
  const r=v.host.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,v===modalView?1.5:1.25),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
  if(!r.width||!r.height)continue;
  if(v.canvas.width!==w||v.canvas.height!==h){v.canvas.width=w;v.canvas.height=h;v.camera.aspect=w/h;v.camera.updateProjectionMatrix();}
  if(bufferWidth!==w||bufferHeight!==h){renderer.setSize(w,h,false);composer.setSize(w,h);bufferWidth=w;bufferHeight=h;}renderer.shadowMap.needsUpdate=v.shadowDirty;
  beauty.scene=ao.scene=v.scene;beauty.camera=ao.camera=v.camera;
  ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(v.camera.projectionMatrix);ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(v.camera.projectionMatrixInverse);
  composer.render();v.renders=(v.renders||0)+1;v.canvas.dataset.renders=String(v.renders);rendered=true;v.ctx.drawImage(renderer.domElement,0,0,w,h);
  v.shadowDirty=false;v.dirty=false;v.host.dataset.state='ready';
  v.host.dataset.rotation=v.camera.position.x.toFixed(3)+','+v.camera.position.z.toFixed(3);
  v.feedbackActive=feedbackActive;again ||= Boolean(v.settle||v.auto||v.flight||feedbackActive);
 }
 if(again)invalidate();
}
function fail(v,message='建筑未载入，请重试'){
 v.host.dataset.state='error';v.host.querySelector('.architecture-loading span:last-of-type').textContent=message;
 v.host.querySelector('[data-architecture-retry]').hidden=false;
}
async function start(v){
 if(v.loading||v.scene||dead)return;v.loading=true;v.host.dataset.state='loading';
 try{getRenderer();const asset=await loadAsset(v.id);if(!v.host.isConnected||dead)return;
  Object.assign(v,createScene(asset));v.camera.aspect=v.host.clientWidth/v.host.clientHeight;v.camera.updateProjectionMatrix();fit(v,'whole',true);
  v.feedback=createSurfaceFeedback({scene:v.scene,camera:v.camera,canvas:v.canvas,root:v.model,scale:10,onDirty:()=>{v.dirty=true;v.settle=2;invalidate();},onTap:h=>{if(v!==modalView){openViewer(v.id,hostTrigger(v));return;}let a=h.object;while(a&&!a.userData.buildingId)a=a.parent;v.selectedBuilding=Number(a?.userData.buildingId)||heroBuilding[v.id];v.tour.rebuild();v.tour.select('facade');}});
  if(v===modalView){v.tour=createArchitectureTour({host:v.host,content:dialog.querySelector('.architecture-detail'),camera:v.camera,root:v.model,region:byId(v.id),getBox:()=>buildingBox(v),onFocus:mode=>fit(v,mode)});if(!reduce.matches){v.camera.position.sub(v.controls.target).multiplyScalar(1.12).add(v.controls.target);fit(v);}}
  v.host.dataset.state='ready';invalidate();
 }catch(e){console.warn('Architecture gallery:',v.id,e);fail(v);}
 finally{v.loading=false;}
}
function hostTrigger(v){return v.host.querySelector('[data-architecture-expand]');}
function mount(host,{large=false}={}){
 if(host._architecture)return host._architecture;
 const canvas=host.querySelector('canvas'),camera=new THREE.PerspectiveCamera(34,1.5,.05,150);
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.1;controls.enableZoom=large;controls.enablePan=false;controls.rotateSpeed=.55;controls.autoRotateSpeed=.65;controls.minPolarAngle=.18;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=6;controls.maxDistance=55;
 canvas.style.touchAction=large?'none':'pan-y';
 const v={host,id:host.dataset.architecture,canvas,ctx:canvas.getContext('2d',{alpha:false}),camera,controls,visible:large,loading:false,dirty:true,settle:0,look:0,hover:false,dragging:false,auto:false,scene:null,shadowDirty:true};
 host._architecture=v;views.add(v);
 const dirty=()=>{v.dirty=true;v.settle=2;invalidate();};
 controls.addEventListener('change',dirty);controls.addEventListener('start',()=>{v.dragging=true;v.flight=null;v.look=0;v.auto=false;controls.autoRotate=false;if(v===modalView)dialog.querySelector('[data-view-rotate]').setAttribute('aria-pressed','false');dirty();});controls.addEventListener('end',()=>{v.dragging=false;dirty();});
 canvas.addEventListener('pointerleave',()=>{v.hover=false;v.look=0;dirty();});
 canvas.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!large){e.preventDefault();openViewer(v.id,host.querySelector('[data-architecture-expand]'));return;}
  if(!v.scene)return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
   e.preventDefault();const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
   if(e.key==='ArrowLeft')s.theta-=.13;if(e.key==='ArrowRight')s.theta+=.13;
   if(e.key==='ArrowUp')s.phi=Math.max(.18,s.phi-.09);if(e.key==='ArrowDown')s.phi=Math.min(1.5,s.phi+.09);
   camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();dirty();
  }
 });
 host.querySelector('[data-architecture-expand]')?.addEventListener('click',e=>openViewer(v.id,e.currentTarget));
 host.querySelector('[data-architecture-reset]')?.addEventListener('click',()=>fit(v));
 host.querySelector('[data-architecture-retry]').addEventListener('click',()=>{if(renderer?.getContext().isContextLost()){location.reload();return;}assets.delete(v.id);host.querySelector('[data-architecture-retry]').hidden=true;start(v);});
 v.resize=new ResizeObserver(()=>{if(v.scene){camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();fit(v,'whole',true);}dirty();});v.resize.observe(host);
 if(large)start(v);else observer.observe(host);return v;
}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const v=e.target._architecture;if(!v)continue;v.visible=e.isIntersecting;if(v.visible){start(v);v.dirty=true;invalidate();}}},{rootMargin:'100px'});
function unmount(v){
 v.feedback?.dispose();v.tour?.dispose();views.delete(v);observer.unobserve(v.host);v.resize.disconnect();v.controls.dispose();
 if(v.scene){v.scene.remove(v.group);v.group.remove(v.model);
  const geometries=new Set(),materials=new Set();for(const root of [v.scene,v.group])root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());v.sun.shadow.map?.dispose();
 }delete v.host._architecture;
}
const dialog=document.createElement('dialog');dialog.className='architecture-dialog';dialog.setAttribute('aria-labelledby','architecture-title');
dialog.innerHTML=`<header><div><small>BEIJING SATELLITE TOWN / ARCHITECTURE</small><h2 id="architecture-title"></h2></div><button type="button" data-viewer-close aria-label="关闭建筑展示">×</button></header><div class="architecture-viewer-body"><div class="architecture-modal-stage"></div><aside class="architecture-detail" aria-label="建筑细节介绍"></aside></div><footer><div class="architecture-camera"><button type="button" data-view="whole">整体</button><button type="button" data-view="facade">立面</button><button type="button" data-view="roof">屋顶</button><button type="button" data-view-rotate aria-pressed="false">自动旋转</button><button type="button" data-view-zoom="in" aria-label="放大建筑">＋</button><button type="button" data-view-zoom="out" aria-label="缩小建筑">－</button></div><div class="architecture-light"><button type="button" data-view-light="afternoon" aria-pressed="false">日光</button><button type="button" data-view-light="evening" aria-pressed="true">暖阳</button></div><a class="architecture-story" href="./explore.html">进入区域探索 ↗</a></footer><p class="architecture-modal-hint">拖动旋转 · 滚轮 / 双指缩放 · 方向键调整视角</p>`;
document.body.append(dialog);
function openViewer(id,trigger){
 const r=byId(id);returnFocus=trigger;
 if(modalView)unmount(modalView);
 dialog.querySelector('#architecture-title').textContent=r.title;
 dialog.querySelector('.architecture-story').href=exploreURL(r)+'&from=gallery';dialog.querySelector('.architecture-story').textContent='星尘生长 · 深入区域 →';
 dialog.querySelector('.architecture-modal-stage').innerHTML=architectureCard(id,'四区三中心 / '+String(regions.indexOf(r)+1).padStart(2,'0'));
 if(!dialog.open)dialog.showModal();document.documentElement.classList.add('architecture-modal-open');
 modalView=mount(dialog.querySelector('.architecture-view'),{large:true});
 dialog.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='whole')));
 dialog.querySelector('[data-view-rotate]').setAttribute('aria-pressed','false');
 dialog.querySelectorAll('[data-view-light]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.viewLight==='evening')));
 dialog.querySelector('[data-viewer-close]').focus();
}
dialog.querySelector('[data-viewer-close]').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{if(modalView){unmount(modalView);modalView=null;}document.documentElement.classList.remove('architecture-modal-open');returnFocus?.focus({preventScroll:true});for(const v of views)v.dirty=true;invalidate();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(!modalView)return;if(b.dataset.view==='whole')modalView.tour?.overview();else modalView.tour?.select(b.dataset.view);dialog.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));dialog.querySelector('[data-view-rotate]').setAttribute('aria-pressed','false');});
dialog.querySelector('[data-view-rotate]').onclick=e=>{if(!modalView?.scene)return;modalView.auto=!modalView.auto;modalView.controls.autoRotate=modalView.auto;e.currentTarget.setAttribute('aria-pressed',String(modalView.auto));modalView.dirty=true;invalidate();};
dialog.querySelectorAll('[data-view-zoom]').forEach(b=>b.onclick=()=>{const v=modalView;if(!v?.scene)return;const d=v.camera.position.clone().sub(v.controls.target),distance=THREE.MathUtils.clamp(d.length()*(b.dataset.viewZoom==='in'?.83:1.2),v.controls.minDistance,v.controls.maxDistance);v.camera.position.copy(v.controls.target).add(d.setLength(distance));v.controls.update();v.dirty=true;invalidate();});
dialog.querySelectorAll('[data-view-light]').forEach(b=>b.onclick=()=>{const v=modalView;if(!v?.scene)return;const warm=b.dataset.viewLight==='evening';v.sun.color.set(warm?'#ffe0b0':'#fff5e2');v.sun.intensity=warm?3.7:3;v.sun.position.set(warm?-9:-5,warm?12:18,9);v.scene.environment=sky.get(warm?'evening':'afternoon');v.scene.environmentIntensity=warm?.40:.55;v.shadowDirty=v.dirty=true;dialog.querySelectorAll('[data-view-light]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));invalidate();});

export function mountArchitectureGallery(root){
 for(const v of [...views])if(!v.host.isConnected)unmount(v);
 root.querySelectorAll('[data-architecture]').forEach(host=>mount(host));
}
addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{for(const v of views)v.dirty=true;invalidate();}});
reduce.addEventListener('change',()=>{for(const v of views){v.auto=false;v.look=0;v.controls.autoRotate=false;v.dirty=true;v.settle=2;}dialog.querySelector('[data-view-rotate]').setAttribute('aria-pressed','false');invalidate();});
addEventListener('pagehide',e=>{if(e.persisted)return;dead=true;cancelAnimationFrame(frame);for(const v of [...views])unmount(v);observer.disconnect();finishes?.dispose();sky?.dispose();ao?.dispose();composer?.dispose();renderer?.dispose();});
