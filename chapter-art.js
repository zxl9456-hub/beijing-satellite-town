import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {part,finishMaterial,pavement,flowerbed,plantedTree,lightPost,bench,glazedBuilding,batchStatic,makeGround} from './mission-scenery.js?art=40a';

export const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
export function disk(parent,r,h,kind='stone',x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,96),finishMaterial(kind));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function arc(parent,r,tube,kind='gold',start=0,length=Math.PI*2){const m=new THREE.Mesh(new THREE.TorusGeometry(r,tube,12,96,length),finishMaterial(kind));m.rotation.z=start;m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function line(parent,points,kind='gold',radius=.025){const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(24,points.length*6),radius,8,false),finishMaterial(kind));m.castShadow=true;parent.add(m);return m;}
export function screen(parent,w,h,x,y,z,seed=0){const g=new THREE.Group();parent.add(g);g.position.set(x,y,z);part(g,w+.12,h+.12,.12,'metal');part(g,w,h,.03,'glass',0,0,.08);for(let i=0;i<4;i++){part(g,w*.72,.014,.005,i===0?'warm':'cyan',-w*.06,h*.32-i*h*.18,.102);for(let j=0;j<3;j++)part(g,.025,.025,.008,'gold',w*.39,h*.32-i*h*.18,.102);}return g;}
export function gate(parent,{width=9,height=5,wood=false}={}){
 const g=new THREE.Group();parent.add(g);
 for(const s of [-1,1]){part(g,.55,height*.55,.85,'stone',s*width*.47,height*.275);part(g,.7,.12,1.1,'gold',s*width*.47,.08);for(let i=0;i<5;i++)part(g,.025,height*.4,.035,'gold',s*width*.47+(i-2)*.08,height*.3,.44);flowerbed(g,s*(width*.5+.65),.1,1.6,1.8,s>0?2:3);}
 const pts=Array.from({length:49},(_,i)=>{const a=i/48*Math.PI;return V(Math.cos(a)*width*.47,height*.55+Math.sin(a)*height*.45,0);});
 for(const z of [-.38,.38])line(g,pts.map(p=>p.clone().add(V(0,0,z))),'metal',.19);
 line(g,pts.map(p=>p.clone().add(V(0,-.16,.4))),'warm',.018);
 for(let i=0;i<35;i++){const a=i/34*Math.PI;const p=V(Math.cos(a)*width*.47,height*.55+Math.sin(a)*height*.45,0);const b=part(g,.095,.1,.95,wood?'wood':'gold',p.x,p.y,p.z);b.rotation.z=a-Math.PI/2;}
 return g;
}
export async function heroAsset(stage,id,parent,width,fallback){
 // A generated mesh is optional at load time; interactive geometry stays independent.
 const url=`./assets/chapters/${id}/manifest.json`;
 try{const response=await fetch(url);if(!response.ok)return fallback;const info=await response.json();if(info.status!=='integrated')return fallback;const pieces=await Promise.all(info.files.map(async f=>{const r=await fetch(f);if(!r.ok)throw Error('模型下载失败');return r.arrayBuffer();}));const raw=await new Response(new Blob(pieces).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();const gltf=await new GLTFLoader().parseAsync(raw,'./assets/chapters/');if(stage.disposed)return;const object=gltf.scene,b=new THREE.Box3().setFromObject(object),sz=b.getSize(V()),c=b.getCenter(V()),s=width/sz.x;object.scale.setScalar(s);object.position.set(-c.x,-b.min.y,-c.z).multiplyScalar(s);object.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of [].concat(o.material)){m.envMapIntensity=.65;if(m.map)m.map.anisotropy=4;}}});parent.add(object);stage.needsRender=true;if(fallback)fallback.visible=false;return object;}catch(error){console.warn('核心装置使用精细实时模型',id,error.message);return fallback;}
}
export async function createChapterEnvironment(stage,mission){
 stage.chapter=mission.n;stage.renderer.toneMappingExposure=1.18;const sun=stage.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);if(sun){sun.color.set('#ffe1ad');sun.intensity=5;sun.position.set(-18,16,12);}
stage.depthOfField={band:12,aperture:2.8};stage.focusTarget=V(0,1,0);
 const root=new THREE.Group();stage.scene.add(root);stage.environmentRoot=root;root.name='逐星计划 · 精细园区场景';
 const arcade=mission.n===5||mission.n===6;
 stage.scene.background.set('#e7e4d8');stage.scene.fog.color.set('#e0dfcf');stage.scene.fog.near=arcade?60:35;stage.scene.fog.far=arcade?145:95;
 const ground=makeGround(root,150,180,'#adb58b',0,-60);if(mission.n===5)ground.position.y=-1.5;
 if(arcade){return;}
 pavement(root,43,34,0,-1,-.1);
 for(const side of [-1,1]){
  // Layered water, planted edges and warm bollards frame the playable terrace.
  part(root,2.6,.2,16,'stone',side*10.2,.02,-1);
  const water=part(root,2.35,.025,15.75,'glass',side*10.2,.14,-1);water.material=water.material.clone();water.material.color.set('#527f85');water.material.roughness=.1;
  for(let k=0;k<4;k++){const a=arc(root,.4+k*.3,.008,'metal');a.rotation.x=-Math.PI/2;a.position.set(side*10.2,.17,-4);}
  for(let i=0;i<5;i++){plantedTree(root,side*(13+i%2),5-i*5,1.2+(i%3)*.18,i%3===0);lightPost(root,side*8.5,5-i*3.8,1.5);}
  for(let i=0;i<3;i++){flowerbed(root,side*7.6,3-i*4.6,1.3,1.2,i);bench(root,side*8,5,side>0?-Math.PI/2:Math.PI/2);}
  glazedBuilding(root,side*19,-17,7,7,7);glazedBuilding(root,side*27,-28,6,8,7);
  part(root,.035,.02,14,'gold',side*6.7,.01,-.5);
 }
 for(let i=0;i<6;i++){const x=-12+i*4.8;flowerbed(root,x,-9,3.8,1.5,i);plantedTree(root,x,-10,1.35,i%3===0);}
 const background=new THREE.Group();background.position.set(0,0,-27);root.add(background);const real=await stage.regional(mission.id,background,5.8);if(real){const size=new THREE.Box3().setFromObject(real).getSize(V());const fit=Math.min(1,23/size.x);real.scale.multiplyScalar(fit);real.position.multiplyScalar(fit);}
 for(const s of [-1,1]){plantedTree(root,s*13,10,2,s<0);flowerbed(root,s*8,7,4,1.2,3);}
 batchStatic(root);
}
