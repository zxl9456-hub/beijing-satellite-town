import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {part,finishMaterial,plantedTree,flowerbed,batchStatic,surface,preparePlants} from './mission-scenery.js?art=37a';
import {inscription} from './exhibition-machinery.js?art=37a';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
export function disc(parent,r,h,mat,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,64),typeof mat==='string'?finishMaterial(mat):mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function hoop(parent,r,mat,x=0,y=0,z=0,t=.035){const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,10,80),typeof mat==='string'?finishMaterial(mat):mat);m.position.set(x,y,z);m.rotation.x=-Math.PI/2;parent.add(m);return m;}
function line(parent,points,r=.025,mat='gold'){const c=new THREE.CatmullRomCurve3(points.map(p=>V(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(c,48,r,8,false),finishMaterial(mat));parent.add(m);m.castShadow=true;return m;}
function diagram(){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.fillStyle='#103245';x.fillRect(0,0,1024,512);x.strokeStyle='#5d9da54f';x.lineWidth=1;for(let i=0;i<1024;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,512);x.stroke();}for(let i=0;i<512;i+=32){x.beginPath();x.moveTo(0,i);x.lineTo(1024,i);x.stroke();}x.strokeStyle='#b9dce0';x.lineWidth=3;x.strokeRect(420,170,184,175);for(const side of [-1,1]){x.strokeRect(512+side*170-(side<0?190:0),200,190,120);for(let i=1;i<5;i++){x.beginPath();x.moveTo(side<0?152+i*38:682+i*38,200);x.lineTo(side<0?152+i*38:682+i*38,320);x.stroke();}}x.beginPath();x.arc(512,260,245,0,Math.PI*2);x.stroke();x.fillStyle='#e4c893';x.font='500 32px sans-serif';x.fillText('SATELLITE / ASSEMBLY LAB',40,54);x.font='20px sans-serif';x.fillText('01  POWER   →   02  ASSEMBLY   →   03  TEST',40,470);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:tex,roughness:.55,emissive:'#65abc1',emissiveIntensity:.12});}
export async function createResearchEnvironment(stage){
 await preparePlants();
 const g=new THREE.Group();stage.scene.add(g);stage.environmentRoot=g;stage.exhibition=true;
 const stone=finishMaterial('stone').clone();stone.color.set('#e6decb');stone.bumpMap=surface('paving');stone.bumpScale=.012;
 part(g,20,.3,15,stone,0,-.19,0,.12);
 for(let x=-9;x<=9;x+=1.5)part(g,.014,.008,14.6,'gold',x,-.026,0,0);
 for(let z=-7;z<=7;z+=1.5)part(g,19.6,.008,.014,'gold',0,-.025,z,0);
 for(const x of [-9.1,9.1]){part(g,.3,.45,14,'metal',x,.2,0);part(g,.035,.025,13.6,'warm',x,.44,0);}
 for(let i=0;i<13;i++){const x=-9+i*1.5;part(g,.11,6.2,.12,'metal',x,3.1,-6.6,.02);part(g,.025,6.15,.025,'gold',x+.07,3.1,-6.5);}
 const glass=new THREE.MeshPhysicalMaterial({color:'#cbe5e6',transparent:true,opacity:.16,roughness:.18,metalness:.15,depthWrite:false});
 for(let i=0;i<12;i++)part(g,1.4,5.8,.025,glass,-8.25+i*1.5,3.2,-6.64,0).castShadow=false;
 for(const y of [.3,2.8,6.2])part(g,18.6,.15,.22,'metal',0,y,-6.6,.03);
 for(const z of [-6.5,-3.5]){line(g,[[-9,4.8,z],[-8,6.2,z],[-4,6.6,z],[4,6.6,z],[8,6.2,z],[9,4.8,z]],.09,'metal');line(g,[[-8,6.12,z+.1],[-4,6.5,z+.1],[4,6.5,z+.1],[8,6.12,z+.1]],.018,'warm');}
 const panel=part(g,7.8,3.6,.13,'gold',0,3.8,-6.2,.08);part(g,7.58,3.38,.045,diagram(),0,3.8,-6.11,.02);
 for(const side of [-1,1]){const x=side*7.4;part(g,2.3,1.2,3.4,'metal',x,.6,-2.8,.09);part(g,2.4,.1,3.5,'gold',x,1.25,-2.8);for(let k=0;k<3;k++){part(g,2,.28,.04,'glass',x,.3+k*.34,-1.08,.02);part(g,.5,.035,.035,'gold',x,.37+k*.34,-1.04);}
  part(g,2,1.4,.1,'glass',x,2.4,-3.5,.08);part(g,1.86,.025,.02,'cyan',x,2.95,-3.43);for(let k=0;k<4;k++){part(g,.2+k*.24,.035,.02,'warm',x,2.7-k*.25,-3.43);}
  plantedTree(g,side*8,4.8,.85,side<0);flowerbed(g,side*5.6,6.3,2.7,.7,side<0?0:2);
 }
 for(const x of [-14,-9,-4,4,9,14])plantedTree(g,x,-10,1.5,x<0);
 part(g,80,.15,80,new THREE.MeshStandardMaterial({color:'#bac3a7',roughness:1}),0,-.45,0,0);
 batchStatic(g);
 stage.camera=new THREE.PerspectiveCamera(39,1,.1,160);stage.camera.position.set(12,11.5,20);stage.camera.lookAt(0,2,0);stage.focusTarget=new THREE.Vector3(0,2,0);stage.resize();stage.scene.background.set('#dce4df');stage.scene.fog=new THREE.Fog('#dce4df',37,85);stage.scene.environmentIntensity=.65;stage.renderer.toneMappingExposure=1.05;
 const sun=stage.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);sun.intensity=3.5;sun.position.set(-13,12,8);sun.target.position.set(0,0,0);Object.assign(sun.shadow.camera,{left:-17,right:17,top:18,bottom:-18});sun.shadow.camera.updateProjectionMatrix();
 const fill=new THREE.PointLight('#b1e1ed',24,16,2);fill.position.set(3,5,2);g.add(fill);
}
export function createWorkstation(root){
 const g=new THREE.Group();root.add(g);const fallback=new THREE.Group();g.add(fallback);part(fallback,7.8,1.65,4.5,'metal',0,.85,0,.22);part(fallback,8,.12,4.65,'gold',0,1.7,0,.1);disc(fallback,2.55,.08,'glass',0,1.81,0);hoop(fallback,2.6,'cyan',0,1.87);let disposed=false;
 return {group:g,async load(){const r=await fetch('./assets/research/rodin-manifest.json?art=25a');if(!r.ok)return;const m=await r.json();const pieces=await Promise.all(m.files.map(async f=>{const r=await fetch(f);if(!r.ok)throw Error('Rodin asset '+r.status);return r.arrayBuffer();}));const bytes=await new Response(new Blob(pieces).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();const asset=await new GLTFLoader().parseAsync(bytes,'');if(disposed)return;const b=new THREE.Box3().setFromObject(asset.scene),s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3()),scale=8/s.x;asset.scene.scale.setScalar(scale);asset.scene.position.set(-c.x*scale,-b.min.y*scale,-c.z*scale);asset.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.material.envMapIntensity=.7;if(o.material.map)o.material.map.anisotropy=4;}});g.add(asset.scene);fallback.visible=false;return asset.scene;},dispose(){disposed=true;}};
}
let solarMat;
function cells(){if(solarMat)return solarMat;const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#0d315f';x.fillRect(0,0,512,256);for(let i=0;i<8;i++)for(let j=0;j<4;j++){const a=5+i*64,b=4+j*64,gr=x.createLinearGradient(a,b,a+60,b+60);gr.addColorStop(0,'#3c73a2');gr.addColorStop(.6,'#112e61');gr.addColorStop(1,'#25497d');x.fillStyle=gr;x.fillRect(a,b,56,56);x.strokeStyle='#add9e28f';x.lineWidth=1;for(let k=0;k<10;k++){x.beginPath();x.moveTo(a,b+k*5.4);x.lineTo(a+56,b+k*5.4);x.stroke();}}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;solarMat=new THREE.MeshPhysicalMaterial({map:t,roughness:.26,metalness:.5,clearcoat:.6});return solarMat;}
export function moduleModel(id){
 const g=new THREE.Group();g.name=id;
 if(id==='power'){part(g,1.04,.4,.9,'gold',0,0,0,.05);for(let i=0;i<5;i++)disc(g,.065,.65,'glass',-.38+i*.19,.18,0).rotation.x=Math.PI/2;part(g,.9,.035,.7,'metal',0,.25,0);part(g,.32,.02,.2,inscription('+  −'),0,.28,0);for(let i=0;i<8;i++)part(g,.06,.05,.12,'gold',-.35+i*.1,-.08,.48);}
 if(id==='wings'){const hinges=[];for(const sign of [-1,1]){const h=new THREE.Group();h.position.x=sign*.8;g.add(h);hinges.push(h);part(h,1.65,.07,1.15,'metal',sign*.83,0,0,.025);part(h,1.56,.012,1.06,cells(),sign*.83,.043,0,.01);for(let i=0;i<5;i++)part(h,.018,.015,1.1,'metal',sign*(.08+i*.37),.055,0);disc(g,.12,.2,'gold',sign*.78,0,0).rotation.z=Math.PI/2;part(g,.7,.08,.08,'metal',sign*.5,0,0);}g.userData.hinges=hinges;}
 if(id==='camera'){part(g,.78,.58,.8,'metal',0,0,0,.045);for(let i=0;i<7;i++)part(g,.78,.025,.018,'gold',0,.15-i*.05,-.42);const lens=disc(g,.25,.55,'glass',0,0,.4);lens.rotation.x=Math.PI/2;for(const z of [.3,.5,.68])hoop(g,.27,'gold',0,0,z,.016).rotation.x=0;const optic=disc(g,.19,.03,new THREE.MeshPhysicalMaterial({color:'#187fac',roughness:.08,metalness:.6,clearcoat:1}),0,0,.7);optic.rotation.x=Math.PI/2;g.userData.lens=optic;}
 if(id==='antenna'){disc(g,.32,.12,'gold',0,-.35);part(g,.1,.5,.1,'metal',0,-.1);const dish=new THREE.Group();g.add(dish);dish.rotation.x=.38;const m=new THREE.Mesh(new THREE.SphereGeometry(.58,40,20,0,Math.PI*2,0,1.05),new THREE.MeshPhysicalMaterial({color:'#f6eee0',metalness:.5,roughness:.24,side:THREE.DoubleSide}));m.position.y=-.18;dish.add(m);hoop(dish,.5,'gold',0,.1,0);disc(dish,.018,.6,'metal',0,.32);disc(dish,.07,.07,'gold',0,.66);}
 g.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});return g;
}
