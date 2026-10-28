import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {configurePhotographicTree} from './vegetation-materials.js?art=39a';

// Shared scenery uses the park's existing photographic trees and uploaded flowers.
// Gameplay coordinates and collision geometry remain in mission-core.js.
const textures=new Map(),materials=new Map();
let plantAssets;
export function batchStatic(root,exclude=new Set()){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),batches=new Map();
 root.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||Array.isArray(o.material))return;for(let p=o;p&&p!==root;p=p.parent)if(exclude.has(p)||p.userData.keepSeparate)return;
  const shape=o.geometry.parameters?o.geometry.type+JSON.stringify(o.geometry.parameters):o.geometry.uuid,key=shape+'|'+o.material.uuid+'|'+o.castShadow+'|'+o.receiveShadow+'|'+!!o.userData.aoExclude;
  if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
 });
 for(const list of batches.values()){if(list.length<3)continue;const first=list[0],m=new THREE.InstancedMesh(first.geometry,first.material,list.length);m.castShadow=first.castShadow;m.receiveShadow=first.receiveShadow;m.userData.aoExclude=first.userData.aoExclude;m.name='园区静态细节实例';list.forEach((o,i)=>m.setMatrixAt(i,inverse.clone().multiply(o.matrixWorld)));m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();root.add(m);list.forEach(o=>o.removeFromParent());}
}
function random(seed=371){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function surface(kind='stone'){
 if(textures.has(kind))return textures.get(kind);
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),r=random();
 ctx.fillStyle=kind==='grass'?'#849452':kind==='wood'?'#b69b76':'#d5cdbc';ctx.fillRect(0,0,512,512);
 for(let i=0;i<22000;i++){ctx.fillStyle=r()>.5?'#ffffff18':'#26383016';ctx.fillRect(r()*512,r()*512,1+r()*2,kind==='wood'?3+r()*20:1+r()*2);}
 if(kind==='paving')for(let y=0;y<512;y+=64)for(let x=-64;x<512;x+=128){const ox=y%128?64:0;ctx.strokeStyle='#7f84734a';ctx.lineWidth=2;ctx.strokeRect(x+ox,y,128,64);ctx.strokeStyle='#fff9e66b';ctx.lineWidth=1;ctx.strokeRect(x+ox+2,y+2,124,60);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;textures.set(kind,t);return t;
}
export function finishMaterial(kind){
 if(materials.has(kind))return materials.get(kind);
 const specs={stone:{color:'#eee8da',roughness:.64,map:surface('stone'),bumpMap:surface('stone'),bumpScale:.018},metal:{color:'#e8e9e5',metalness:.48,roughness:.29,clearcoat:.3},gold:{color:'#c5a36a',metalness:.65,roughness:.32},glass:{color:'#527c94',metalness:.28,roughness:.16,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:1.2},grass:{color:'#b1b981',map:surface('grass'),roughness:.95},wood:{color:'#c5ab85',map:surface('wood'),roughness:.68},cyan:{color:'#9bf2f1',emissive:'#21cbd8',emissiveIntensity:3,roughness:.28},warm:{color:'#fff5d6',emissive:'#ffd397',emissiveIntensity:3.4,roughness:.35}};
 const m=new THREE.MeshPhysicalMaterial(specs[kind==='facade'?'glass':kind]||specs.stone);
 if(kind==='facade'){
  m.emissive.set('#ffd094');m.emissiveIntensity=.9;
  m.onBeforeCompile=s=>{s.vertexShader='varying vec3 facadeWorld;varying vec3 facadeNormal;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nfacadeWorld=(modelMatrix*vec4(transformed,1.)).xyz;facadeNormal=normalize(mat3(modelMatrix)*normal);');s.fragmentShader='varying vec3 facadeWorld;varying vec3 facadeNormal;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   vec2 fuv=abs(facadeNormal.z)>abs(facadeNormal.x)?facadeWorld.xy:facadeWorld.zy;
   vec2 cell=floor(fuv/vec2(.38,.58));vec2 local=fract(fuv/vec2(.38,.58));float occupied=step(.47,fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453));
   float inset=smoothstep(.035,.10,min(min(local.x,1.-local.x),min(local.y,1.-local.y)));
   float blind=.58+.18*cos(local.x*29.);float ceiling=smoothstep(.81,.9,local.y)*(1.-smoothstep(.93,.99,local.y));
   totalEmissiveRadiance*=occupied*inset*(blind*.45+ceiling*.6);
  `);};m.customProgramCacheKey=()=> 'mission-facade-17';
 }
 materials.set(kind,m);return m;
}
export function part(parent,w,h,d,mat,x=0,y=0,z=0,round=.035){const g=round?new RoundedBoxGeometry(w,h,d,2,Math.min(round,Math.min(w,h,d)*.24)):new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(g,typeof mat==='string'?finishMaterial(mat):mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function glowPool(parent,x,z,r=1.1,warm=true){
 let tex=textures.get('halo');if(!tex){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#ffffffa0');g.addColorStop(.35,'#ffffff50');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);tex=new THREE.CanvasTexture(c);textures.set('halo',tex);}
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(r*2,r*2),new THREE.MeshBasicMaterial({map:tex,color:warm?'#ffcb80':'#6ff1f0',transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.13,z);mesh.userData.aoExclude=true;parent.add(mesh);
}
export function lightPost(parent,x,z,height=1.9){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);part(g,.12,height,.12,'metal',0,height/2);part(g,.22,.15,.22,'gold',0,height);part(g,.16,.22,.16,'warm',0,height-.18);part(g,.32,.06,.32,'gold',0,height+.08);glowPool(parent,x,z,.85);return g;}
export function bench(parent,x,z,rotation=0){const g=new THREE.Group();parent.add(g);g.position.set(x,0,z);g.rotation.y=rotation;for(let i=0;i<5;i++)part(g,1.7,.06,.095,'wood',0,.49,(i-2)*.105);for(let i=0;i<3;i++)part(g,1.7,.09,.05,'wood',0,.7+i*.13,-.24);for(const s of [-1,1]){part(g,.07,.5,.55,'metal',s*.6,.25);part(g,.07,.9,.06,'metal',s*.6,.45,-.25);}return g;}
export async function loadPlants(){
 if(plantAssets)return plantAssets;
 plantAssets=(async()=>{const gltf=new GLTFLoader(),tx=new THREE.TextureLoader(),load=async name=>{const t=await tx.loadAsync('./assets/detail/tree/'+name);t.flipY=false;t.anisotropy=4;return t;};
 const [tree,maps,flower,flowerMaps]=await Promise.all([gltf.loadAsync('./assets/detail/urban-tree.glb'),Promise.all(['tree_small_02_leaves_nor_gl_1k.jpg','tree_small_02_leaves_arm_1k.jpg','tree_small_02_branch_nor_gl_1k.jpg','tree_small_02_branch_arm_1k.jpg','tree_small_02_nor_gl_1k.jpg','tree_small_02_arm_1k.jpg','leaves-alpha.png'].map(load)),gltf.loadAsync('./assets/garden/flower-mid.glb'),Promise.all(['diffuse','normal','roughness'].map(async n=>{const t=await tx.loadAsync('./assets/garden/flower-'+n+'.jpg');t.flipY=false;t.anisotropy=4;return t;}))]);
 const named={leafNormal:maps[0],leafARM:maps[1],branchNormal:maps[2],branchARM:maps[3],barkNormal:maps[4],barkARM:maps[5],alpha:maps[6]};tree.scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(tree.scene),height=bounds.max.y-bounds.min.y,center=bounds.getCenter(new THREE.Vector3()),trees=[];
 for(const tone of ['#d4aa47','#8eab55','#6f965b']){const g=new THREE.Group();let bi=0;tree.scene.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.translate(-center.x,-bounds.min.y,-center.z);geo.scale(1/height,1/height,1/height);const mat=configurePhotographicTree(o.material.clone(),{maps:named,center:new THREE.Vector3(),height:1,isBranch:o.material.name==='bark'&&bi++===0});if(mat.name==='foliage')mat.color.set(tone);const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.aoExclude=mat.name==='foliage';g.add(m);});trees.push(g);}
 let fg;flower.scene.updateMatrixWorld(true);flower.scene.traverse(o=>{if(o.isMesh)fg=o.geometry.clone().applyMatrix4(o.matrixWorld);});flowerMaps[0].colorSpace=THREE.SRGBColorSpace;
 const flowerMaterials=['#ffa3bd','#ffd165','#c4a1e4','#fff1d0'].map(tint=>{const m=new THREE.MeshStandardMaterial({map:flowerMaps[0],normalMap:flowerMaps[1],normalScale:new THREE.Vector2(.45,.45),roughnessMap:flowerMaps[2],roughness:.8,side:THREE.DoubleSide});m.onBeforeCompile=s=>{s.uniforms.petalTint={value:new THREE.Color(tint)};s.fragmentShader='uniform vec3 petalTint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float petal=smoothstep(.015,.05,sampledDiffuseColor.r-sampledDiffuseColor.g)*smoothstep(-.001,.018,sampledDiffuseColor.b-sampledDiffuseColor.g);
 diffuseColor.rgb=mix(diffuseColor.rgb,petalTint*(.34+dot(sampledDiffuseColor.rgb,vec3(.24,.6,.16))*2.),petal);`);};m.customProgramCacheKey=()=>tint;return m;});
 return {trees,flowerGeometry:fg,flowerMaterials};})();return plantAssets;
}
let readyPlants;
export async function preparePlants(){readyPlants=await loadPlants();}
export function plantedTree(parent,x,z,s=1,gold=false){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);parent.add(g);if(readyPlants){const template=readyPlants.trees[gold?0:(Math.abs(Math.round(x*3+z))%2)+1];const model=template.clone(true);model.scale.setScalar(2.8);model.rotation.y=x*1.7+z*.9;g.add(model);const crown=new THREE.Group();template.children.filter(m=>m.material.name==='foliage').forEach(m=>crown.add(m.clone()));crown.scale.set(2.7,2.6,2.7);crown.position.set(.12,.2,-.09);crown.rotation.y=model.rotation.y+1.9;g.add(crown);}return g;}
export function flowerbed(parent,x,z,w=2,d=.85,seed=0){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);part(g,w,.24,d,'stone',0,.12);part(g,w-.1,.06,d-.1,'grass',0,.265);part(g,w-.12,.025,.035,'warm',0,.17,d/2+.01);if(readyPlants){for(let i=0;i<Math.ceil(w/.4);i++){const m=new THREE.Mesh(readyPlants.flowerGeometry,readyPlants.flowerMaterials[(i+seed)%4]);m.scale.setScalar(.37);m.position.set(-w/2+.22+i*.4,.28,0);m.rotation.y=i*2.1;m.castShadow=m.receiveShadow=true;g.add(m);}}return g;}
export function glazedBuilding(parent,x,z,w=3,h=4,d=3){
 const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);part(g,w,h,d,'facade',0,h/2,0,.06);part(g,w+.1,.3,d+.1,'stone',0,.15);const frame=new THREE.BoxGeometry(1,1,1),records=[],v=new THREE.Object3D();
 const add=(px,py,pz,sx,sy,sz)=>{v.position.set(px,py,pz);v.scale.set(sx,sy,sz);v.updateMatrix();records.push(v.matrix.clone());};
 for(const side of [-1,1]){for(let i=0;i<=Math.ceil(w/.38);i++)add(-w/2+i*w/Math.ceil(w/.38),h/2,side*(d/2+.025),.05,h,.08);for(let i=0;i<=Math.ceil(d/.38);i++)add(side*(w/2+.025),h/2,-d/2+i*d/Math.ceil(d/.38),.08,h,.05);}
 for(let y=.5;y<h;y+=.58){add(0,y,0,w+.13,.055,d+.13);}const ribs=new THREE.InstancedMesh(frame,finishMaterial('metal'),records.length);records.forEach((m,i)=>ribs.setMatrixAt(i,m));ribs.castShadow=ribs.receiveShadow=true;g.add(ribs);
 // Warm interior panes are recessed behind the frame, with varied occupancy.
 const windows=[],r=random(Math.round((x+z+100)*35));for(const side of [-1,1])for(let y=.65;y<h-.3;y+=.58)for(let xx=-w/2+.2;xx<w/2;xx+=.38)if(r()>.48){v.position.set(xx,y,side*(d/2+.013));v.scale.set(.26,.35,.006);v.updateMatrix();windows.push(v.matrix.clone());}
 const rooms=new THREE.InstancedMesh(frame,new THREE.MeshStandardMaterial({color:'#b1a591',emissive:'#ffd79a',emissiveIntensity:.62,roughness:.45}),windows.length);windows.forEach((m,i)=>rooms.setMatrixAt(i,m));g.add(rooms);
 part(g,w+.22,.12,d+.22,'stone',0,h+.06);part(g,w*.8,.08,d*.8,'grass',0,h+.14);for(const side of [-1,1]){part(g,w+.1,.18,.07,'stone',0,h+.23,side*d/2);part(g,.07,.18,d,'stone',side*w/2,h+.23);part(g,w,.018,.025,'warm',0,h-.04,side*(d/2+.06));}
 part(g,w*.48,.36,d*.36,'stone',-.1,h+.32);for(let i=0;i<3;i++)part(g,w*.35,.015,.04,'metal',-.1,h+.51,(i-1)*.12);
 return g;
}
export function pavement(parent,w,d,x=0,z=0,y=-.02){const map=surface('paving').clone();map.needsUpdate=true;map.repeat.set(w/4,d/4);const m=new THREE.MeshStandardMaterial({color:'#ece4d5',map,bumpMap:map,bumpScale:.016,roughness:.78});return part(parent,w,.1,d,m,x,y,z,0);}
export function makeGround(parent,w,d,color='#a7ad7d',x=0,z=0){const map=surface('grass').clone();map.needsUpdate=true;map.repeat.set(w/3,d/3);return part(parent,w,.12,d,new THREE.MeshStandardMaterial({color,map,roughness:.95}),x,-.14,z,0);}
export async function createMissionWorld(stage,mission){
 await preparePlants();if(stage.disposed)return;
 if(mission.n===2){const {createResearchEnvironment}=await import('./research-environment.js?art=39a');return createResearchEnvironment(stage);}
 if(mission.n===1){const {createExhibitionEnvironment}=await import('./exhibition-environment.js?art=39a');return createExhibitionEnvironment(stage);}
 if(mission.n>=3){const {createChapterEnvironment}=await import('./chapter-art.js?art=39a');return createChapterEnvironment(stage,mission);}
 const root=new THREE.Group();root.name='夕照园区 · 游戏环境';stage.scene.add(root);stage.environmentRoot=root;
 const arcade=mission.n===5||mission.n===6;
 if(arcade){const terrain=makeGround(root,150,180,'#b4ba91',0,-65);if(mission.n===5)terrain.position.y=-1.5;{const skyline=new THREE.Group();skyline.position.set(0,0,mission.n===6?-70:-35);root.add(skyline);const m=await stage.regional(mission.id,skyline,mission.n===6?9:5);if(m){const size=new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()),fit=Math.min(1,32/Math.max(size.x,size.z));m.scale.multiplyScalar(fit);m.position.multiplyScalar(fit);}}return;}
 makeGround(root,100,110,'#b8bd8d',0,-30);pavement(root,48,32,0,3,-.1);for(const side of [-1,1]){glazedBuilding(root,side*16,-12,7,5.8,6);glazedBuilding(root,side*24,-22,7,7.5,7);}
 // Real region architecture forms the backdrop behind the playable terrace.
 const district=new THREE.Group();district.position.set(0,-.05,-15);district.rotation.y=-.12;root.add(district);
 const real=await stage.regional(mission.id,district,5);if(stage.disposed)return;
 if(real){const b=new THREE.Box3().setFromObject(real),size=b.getSize(new THREE.Vector3());const fit=Math.min(1,14/Math.max(size.x,size.z));real.scale.multiplyScalar(fit);real.position.multiplyScalar(fit);}
 for(const side of [-1,1]){
  for(let i=0;i<7;i++){const x=side*(10.2+(i%2)*2.4),z=6-i*5.3;plantedTree(root,x,z,1.05+(i%3)*.25,i%3!==1);if(i<4)lightPost(root,side*8.7,3-i*4.4,1.6);}
  for(let i=0;i<4;i++)flowerbed(root,side*8,2.5-i*2.8,1.5,.75,i);
  bench(root,side*7.4,5,side>0?-.3:.3);
 }
 for(const x of [-7,-3.4,3.4,7]){plantedTree(root,x,-7.8,.95,x<0);flowerbed(root,x,-6.5,2.2,.8,Math.abs(Math.round(x)));}for(let i=0;i<10;i++){glazedBuilding(root,-30+i*6,-36,4,3+i%4,4);plantedTree(root,-28+i*6,-29,1.2,i%2===0);}
 // Foreground foliage and reflected light add photographic depth without obscuring targets.
 for(const [x,z,s] of [[-13,8,1.8],[13,9,1.6],[-17,-1,1.5],[17,-2,1.6]])plantedTree(root,x,z,s,true);
 for(const side of [-1,1]){part(root,.045,.025,10,'cyan',side*7.85,.06,0);glowPool(root,side*7.85,1,1.4,false);}
 for(const x of [-6.2,6.2]){flowerbed(root,x,7.7,3.2,1.3,x>0?0:2);lightPost(root,x,7,1.3);plantedTree(root,x*1.65,8.7,1.75,x<0);}for(const x of [-5,5]){part(root,3.4,.06,1.5,'grass',x,.05,6);}
 stage.scene.fog.color.set('#d8d8c8');stage.scene.fog.near=36;stage.scene.fog.far=95;batchStatic(root);
}
