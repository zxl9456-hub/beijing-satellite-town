import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {configurePhotographicTree} from './vegetation-materials.js?art=39a';

function randomSource(seed=4819){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const rand=randomSource();
const loader=new THREE.TextureLoader();
function patternTexture(kind){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
 ctx.fillStyle=kind==='grass'?'#8d987c':kind==='wood'?'#beac8a':'#ece7db';ctx.fillRect(0,0,512,512);
 for(let i=0;i<62000;i++){const x=rand()*512,y=rand()*512;const white=rand()>.5;ctx.fillStyle=white?'rgba(255,255,255,.13)':'rgba(0,0,0,.09)';ctx.fillRect(x,y,kind==='wood'?1:1+rand()*2,kind==='wood'?4+rand()*18:1+rand()*2);}
 if(kind==='paving'){
  for(let y=0;y<512;y+=128){for(let x=-64;x<512;x+=128){const offset=y%256?64:0;ctx.fillStyle=`rgba(${125+Math.round(rand()*50)},${123+Math.round(rand()*50)},${118+Math.round(rand()*50)},.08)`;ctx.fillRect(x+offset+2,y+2,124,124);ctx.strokeStyle='#918d8240';ctx.lineWidth=1.4;ctx.strokeRect(x+offset,y,128,128);ctx.strokeStyle='#ffffff66';ctx.lineWidth=.8;ctx.strokeRect(x+offset+2,y+2,124,124);}}
 }
 if(kind==='grass'){for(let i=0;i<12000;i++){const x=rand()*512,y=rand()*512;ctx.strokeStyle=rand()>.5?'#c6cca529':'#4b633039';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rand()-.5)*5,y-rand()*7);ctx.stroke();}}
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;return texture;
}
export function createArtMaterials(){
 const cache=new Map();const grass=new Set(['*4','*5','*6','*9','*18','*19','*20','*24','*26','*28','*32','*41','*48','*66','[Vegetation Grass Artificial]','[Vegetation Grass]2','自定义 (1)','[Color F01]']);
 const paving=new Set(['*10','*13','*14','*16','*31','*35','*40','*43','*46','*56','[Pavers Herringbone Brick]','[Rough Square Concrete Block]']);
 const glazing=new Set(['*11','*12','*25','*29','*38','*65','_9U)HQBFXUM5HCINFK2_Y(3','sqbl','Enscape','Enscape (1)','*34']);
 const grassMap=patternTexture('grass'),pavingMap=patternTexture('paving'),woodMap=patternTexture('wood'),wallMap=patternTexture('stone');
 const maps=[grassMap,pavingMap,woodMap,wallMap];
 const clocks=[];
 function material(source){
  const name=source.name;if(cache.has(name))return cache.get(name);
  const water=name==='*55';
  const glass=!water&&name!=='[Translucent_Glass_Blue]'&&name!=='*27'&&(source.userData?.artRole==='glass'||(/Glass|glass|玻璃|boli/.test(name)&&!name.includes('窗框')&&!name.includes('分格'))||glazing.has(name));
  let m;
  if(glass){
   m=new THREE.MeshPhysicalMaterial({name,color:'#3c617e',roughness:.16,metalness:.12,clearcoat:1,clearcoatRoughness:.065,envMapIntensity:.85,side:THREE.DoubleSide,emissive:'#ffbf79',emissiveIntensity:1.4});
   m.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vArtWorld;varying vec3 vArtNormal;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvArtWorld=(modelMatrix*vec4(transformed,1.)).xyz;vArtNormal=normalize(mat3(modelMatrix)*normal);');
    s.fragmentShader='varying vec3 vArtWorld;varying vec3 vArtNormal;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     vec3 artN=normalize(vArtNormal);vec3 sight=normalize(cameraPosition-vArtWorld);
     vec2 facade=abs(artN.z)>abs(artN.x)?vArtWorld.xy:vArtWorld.zy;
     bool hotelPane=vArtWorld.x<20.&&vArtWorld.x> -150.&&vArtWorld.z> -50.&&vArtWorld.z<125.;
     vec2 cellSize=hotelPane?vec2(2.25,3.2):vec2(3.15,3.55);
     vec2 artCell=floor(facade/cellSize);vec2 artUv=fract(facade/cellSize);
     float artNoise=fract(sin(dot(artCell,vec2(12.9898,78.233)))*43758.5453);
     float artLit=step(.42,artNoise);
     vec2 roomUv=clamp(artUv+vec2(dot(sight,vec3(artN.z,0.,-artN.x)),sight.y)*.11,0.,1.);
     float curtain=.68+.22*cos(roomUv.x*32.+artNoise*8.);
     float recess=smoothstep(.015,.085,min(min(artUv.x,1.-artUv.x),min(artUv.y,1.-artUv.y)));
     float ceiling=smoothstep(.72,.85,roomUv.y)*(1.-smoothstep(.90,.98,roomUv.y));
     float reflected=pow(1.-abs(dot(sight,artN)),2.);
     float roomDepth=mix(.46,.90,roomUv.y);
     float desk=smoothstep(.13,.17,roomUv.y)*(1.-smoothstep(.23,.27,roomUv.y))*smoothstep(.18,.26,roomUv.x)*(1.-smoothstep(.73,.81,roomUv.x));
     float lamp=exp(-pow((roomUv.x-(.24+artNoise*.46))*18.,2.)-pow((roomUv.y-.64)*24.,2.));
     vec3 glassBlue=diffuseColor.rgb*(.74+.26*artNoise);
     vec3 roomColor=vec3(.62,.39,.18)*curtain*roomDepth*(1.-desk*.38);
     diffuseColor.rgb=mix(glassBlue,roomColor,artLit*.23*recess*(1.-reflected*.8));
    `);
    s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=artLit*(.37+ceiling*.62+lamp*.38-desk*.10)*recess*(1.-reflected*.7);');
   };
   m.userData.glass=true;
  }else if(grass.has(name)||source.userData?.artRole==='grass'){
   m=new THREE.MeshStandardMaterial({name,color:'#d2d6a5',map:grassMap,roughness:.94,side:THREE.DoubleSide});m.userData.grass=true;
   m.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vRoofWorld;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvRoofWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader='varying vec3 vRoofWorld;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(vRoofWorld.y>39.&&vRoofWorld.x<20.&&vRoofWorld.x> -150.&&vRoofWorld.z> -50.&&vRoofWorld.z<125.)diffuseColor.rgb=vec3(.47,.53,.58);');
   };
  }else if(/Asphalt|Blacktop/.test(name)){
   m=new THREE.MeshStandardMaterial({name,color:'#6d777e',map:wallMap,roughness:.88,side:THREE.DoubleSide});
  }else if(paving.has(name)){
   m=new THREE.MeshStandardMaterial({name,color:'#d8d1c4',map:pavingMap,bumpMap:pavingMap,bumpScale:.045,roughness:.76,side:THREE.DoubleSide});m.userData.paving=true;
  }else if(name==='*55'){
   m=new THREE.MeshPhysicalMaterial({name,color:'#369cba',metalness:.19,roughness:.10,clearcoat:1,clearcoatRoughness:.04,envMapIntensity:1.8,side:THREE.DoubleSide});
   m.onBeforeCompile=s=>{s.uniforms.artTime={value:0};clocks.push(s.uniforms.artTime);s.vertexShader='varying vec3 vArtWater;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvArtWater=(modelMatrix*vec4(transformed,1.)).xyz;');s.fragmentShader='uniform float artTime;varying vec3 vArtWater;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(sin(vArtWater.x*1.5+artTime)*.065,0.,cos(vArtWater.z*1.8+artTime*.7)*.055));');};
  }else if(/Wood|竹/.test(name)||name==='*52'||name==='*2'){
   m=new THREE.MeshStandardMaterial({name,color:'#b79a6b',map:woodMap,roughness:.78,side:THREE.DoubleSide});
  }else if(/MT|\*27$|\*30$|\*47$/.test(name)){
   m=new THREE.MeshStandardMaterial({name,color:'#9faeb3',roughness:.86,side:THREE.DoubleSide});
  }else{
   const metal=/金属|铝板|框|分格|穿孔|深灰色涂料/.test(name)||name==='[Translucent_Glass_Blue]';
   const silver=name==='深灰色涂料'||/灰色铝板|窗框|分格/.test(name);
   m=new THREE.MeshPhysicalMaterial({name,color:metal?(silver?'#a3b3c2':'#ccd2d8'):'#d4d5d2',roughness:metal?.32:.54,metalness:metal?.32:.035,clearcoat:metal?.32:.08,clearcoatRoughness:.16,map:metal?null:wallMap,bumpMap:metal?null:wallMap,bumpScale:.035,envMapIntensity:metal?.75:.5,side:THREE.DoubleSide});
  }
  if(name==='深灰色涂料')m.flatShading=true;cache.set(name,m);return m;
 }
 function setUV(mesh){
  const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;const uv=new Float32Array(p.count*2);
  const name=mesh.material.name;const isWood=/Wood|\*52|竹/.test(name);const scale=isWood?.23:mesh.material.userData.grass?.65:.12;
  for(let i=0;i<p.count;i++){
   const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
   if(ny>nx&&ny>nz){uv[i*2]=p.getX(i)*scale;uv[i*2+1]=p.getZ(i)*scale;}
   else{uv[i*2]=(nz>nx?p.getX(i):p.getZ(i))*scale;uv[i*2+1]=p.getY(i)*scale;}
  }mesh.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
 }
 return {cache,material,setUV,update(time){clocks.forEach(t=>t.value=time);},dispose(){maps.forEach(m=>m.dispose());}};
}

class Batches{
 constructor(scene){this.scene=scene;this.list=new Map();this.dummy=new THREE.Object3D();this.box=new THREE.BoxGeometry(1,1,1);this.round=new RoundedBoxGeometry(1,1,1,2,.12);this.sphere=new THREE.SphereGeometry(1,10,8);this.cylinder=new THREE.CylinderGeometry(1,1,1,10);this.items=[];}
 put(name,geom,material,pos,scale,rotation=new THREE.Euler(),color){
  const key=name;let l=this.list.get(key);if(!l){l={geom,material,items:[]};this.list.set(key,l);}
  this.dummy.position.fromArray(pos);this.dummy.scale.fromArray(scale);this.dummy.rotation.copy(rotation);this.dummy.updateMatrix();l.items.push({matrix:this.dummy.matrix.clone(),color:color?new THREE.Color(color):null});
 }
 finish(){for(const [name,l] of this.list){const mesh=new THREE.InstancedMesh(l.geom,l.material,l.items.length);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;l.items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);if(item.color)mesh.setColorAt(i,item.color);});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;this.scene.add(mesh);this.items.push(mesh);}return this.items;}
}
const TREE_PALETTE=['#f3c856','#d3b95d','#e7bb4d','#97b86d','#6c9e58','#80994d','#b8c469'];
function instanceTrees(scene,source,points,maps,castShadow=true){
 source.updateMatrixWorld(true);const models=[];source.traverse(o=>{if(o.isMesh)models.push(o);});
 const box=new THREE.Box3().setFromObject(source),height=box.max.y-box.min.y,center=box.getCenter(new THREE.Vector3()),dummy=new THREE.Object3D(),all=[];
 models.forEach((model,partIndex)=>{
  const geometry=model.geometry.clone();geometry.applyMatrix4(model.matrixWorld);geometry.translate(0,-box.min.y,0);
  const material=configurePhotographicTree(model.material.clone(),{maps,center,height,isBranch:partIndex===0});
  const mesh=new THREE.InstancedMesh(geometry,material,points.length);mesh.name='园区摄影纹理树 / '+material.name;mesh.castShadow=castShadow;mesh.receiveShadow=true;
  const records=[];
  points.forEach(([x,y,z,h,turn,tint],i)=>{
   const scale=h/height;dummy.position.set(x,y,z);dummy.rotation.set(0,turn,0);dummy.scale.set(scale*(.89+.22*Math.sin(i*3.11)**2),scale,scale*(.91+.18*Math.cos(i*1.92)**2));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   if(material.name==='foliage'){const autumn=new THREE.Color(TREE_PALETTE[tint%7]),green=new THREE.Color('#8aaa69').offsetHSL(Math.sin(i*9.3)*.025,0,Math.sin(i*3.9)*.035);mesh.setColorAt(i,autumn);records.push({i,autumn,green});}
  });mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;scene.add(mesh);all.push({mesh,records});
 });return all;
}
function createTreeLOD(scene,camera,sources,points,maps){
 const levels=sources.map((source,i)=>{const parts=instanceTrees(scene,source,points,maps,i<2);const transforms=parts[0].mesh.instanceMatrix.array.slice();parts.forEach(p=>p.mesh.count=0);return {parts,transforms};});
 let last=-1,season='autumn',hash=0;
 const lastLODPosition=new THREE.Vector3(Infinity,0,0);
 function update(camera,time,force=false){
  if(!force&&(time-last<.45||lastLODPosition.distanceToSquared(camera.position)<.25))return false;lastLODPosition.copy(camera.position);last=time;const counts=[0,0,0],near=innerWidth<650?42:65,mid=innerWidth<650?210:285;let nextHash=2166136261;
  points.forEach((p,i)=>{
   const d=Math.hypot(p[0]-camera.position.x,p[1]-camera.position.y,p[2]-camera.position.z),level=d<near?0:d<mid?1:2,n=counts[level]++,l=levels[level];
   const matrix=l.transforms.subarray(i*16,i*16+16);
   for(const part of l.parts){part.mesh.instanceMatrix.array.set(matrix,n*16);if(part.records.length){const color=part.records[i][season];part.mesh.instanceColor.setXYZ(n,color.r,color.g,color.b);}}
   if(level<2)nextHash=Math.imul(nextHash^(i*3+level),16777619);
  });
  levels.forEach((l,i)=>l.parts.forEach(p=>{p.mesh.count=counts[i];p.mesh.instanceMatrix.needsUpdate=true;if(p.mesh.instanceColor)p.mesh.instanceColor.needsUpdate=true;p.mesh.computeBoundingSphere();}));
  const changed=nextHash!==hash;hash=nextHash;return changed;
 }
 update(camera,0,true);
 return {meshes:levels.flatMap(l=>l.parts.map(p=>p.mesh)),leafMeshes:levels.flatMap(l=>l.parts.filter(p=>p.records.length).map(p=>p.mesh)),update,setSeason(value){season=value;update(camera,last,true);}};
}
function forestImpostor(scene,renderer,source,maps,points){
 const tree=source.clone(true);tree.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(tree),height=box.max.y-box.min.y,center=box.getCenter(new THREE.Vector3());
 let barkIndex=0;tree.traverse(o=>{if(o.isMesh)o.material=configurePhotographicTree(o.material.clone(),{maps,center,height,isBranch:o.material.name==='bark'&&barkIndex++===0});});
 const bake=new THREE.Scene();bake.add(tree,new THREE.HemisphereLight('#ffffff','#aab19b',1.35));
 const key=new THREE.DirectionalLight('#fff1d8',3.5);key.position.set(-4,8,5);bake.add(key);
 const size=Math.max(height,box.max.x-box.min.x,box.max.z-box.min.z)*1.14;
 const view=new THREE.OrthographicCamera(-size/2,size/2,size/2,-size/2,.01,40);view.position.copy(center).add(new THREE.Vector3(0,0,size*2.5));view.lookAt(center);
 const target=new THREE.WebGLRenderTarget(512,512,{type:THREE.HalfFloatType,format:THREE.RGBAFormat});target.texture.generateMipmaps=true;target.texture.minFilter=THREE.LinearMipmapLinearFilter;
 const oldTarget=renderer.getRenderTarget(),oldTone=renderer.toneMapping,oldColor=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();
 renderer.setRenderTarget(target);renderer.setClearColor('#000000',0);renderer.toneMapping=THREE.NoToneMapping;renderer.render(bake,view);renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);renderer.toneMapping=oldTone;
 const pad=size/height,low=(center.y-size/2-box.min.y)/height,high=low+pad,p=[],uv=[],norm=[],idx=[];
 for(let j=0;j<3;j++){
  const a=j*Math.PI/3;for(const [x,y,u,v] of [[-pad/2,low,0,0],[pad/2,low,1,0],[pad/2,high,1,1],[-pad/2,high,0,1]]){p.push(x*Math.cos(a),y,x*Math.sin(a));uv.push(u,v);norm.push(-Math.sin(a),0,Math.cos(a));}const i=j*4;idx.push(i,i+1,i+2,i,i+2,i+3);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(idx);
 const material=new THREE.MeshBasicMaterial({map:target.texture,alphaTest:.14,alphaToCoverage:false,side:THREE.DoubleSide});
 const mesh=new THREE.InstancedMesh(geometry,material,points.length);mesh.name='远景林带 / 摄影纹理树冠距离显示';mesh.castShadow=false;const dummy=new THREE.Object3D(),records=[];
 points.forEach(([x,y,z,h,turn,tint],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,turn,0);dummy.scale.set(h,h,h);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);const autumn=new THREE.Color(TREE_PALETTE[tint%7]),green=new THREE.Color('#86a563');mesh.setColorAt(i,autumn);records.push({i,autumn,green});});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;scene.add(mesh);
 return {mesh,records,target,setLight(mode){material.color.setScalar(mode==='evening'?1.1:1.03);}};
}
function streetLife(scene,placements){
 const b=new Batches(scene);const stone=new THREE.MeshStandardMaterial({color:'#d7d1be',roughness:.78});const dark=new THREE.MeshStandardMaterial({color:'#344b53',roughness:.5,metalness:.3});const glass=new THREE.MeshPhysicalMaterial({color:'#1e4d68',roughness:.13,metalness:.20,clearcoat:1,envMapIntensity:1.4});const paint=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.25,metalness:.42,clearcoat:1});const rubber=new THREE.MeshStandardMaterial({color:'#1b2429',roughness:.88});const wood=new THREE.MeshStandardMaterial({color:'#b6996d',roughness:.7});const gold=new THREE.MeshStandardMaterial({color:'#f9eed5',emissive:'#ffd28c',emissiveIntensity:.48,roughness:.5});
 const carBody=new RoundedBoxGeometry(4.35,.88,1.83,3,.20),carCab=new RoundedBoxGeometry(2.4,.69,1.57,3,.13);const wheel=new THREE.CylinderGeometry(.37,.37,.22,12);wheel.rotateX(Math.PI/2);
 const lampGlass=new THREE.MeshPhysicalMaterial({color:'#fff0d6',emissive:'#ffd3a0',emissiveIntensity:4.5,roughness:.24,clearcoat:.7});
 const lampPoints=[];
 const paints=['#e6edea','#426e95','#f5f0df','#354452','#b86b46','#aebcc0','#283d53'];
 placements.cars.forEach((p,i)=>{
  const [x,y,z,a]=p;const yaw=-a+(i%2?Math.PI:0);const rotation=new THREE.Euler(0,yaw,0);const root=new THREE.Vector3(x,y,z);const at=(px,py,pz)=>new THREE.Vector3(px,py,pz).applyEuler(rotation).add(root).toArray();
  b.put('车辆 / 烤漆车身',carBody,paint,at(0,.66,0),[1,1,1],rotation,paints[i%paints.length]);b.put('车辆 / 玻璃座舱',carCab,glass,at(-.22,1.34,0),[1,1,1],rotation);b.put('车辆 / 车顶',b.round,paint,at(-.26,1.67,0),[1.60,.07,1.31],rotation,paints[i%paints.length]);
  for(const px of [-1.30,1.30])for(const pz of [-.88,.88])b.put('车辆 / 轮胎',wheel,rubber,at(px,.40,pz),[1,1,1],rotation);
  for(const pz of [-.61,.61])b.put('车辆 / 灯光',b.round,gold,at(2.14,.71,pz),[.06,.16,.38],rotation);
  b.put('车辆 / 前格栅',b.box,dark,at(2.18,.56,0),[.04,.20,.55],rotation);
 });
 const clothes=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9}),skin=new THREE.MeshStandardMaterial({color:'#cda786',roughness:.9}),trousers=new THREE.MeshStandardMaterial({color:'#31424d',roughness:.9});const coats=['#749dac','#dfdfca','#d2a879','#305b7a','#b48765','#4b6268'];
 placements.people.forEach((p,i)=>{
  const [x,y,z,a]=p;const yaw=-a+rand()*2;const r=new THREE.Euler(0,yaw,0);const root=new THREE.Vector3(x,y,z);const at=(px,py,pz)=>new THREE.Vector3(px,py,pz).applyEuler(r).add(root).toArray();const h=.94+rand()*.16;
  b.put('园区行人 / 衣着',b.round,clothes,at(0,1.12*h,0),[.45,.63*h,.27],r,coats[i%coats.length]);b.put('园区行人 / 头部',b.sphere,skin,at(0,1.67*h,0),[.17,.19,.17],r);
  for(const side of [-1,1]){b.put('园区行人 / 双腿',b.cylinder,trousers,at(side*.12,.46*h,side*.07),[.075,.74*h,.075],new THREE.Euler(.08*side,yaw,0));b.put('园区行人 / 双臂',b.cylinder,clothes,at(side*.30,1.04*h,-side*.06),[.065,.60*h,.065],new THREE.Euler(.15*side,yaw,.12*side),coats[i%coats.length]);}
  b.put('园区行人 / 头发',b.sphere,dark,at(0,1.77*h,-.015),[.17,.12,.17],r);
 });
 const detailPoints=placements.people.filter((p,i)=>(p[4]??i)%5===0);
 detailPoints.forEach((p,i)=>{
  const [x,y,z,a]=p;const r=new THREE.Euler(0,-a,0);
  const fixtureIndex=p[4]===undefined?i:Math.floor(p[4]/5);
  if(fixtureIndex%3===0){
   b.put('公共坐凳 / 座面',b.round,wood,[x,y+.54,z],[2.4,.15,.68],r);b.put('公共坐凳 / 靠背',b.round,wood,[x,y+.91,z-.26],[2.4,.56,.10],r);for(const s of [-1,1])b.put('公共坐凳 / 支座',b.box,dark,[x+s*.84,y+.30,z],[.12,.48,.46],r);
  }else{
   b.put('景观灯 / 灯杆',b.cylinder,dark,[x,y+2.5,z],[.075,5,.075]);b.put('景观灯 / 发光玻璃',b.cylinder,lampGlass,[x,y+5.10,z],[.18,.57,.18]);b.put('景观灯 / 灯头顶盖',b.cylinder,dark,[x,y+5.42,z],[.27,.07,.27]);b.put('景观灯 / 基座',b.cylinder,stone,[x,y+.21,z],[.23,.42,.23]);
   lampPoints.push([x,y,z]);
  }
 });
 const canopy=new THREE.ConeGeometry(2.25,.54,16,1,true);const umbrellaMat=new THREE.MeshStandardMaterial({color:'#fcf8e8',roughness:.91,side:THREE.DoubleSide});const table=new THREE.CylinderGeometry(.68,.68,.12,16);
 const cafe=[[122,.25,93],[136,.25,87],[149,.25,80],[164,.25,74],[176,.25,63],[174,.25,41],[130,.25,-111],[132,.25,-130]];
 cafe.forEach(([x,y,z])=>{b.put('户外休憩 / 遮阳伞',canopy,umbrellaMat,[x,y+3.4,z],[1,1,1]);b.put('户外休憩 / 伞杆',b.cylinder,dark,[x,y+1.65,z],[.055,3.3,.055]);b.put('户外休憩 / 圆桌',table,stone,[x,y+.82,z],[1,1,1]);for(const a of [0,2.1,4.2])b.put('户外休憩 / 座椅',b.round,wood,[x+Math.cos(a),y+.45,z+Math.sin(a)],[.45,.10,.45],new THREE.Euler(0,-a,0));});
 const meshes=b.finish();
 const c=document.createElement('canvas');c.width=c.height=128;const context=c.getContext('2d'),radial=context.createRadialGradient(64,64,0,64,64,64);
 radial.addColorStop(0,'rgba(255,244,218,.82)');radial.addColorStop(.28,'rgba(255,216,159,.43)');radial.addColorStop(.65,'rgba(255,195,122,.10)');radial.addColorStop(1,'rgba(255,191,111,0)');context.fillStyle=radial;context.fillRect(0,0,128,128);
 const poolTexture=new THREE.CanvasTexture(c);poolTexture.colorSpace=THREE.SRGBColorSpace;
 const poolMaterial=new THREE.MeshBasicMaterial({map:poolTexture,color:'#ffc887',transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending});
 const plane=new THREE.PlaneGeometry(1,1);plane.rotateX(-Math.PI/2);
 const pools=new THREE.InstancedMesh(plane,poolMaterial,lampPoints.length);pools.name='路灯 / 柔和地面光池';pools.renderOrder=3;
 const transform=new THREE.Object3D();lampPoints.forEach(([x,y,z],i)=>{transform.position.set(x,y+.06,z);transform.scale.set(9,1,9);transform.updateMatrix();pools.setMatrixAt(i,transform.matrix);});pools.instanceMatrix.needsUpdate=true;scene.add(pools);
 // Three unshadowed local sources light the nearest real luminaire locations.
 const localLights=[];
 for(const [tx,tz] of [[114,4],[-108,101],[195,69]]){
  const point=[...lampPoints].sort((a,b)=>Math.hypot(a[0]-tx,a[2]-tz)-Math.hypot(b[0]-tx,b[2]-tz))[0];
  if(!point)continue;const light=new THREE.PointLight('#ffcb90',95,16,2);light.position.set(point[0],point[1]+5.05,point[2]);light.name='暖色景观灯 / 局部补光';scene.add(light);localLights.push(light);
 }
 return {meshes,pools,setLight(mode){const night=mode==='evening';lampGlass.emissiveIntensity=night?4.5:.35;gold.emissiveIntensity=night?1.5:.30;poolMaterial.opacity=night?.28:.025;localLights.forEach(l=>l.intensity=night?95:0);},dispose(){poolTexture.dispose();poolMaterial.dispose();plane.dispose();}};
}

function gardenRibbon(scene,curve,width,offset,y,material){
 const positions=[],uv=[],indices=[];const steps=90;
 for(let i=0;i<=steps;i++){
  const t=i/steps,p=curve.getPoint(t),v=curve.getTangent(t),n=new THREE.Vector3(-v.z,0,v.x).normalize();
  for(const side of [-1,1]){const q=p.clone().addScaledVector(n,offset+side*width/2);positions.push(q.x,y,q.z);uv.push(q.x*.12,q.z*.12);}
  if(i<steps){const a=i*2;indices.push(a,a+1,a+3,a,a+3,a+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;mesh.name='中央绿地 / 曲线步道与水系';scene.add(mesh);return mesh;
}
function centralGarden(scene,urban,placements,materials){
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-117,.3,141),new THREE.Vector3(-104,.3,109),new THREE.Vector3(-119,.3,75),new THREE.Vector3(-108,.3,33),new THREE.Vector3(-98,.3,-10)]);
 const grass=new THREE.Mesh(new THREE.PlaneGeometry(172,164),materials.material({name:'*24'}));grass.rotation.x=-Math.PI/2;grass.position.set(-107,.24,65);grass.name='中央绿地 / 补充景观';grass.receiveShadow=true;
 const uv=grass.geometry.attributes.uv;for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)*45,uv.getY(i)*43);}scene.add(grass);
 gardenRibbon(scene,curve,9,0,.29,materials.material({name:'*55'}));gardenRibbon(scene,curve,13,12,.32,materials.material({name:'*40'}));gardenRibbon(scene,curve,3,-8,.32,materials.material({name:'*40'}));
 const b=new Batches(scene),metal=new THREE.MeshStandardMaterial({color:'#efebe0',metalness:.25,roughness:.4}),stone=materials.material({name:'*40'});
 for(const t of [.22,.58,.86]){
  const p=curve.getPoint(t),v=curve.getTangent(t);const angle=Math.atan2(v.z,v.x);const rotation=new THREE.Euler(0,-angle,0);
  b.put('中央绿地 / 步行桥',b.round,stone,[p.x,.43,p.z],[4,.22,29],rotation);
  for(const side of [-1,1])b.put('中央绿地 / 桥栏',b.box,metal,[p.x+side*2,.98,p.z],[.08,.08,27],rotation);
 }
 for(let i=0;i<400;i++){
  const x=-183+rand()*145,z=-11+rand()*149;const onWater=curve.getPoints(35).some(p=>Math.hypot(x-p.x,z-p.z)<19);
  if(!onWater)urban.push([x,.25,z,6.3+rand()*4.3,rand()*6.28,i%7]);
 }
 for(let i=0;i<78;i++){
  const t=rand(),p=curve.getPoint(t),v=curve.getTangent(t),n=new THREE.Vector3(-v.z,0,v.x).normalize();p.addScaledVector(n,9+rand()*8);
  placements.people.push([p.x,.36,p.z,Math.atan2(v.z,v.x)]);
 }
 b.finish();
}

export async function populatePark({scene,renderer,camera,landscape,ground,materials}){
 const [natural,urbanModel,forest,placements,...textures]=await Promise.all([
  new GLTFLoader().loadAsync('./assets/detail/natural-tree.glb?flora=9g'),new GLTFLoader().loadAsync('./assets/detail/urban-tree.glb?flora=9g'),new GLTFLoader().loadAsync('./assets/detail/forest-tree.glb?flora=9g'),fetch('./assets/detail/placements.json').then(r=>{if(!r.ok)throw new Error('园区细节文件载入失败');return r.json();}),
  ...['leaves-alpha.png','tree_small_02_leaves_nor_gl_1k.jpg','tree_small_02_leaves_arm_1k.jpg','tree_small_02_branch_nor_gl_1k.jpg','tree_small_02_branch_arm_1k.jpg','tree_small_02_nor_gl_1k.jpg','tree_small_02_arm_1k.jpg'].map(name=>loader.loadAsync('./assets/detail/tree/'+name))
 ]);
 const maps=Object.fromEntries(['alpha','leafNormal','leafARM','branchNormal','branchARM','barkNormal','barkARM'].map((name,i)=>[name,textures[i]]));
 textures.forEach(t=>{t.flipY=false;t.anisotropy=8;t.colorSpace=THREE.NoColorSpace;});
 // app.js supplies a blue / gold architectural reflection sky.
 ground.material.color.set('#c3d19f');ground.material.map.repeat.set(160,160);
 const urban=[];
 landscape.trees.filter((p,i)=>i%2===0).forEach((p,i)=>urban.push([p[0],p[1],p[2],p[1]>3?3.4:6.2+rand()*4.9,rand()*6.28,i%7]));
 placements.trees.forEach((p,i)=>urban.push([p[0],p[1],p[2],5.8+rand()*4.9,rand()*6.28,i%7]));
 placements.terraces.forEach((p,i)=>urban.push([p[0],p[1],p[2],2.5+rand()*1.9,rand()*6.28,i%7]));
 
 const far=[];
 // Dense but varied forest belts beyond the source campus; no building footprints are changed.
 for(let i=0;i<30000;i++){
  const outer=i>=10000;
  const x=rand()*(outer?3300:1700)-(outer?1650:850),z=rand()*(outer?2900:1400)-(outer?1450:700);if(x>-480&&x<540&&z>-400&&z<400)continue;
  far.push([x,-6.55,z,10+rand()*8,rand()*6.28,i%7]);
 }
 const boundaryDistance=p=>Math.hypot(Math.max(-480-p[0],0,p[0]-540),Math.max(-400-p[2],0,p[2]-400));
 const edgeIndices=new Set(far.map((p,i)=>({i,d:boundaryDistance(p)})).sort((a,b)=>a.d-b.d).slice(0,750).map(p=>p.i));
 const edgeTrees=far.filter((p,i)=>edgeIndices.has(i)),distantPoints=far.filter((p,i)=>!edgeIndices.has(i));
 const distant=forestImpostor(scene,renderer,natural.scene,maps,distantPoints);
 const treeLOD=createTreeLOD(scene,camera,[natural.scene,urbanModel.scene,forest.scene],[...urban,...edgeTrees],maps);
 const furniture=streetLife(scene,placements);
 return {treeCount:urban.length+far.length,aoExcluded:[...treeLOD.leafMeshes,distant.mesh,furniture.pools],update(camera,time){return treeLOD.update(camera,time);},setLight(mode){furniture.setLight(mode);distant.setLight(mode);},setSeason(season){treeLOD.setSeason(season);distant.records.forEach(p=>distant.mesh.setColorAt(p.i,p[season==='autumn'?'autumn':'green']));distant.mesh.instanceColor.needsUpdate=true;},dispose(){furniture.dispose();textures.forEach(t=>t.dispose());distant.target.dispose();treeLOD.meshes.forEach(mesh=>{mesh.geometry.dispose();mesh.material.dispose();});distant.mesh.geometry.dispose();distant.mesh.material.dispose();}};
}
