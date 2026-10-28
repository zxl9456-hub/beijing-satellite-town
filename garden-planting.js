import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {addLeafTransmission} from './vegetation-materials.js?art=38a';

const PETAL_COLORS=['#f496b4','#f7b9ce','#ffd061','#c09ae9','#91cdeb','#f39570','#fff2d5'].map(c=>new THREE.Color(c));
const TREE_TONES=['#d1bd6e','#b0bf78','#88ab65'].map(c=>new THREE.Color(c));
function flowerMaterial(maps){
 const mat=new THREE.MeshStandardMaterial({name:'附件花朵 / 花瓣变色 PBR',side:THREE.DoubleSide,map:maps.diffuse,normalMap:maps.normal,normalScale:new THREE.Vector2(.48,.48),roughnessMap:maps.roughness,roughness:.85,metalness:0,envMapIntensity:.38});
 mat.onBeforeCompile=s=>{
  s.vertexShader='attribute vec3 plantTint;varying vec3 vPlantTint;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPlantTint=plantTint;');
  s.fragmentShader='varying vec3 vPlantTint;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   #ifdef USE_MAP
    float gardenPetal=smoothstep(.015,.05,sampledDiffuseColor.r-sampledDiffuseColor.g)*smoothstep(-.001,.018,sampledDiffuseColor.b-sampledDiffuseColor.g);
    float gardenShade=dot(sampledDiffuseColor.rgb,vec3(.24,.60,.16));
    vec3 gardenTint=vPlantTint*(.34+gardenShade*2.);
    diffuseColor.rgb=mix(diffuseColor.rgb,gardenTint,gardenPetal);
   #endif`);
 };
 mat.customProgramCacheKey=()=> 'uploaded-flower-petal-v1';return mat;
}
function treeMaterial(maps,autumn){
 const mat=new THREE.MeshStandardMaterial({name:'附件树组 / 自然受光 PBR',side:THREE.DoubleSide,map:maps.diffuse,normalMap:maps.normal,normalScale:new THREE.Vector2(.72,.72),roughnessMap:maps.roughness,roughness:.82,metalness:0,envMapIntensity:.46});
 mat.onBeforeCompile=s=>{
  s.uniforms.gardenAutumn=autumn;
  s.vertexShader='attribute vec3 plantTint;varying vec3 vPlantTint;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPlantTint=plantTint;');
  s.fragmentShader='uniform float gardenAutumn;varying vec3 vPlantTint;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float gardenLeafMask=0.;
   #ifdef USE_MAP
    float gardenLeaf=smoothstep(.015,.07,sampledDiffuseColor.g-sampledDiffuseColor.r);
    gardenLeafMask=gardenLeaf;
    float gardenLuma=dot(sampledDiffuseColor.rgb,vec3(.24,.60,.16));
    vec3 autumnLeaf=mix(vPlantTint,vec3(.62,.41,.12),.22)*(.46+gardenLuma*1.8);
    diffuseColor.rgb=mix(diffuseColor.rgb,autumnLeaf,gardenLeaf*gardenAutumn*.52);
   #endif`);
  addLeafTransmission(s,'gardenLeafMask',.18);
 };
 mat.customProgramCacheKey=()=> 'uploaded-tree-foliage-pbr-v2';return mat;
}
async function loadSpecies(kind){
 const loader=new GLTFLoader(),tex=new THREE.TextureLoader();
 const [models,diffuse,normal,roughness]=await Promise.all([
  Promise.all(['near','mid','far'].map(l=>loader.loadAsync(`./assets/garden/${kind}-${l}.glb`))),
  tex.loadAsync(`./assets/garden/${kind}-diffuse.jpg`),tex.loadAsync(`./assets/garden/${kind}-normal.jpg`),tex.loadAsync(`./assets/garden/${kind}-roughness.jpg`)
 ]);
 for(const t of [diffuse,normal,roughness]){t.flipY=false;t.anisotropy=4;}diffuse.colorSpace=THREE.SRGBColorSpace;
 const geometries=models.map(g=>{g.scene.updateMatrixWorld(true);let mesh;g.scene.traverse(o=>{if(o.isMesh)mesh=o;});const geometry=mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);return geometry;});
 return {geometries,maps:{diffuse,normal,roughness}};
}
class PlantInstances {
 constructor(scene,kind,species,points,material){
  this.lastPosition=new THREE.Vector3(Infinity,0,0);this.kind=kind;this.points=points;this.material=material;this.lastShadowHash=0;this.lastLOD=-1;this.dummy=new THREE.Object3D();this.levels=[];
  species.geometries.forEach((geometry,i)=>{
   const tint=new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1,points.length)*3),3);tint.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('plantTint',tint);
   const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,points.length));mesh.name=`用户附件 / ${kind==='flower'?'七色花丛':'四株树组'} / ${['近','中','远'][i]}景`;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=kind==='flower'?i===0:i<2;mesh.receiveShadow=true;scene.add(mesh);this.levels.push({mesh,tint});
  });
 }
 update(camera,now,force=false){
  if(!force&&(now-this.lastLOD<.35||this.lastPosition.distanceToSquared(camera.position)<.25))return false;this.lastLOD=now;this.lastPosition.copy(camera.position);
  const counts=[0,0,0];let shadowHash=2166136261;
  const near=this.kind==='flower'?32:130,mid=this.kind==='flower'?95:380;
  this.points.forEach((p,i)=>{
   const distance=Math.hypot(p[0]-camera.position.x,p[1]-camera.position.y,p[2]-camera.position.z),level=distance<near?0:distance<mid?1:2;
   const {mesh,tint}=this.levels[level],n=counts[level]++;
   this.dummy.position.set(p[0],p[1],p[2]);this.dummy.rotation.set(0,p[4],0);this.dummy.scale.set(p[3],p[3],p[3]);this.dummy.updateMatrix();mesh.setMatrixAt(n,this.dummy.matrix);
   const color=(this.kind==='flower'?PETAL_COLORS:TREE_TONES)[p[5]%(this.kind==='flower'?7:3)];tint.setXYZ(n,color.r,color.g,color.b);
   if(mesh.castShadow)shadowHash=Math.imul(shadowHash^i,16777619);
  });
  this.levels.forEach(({mesh,tint},i)=>{mesh.count=counts[i];mesh.instanceMatrix.needsUpdate=true;tint.needsUpdate=true;mesh.computeBoundingSphere();});
  const changed=shadowHash!==this.lastShadowHash;this.lastShadowHash=shadowHash;return changed;
 }
 dispose(){this.levels.forEach(({mesh})=>mesh.geometry.dispose());this.material.dispose();}
}
export async function populateUploadedGarden({scene,camera}){
 const [data,flower,tree]=await Promise.all([fetch('./assets/garden/placements.json').then(r=>{if(!r.ok)throw new Error('花坛种植数据载入失败');return r.json();}),loadSpecies('flower'),loadSpecies('tree')]);
 const autumn={value:1},flowerPlants=new PlantInstances(scene,'flower',flower,data.flowers,flowerMaterial(flower.maps)),treePlants=new PlantInstances(scene,'tree',tree,data.treeGroups,treeMaterial(tree.maps,autumn));
 flowerPlants.update(camera,0,true);treePlants.update(camera,0,true);
 return {info:data.info,aoExcluded:[...flowerPlants.levels,...treePlants.levels].map(l=>l.mesh),setSeason(season){autumn.value=season==='autumn'?1:0;},update(camera,time){const a=flowerPlants.update(camera,time),b=treePlants.update(camera,time);return a||b;},dispose(){flowerPlants.dispose();treePlants.dispose();for(const species of [flower,tree])Object.values(species.maps).forEach(t=>t.dispose());}};
}
