import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {part,finishMaterial,plantedTree,flowerbed,batchStatic,surface} from './mission-scenery.js?art=39a';

export async function createExhibitionEnvironment(stage){
 const root=new THREE.Group();root.name='逐星展馆 · 精细建筑';stage.scene.add(root);stage.environmentRoot=root;stage.exhibition=true;
 const gltf=await new GLTFLoader().loadAsync('./assets/exhibition/gallery-v24.glb?art=24c');if(stage.disposed)return;
 gltf.scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;const m=o.material;
  if(/limestone|tile/i.test(m.name)){m.bumpMap=surface('stone');m.bumpScale=.012;m.envMapIntensity=.7;}
  if(/glass/i.test(m.name)){m.transparent=true;m.opacity=.12;m.depthWrite=false;o.castShadow=false;o.userData.aoExclude=true;}
  if(/lighting|circuit/i.test(m.name)){o.castShadow=false;o.userData.aoExclude=true;m.emissiveIntensity=2.1;}
 });root.add(gltf.scene);
 const garden=new THREE.Group();root.add(garden);
 for(const x of [-8,8])for(const z of [-5.3,2,5.7]){const t=plantedTree(garden,x,z,x>0&&z>0?.24:.76,x<0);t.position.y=.5;}
 for(const side of [-1,1])for(const z of [-4.7,-1.7,.8]){const shrub=plantedTree(garden,side*9.1,z,.3);shrub.position.y=3.9;}
 for(const x of [-7,7])flowerbed(garden,x,7,2.6,.7,x<0?0:2);
 batchStatic(garden);
 // The courtyard beyond the glazing supplies depth and warm reflected light.
 for(const x of [-12,-6,6,12]){plantedTree(root,x,-10,1.8,x<0);}
 part(root,100,.2,100,new THREE.MeshStandardMaterial({color:'#c5c5aa',roughness:.9}),0,-.65,0,0);
 stage.camera=new THREE.PerspectiveCamera(39,1,.1,150);stage.camera.position.set(12,13,23);stage.camera.lookAt(0,2,0);stage.focusTarget=new THREE.Vector3(0,2,0);stage.resize();
 stage.scene.background.set('#d9dfd7');stage.scene.fog=new THREE.Fog('#d9dfd7',35,85);stage.renderer.toneMappingExposure=1.02;stage.scene.environmentIntensity=.55;
 const sun=stage.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);sun.intensity=3.7;sun.position.set(-15,12,8);sun.target.position.set(0,0,-2);Object.assign(sun.shadow.camera,{left:-17,right:17,top:18,bottom:-18});sun.shadow.camera.updateProjectionMatrix();
 const fill=new THREE.PointLight('#b6eaf8',18,13,2);fill.position.set(0,5,-3);root.add(fill);
 for(const x of [-5,5]){const light=new THREE.PointLight('#ffcb85',14,9,2);light.position.set(x,3,-2);root.add(light);}
}

const mesh=(parent,geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
const cyl=(p,r,h,m,x=0,y=0,z=0)=>mesh(p,new THREE.CylinderGeometry(r,r,h,48),m,x,y,z);
const ball=(p,r,m,x=0,y=0,z=0)=>mesh(p,new THREE.SphereGeometry(r,40,28),m,x,y,z);
const torus=(p,r,m,x=0,y=0,z=0,t=.025)=>mesh(p,new THREE.TorusGeometry(r,t,8,96),m,x,y,z);
const metal=()=>finishMaterial('metal'),gold=()=>finishMaterial('gold');
let panelTexture,foilTexture,earthTexture;
function panels(){if(panelTexture)return panelTexture;const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#c2ccca';x.fillRect(0,0,512,256);for(let j=0;j<4;j++)for(let i=0;i<8;i++){const a=5+i*63,b=5+j*63,g=x.createLinearGradient(a,b,a+58,b+58);g.addColorStop(0,'#1a4d85');g.addColorStop(.5,'#10264d');g.addColorStop(1,'#256a99');x.fillStyle=g;x.fillRect(a,b,58,58);x.strokeStyle='#9dc8e448';x.lineWidth=1;for(let k=1;k<12;k++){x.beginPath();x.moveTo(a,b+k*4.7);x.lineTo(a+58,b+k*4.7);x.stroke();}}panelTexture=new THREE.CanvasTexture(c);panelTexture.colorSpace=THREE.SRGBColorSpace;panelTexture.anisotropy=4;return panelTexture;}
function foil(){if(foilTexture)return foilTexture;const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#9d8962';x.fillRect(0,0,256,256);for(let i=0;i<110;i++){const a=(i*97)%256,b=(i*61)%256;x.strokeStyle=i%2?'#e5d3a4':'#726444';x.lineWidth=1;x.beginPath();x.moveTo(a,b);x.lineTo(a+Math.sin(i)*27,b+Math.cos(i*3)*35);x.lineTo(a+19,b+13);x.stroke();}foilTexture=new THREE.CanvasTexture(c);foilTexture.wrapS=foilTexture.wrapT=THREE.RepeatWrapping;return foilTexture;}

export function createExhibit(parent,id){
 const g=new THREE.Group();g.name='展品 '+id;parent.add(g);
 const thermal=new THREE.MeshPhysicalMaterial({color:'#d9b15f',metalness:.72,roughness:.38,bumpMap:foil(),bumpScale:.025});
 const blue=new THREE.MeshPhysicalMaterial({color:'#d8efff',map:panels(),metalness:.5,roughness:.22,clearcoat:.65});
 const dark=new THREE.MeshPhysicalMaterial({color:'#173550',metalness:.35,roughness:.18,clearcoat:1});
 part(g,.85,.85,.8,thermal,0,1.2,0,.07);cyl(g,.15,.46,gold(),0,.58);cyl(g,.48,.11,metal(),0,.32);torus(g,.44,gold(),0,.38).rotation.x=-Math.PI/2;
 for(const s of [-1,1]){cyl(g,.055,.5,metal(),s*.65,1.2).rotation.z=Math.PI/2;const wing=new THREE.Group();wing.position.set(s*1.22,1.25,0);wing.rotation.z=s*.14;g.add(wing);part(wing,1.05,.06,.83,metal(),0,0,0,.02);part(wing,.99,.012,.77,blue,0,.039,0,.01);for(let i=0;i<3;i++)part(wing,.018,.013,.78,'metal',-.34+i*.34,.048,0);}
 for(const s of [-1,1])for(const z of [-.32,.32]){cyl(g,.028,.87,metal(),s*.38,1.2,z);ball(g,.038,gold(),s*.4,1.65,z);}
 for(let i=0;i<5;i++)part(g,.09,.52,.025,'metal',-.26+i*.13,1.2,-.416,.005);
 if(id==='navigation'){
  cyl(g,.36,.13,metal(),0,1.7);cyl(g,.29,.045,new THREE.MeshStandardMaterial({color:'#e6ebe3',roughness:.4}),0,1.78);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ball(g,.025,gold(),Math.cos(a)*.24,1.81,Math.sin(a)*.24);}cyl(g,.027,.46,metal(),0,1.97);ball(g,.065,finishMaterial('cyan'),0,2.21);
  for(let i=0;i<3;i++){const q=cyl(g,.105,.025,dark,(i-1)*.23,1.23,.421);q.rotation.x=Math.PI/2;torus(g,.105,gold(),(i-1)*.23,1.23,.439,.012);}
 }else if(id==='communication'){
  const dish=new THREE.Group();dish.position.set(0,1.7,.08);dish.rotation.x=.6;g.add(dish);
  mesh(dish,new THREE.SphereGeometry(.62,40,18,0,Math.PI*2,0,.9),new THREE.MeshPhysicalMaterial({color:'#f4eee1',side:THREE.DoubleSide,metalness:.5,roughness:.25}),0,-.26);
  torus(dish,Math.sin(.9)*.62,gold(),0,.126).rotation.x=Math.PI/2;cyl(dish,.018,.62,metal(),0,.34);ball(dish,.08,gold(),0,.66);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const rod=cyl(dish,.011,.6,metal(),Math.sin(a)*.14,.37,Math.cos(a)*.14);rod.rotation.z=Math.sin(a)*.6;rod.rotation.x=Math.cos(a)*.6;}
 }else{
  const optics=new THREE.Group();optics.position.set(0,1.62,.24);optics.rotation.x=Math.PI/2-.22;g.add(optics);cyl(optics,.27,.55,metal());cyl(optics,.23,.57,dark);cyl(optics,.18,.58,new THREE.MeshPhysicalMaterial({color:'#207f97',metalness:.45,roughness:.08,clearcoat:1}));
  for(const y of [-.22,0,.22])torus(optics,.277,gold(),0,y,0,.016).rotation.x=Math.PI/2;
  part(g,.65,.04,.45,'metal',0,1.73,-.13);for(let i=0;i<8;i++)part(g,.56,.03,.016,'gold',0,1.76,-.3+i*.05,.003);
 }
 batchStatic(g);return g;
}

function earthMap(){
 if(earthTexture)return earthTexture;const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#173e60');g.addColorStop(.5,'#3f9fae');g.addColorStop(1,'#16415c');x.fillStyle=g;x.fillRect(0,0,1024,512);x.strokeStyle='#99e6dc3a';x.lineWidth=1;for(let a=0;a<1024;a+=32){x.beginPath();x.moveTo(a,0);x.lineTo(a,512);x.stroke();}for(let a=0;a<512;a+=32){x.beginPath();x.moveTo(0,a);x.lineTo(1024,a);x.stroke();}
 // Stylized continental silhouettes for a museum globe, not a navigation map.
 const shapes=[[[80,110],[160,60],[268,80],[301,143],[255,190],[218,209],[193,260],[164,214],[130,170]],[[243,261],[309,287],[324,330],[295,380],[272,440],[245,376],[228,312]],[[487,116],[550,92],[602,120],[638,80],[762,82],[878,153],[818,191],[782,242],[732,215],[704,275],[661,211],[608,178],[566,170]],[[514,197],[590,193],[631,251],[586,354],[542,342],[506,260]],[[810,327],[865,302],[921,338],[893,382],[823,379]],[[312,32],[371,50],[345,108],[300,85]]];
 x.fillStyle='#b3c699';x.shadowBlur=5;x.shadowColor='#cae1b4';for(const p of shapes){x.beginPath();p.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.fill();}earthTexture=new THREE.CanvasTexture(c);earthTexture.colorSpace=THREE.SRGBColorSpace;earthTexture.anisotropy=4;return earthTexture;
}

export function createOrrery(parent){
 const g=new THREE.Group();g.position.set(0,.54,-1);parent.add(g);g.name='轨道仪 · 可编辑暂代资产';
 cyl(g,1.62,.18,gold(),0,.09);cyl(g,1.48,.55,metal(),0,.42);cyl(g,1.56,.07,gold(),0,.72);cyl(g,1.35,.035,finishMaterial('glass'),0,.77);
 for(let i=0;i<36;i++){const a=i/36*Math.PI*2;const p=part(g,.045,.25,.035,'gold',Math.sin(a)*1.5,.42,Math.cos(a)*1.5);p.rotation.y=a;}
 for(const z of [-1,1]){const b=part(g,.18,1.6,.18,'gold',0,1.5,z*.95);b.rotation.x=z*.2;}
 const orb=new THREE.Group();orb.position.y=2.65;g.add(orb);
 const earth=ball(orb,1.08,new THREE.MeshPhysicalMaterial({map:earthMap(),metalness:.18,roughness:.3,clearcoat:.8}));earth.rotation.z=.23;
 const loops=[];for(let i=0;i<3;i++){const r=torus(orb,1.36+i*.16,gold(),0,0,0,.04);r.rotation.set(.6+i*.68,.2+i*.8,i*.25);loops.push(r);const inner=torus(r,1.34+i*.16,finishMaterial('cyan'),0,0,0,.008);inner.userData.aoExclude=true;}
 const equator=torus(orb,1.72,gold(),0,0,0,.032);equator.rotation.x=Math.PI/2;
 for(let i=0;i<60;i++){const a=i/60*Math.PI*2,p=part(orb,.018,.018,i%5===0?.13:.06,'gold',Math.sin(a)*1.72,0,Math.cos(a)*1.72,.002);p.rotation.y=a;}
 const tracer=ball(loops[1],.085,finishMaterial('warm'),1.5,0,0);tracer.userData.aoExclude=true;
 return {group:g,update(dt,lit){earth.rotation.y+=dt*(lit?.3:.035);loops.forEach((r,i)=>r.rotation.y+=dt*(lit?.2:.008)*(i%2?1:-1));}};
}
