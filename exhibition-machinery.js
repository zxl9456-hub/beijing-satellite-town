import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {part,finishMaterial} from './mission-scenery.js?art=40a';

export function inscription(text,width=256,height=128){
 const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');x.fillStyle='#18394b';x.fillRect(0,0,width,height);x.strokeStyle='#c5a56b';x.lineWidth=4;x.strokeRect(5,5,width-10,height-10);x.fillStyle='#f5dba7';x.textAlign='center';x.textBaseline='middle';x.font='600 '+Math.floor(height*.38)+'px sans-serif';x.fillText(text,width/2,height/2,width-18);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.45,metalness:.18});
}
function cylinder(parent,r,h,material,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,48),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function ring(parent,r,t,mat,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,64),mat);m.position.set(x,y,z);m.rotation.x=-Math.PI/2;parent.add(m);return m;}
export function createHatch(model,symbol,step){
 const g=new THREE.Group();model.add(g);g.position.set(0,1.17,-.448);
 const dark=finishMaterial('glass').clone();dark.color.set('#0c2637');dark.roughness=.65;
 part(g,.72,.62,.06,dark,0,0,0,.015);
 const chip=cylinder(g,.18,.055,finishMaterial('gold'),0,0,-.055);chip.rotation.x=Math.PI/2;
 const face=new THREE.Mesh(new THREE.PlaneGeometry(.29,.15),inscription(symbol));face.position.set(0,.01,-.09);face.rotation.y=Math.PI;g.add(face);
 const hinge=new THREE.Group();hinge.position.set(-.38,0,-.08);g.add(hinge);
 part(hinge,.76,.66,.045,'metal',.38,0,0,.02);const label=new THREE.Mesh(new THREE.PlaneGeometry(.61,.25),inscription(symbol+' · '+step));label.position.set(.38,0,-.025);label.rotation.y=Math.PI;hinge.add(label);
 for(const y of [-.22,.22]){const pin=cylinder(g,.035,.15,finishMaterial('gold'),-.4,y,-.08);pin.userData.part='hinge';}
 part(hinge,.07,.18,.07,'gold',.67,0,-.045,.015);
 return {hinge,chip,face,update(dt,open,taken){hinge.rotation.y=THREE.MathUtils.damp(hinge.rotation.y,open?-2.05:0,8,dt);chip.visible=face.visible=!taken;}};
}
export function createArchiveDrawer(root){
 const g=new THREE.Group();root.add(g);g.position.set(-5,.7,4.63);
 part(g,.85,.08,.82,'wood',0,-.3,-.35);part(g,.85,.68,.08,'glass',0,0,.035);part(g,.35,.05,.075,'gold',0,.18,.11);
 for(const s of [-1,1])part(g,.05,.2,.8,'gold',s*.4,-.18,-.34);
 const paper=new THREE.Mesh(new THREE.PlaneGeometry(.68,.58),inscription('检修记录',512,256));paper.rotation.x=-Math.PI/2;paper.position.set(0,-.24,-.32);g.add(paper);
 return {group:g,update(dt,open){g.position.z=THREE.MathUtils.damp(g.position.z,open?5.4:4.63,7,dt);}};
}
export function createCalibrationConsole(root){
 const g=new THREE.Group();g.position.set(6.7,0,3.35);g.rotation.y=-.16;root.add(g);
 // A separate mechanism stays editable when the generated outer cabinet is replaced.
 const housing=new THREE.Group();g.add(housing);housing.name='校准台外壳 · 等待 Rodin 模型';
 part(housing,3.4,1.4,1.8,'stone',0,.72,0,.14);part(housing,3.55,.11,1.95,'gold',0,.09,0,.05);part(housing,3.5,.14,1.92,'gold',0,1.47,0,.04);part(housing,3.35,.06,1.8,'metal',0,1.56,0,.035);
 part(housing,3.3,1.05,.12,'gold',0,2.04,-.82,.07);part(housing,3.16,.88,.05,inscription('✦  ·  ORBIT  ·  ✦',1024,256),0,2.05,-.74,.03);
 for(const s of [-1,1])for(let i=0;i<4;i++)part(housing,.035,.9,.035,'gold',s*1.69,.8,-.55+i*.35);
 const socketRoot=new THREE.Group();socketRoot.position.set(0,1.64,.24);socketRoot.rotation.x=0;g.add(socketRoot);
 const sockets=[],dials=[],chips=[];
 for(let i=0;i<3;i++){
  const x=(i-1)*.84,base=cylinder(socketRoot,.31,.085,finishMaterial('glass'),x,0,0);base.userData.socket=i;sockets.push(base);
  ring(socketRoot,.36,.025,finishMaterial('gold'),x,.07,0);
  const dial=new THREE.Group();dial.position.set(x,.08,0);socketRoot.add(dial);dials.push(dial);
  ring(dial,.33,.012,finishMaterial('cyan'));
  for(let j=0;j<8;j++){const a=j*Math.PI/4,mark=part(socketRoot,j===0?.035:.022,.018,j===0?.15:.07,j===0?'cyan':'gold',x+Math.sin(a)*.41,.08,-Math.cos(a)*.41,.002);mark.rotation.y=-a;}
  const marker=part(dial,.042,.025,.11,'warm',0,.04,-.31,.012);marker.userData.aoExclude=true;
  const cap=cylinder(dial,.25,.065,finishMaterial('gold'),0,.06,0);cap.visible=false;chips.push(cap);
 }
 let loaded=false,disposed=false;
 return {group:g,sockets,dials,ready:()=>loaded,
  async loadRodin(manifest){const parts=await Promise.all(manifest.files.map(async url=>{const r=await fetch(url);if(!r.ok)throw new Error('Model '+r.status);return r.arrayBuffer();}));const stream=new Blob(parts).stream().pipeThrough(new DecompressionStream('gzip')),buffer=await new Response(stream).arrayBuffer();const gltf=await new GLTFLoader().parseAsync(buffer,'');if(disposed)return;const model=gltf.scene;model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const scale=3.6/size.x;model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.envMapIntensity=.75;if(m.map)m.map.anisotropy=4;}}});model.name='星图校准台 · Hyper3D Rodin';g.add(model);housing.visible=false;socketRoot.position.set(0,1.84,.40);socketRoot.rotation.x=.48;loaded=true;return model;},
  update(dt,state){dials.forEach((d,i)=>{const target=state.dials[i]*Math.PI/4;let delta=Math.atan2(Math.sin(target-d.rotation.y),Math.cos(target-d.rotation.y));d.rotation.y+=delta*(1-Math.exp(-10*dt));chips[i].visible=!!state.slots[i];});},
  dispose(){disposed=true;}
 };
}
export function createStarChart(root){
 const board=new THREE.Group();board.position.set(0,3.85,-6.08);root.add(board);
 const mat=inscription('云层  →  坐标  →  链路',1024,256);part(board,7.6,1.25,.035,mat,0,.2,0,.015);
 const sub=new THREE.Mesh(new THREE.PlaneGeometry(5.8,.36),inscription('北位 0  ·  顺时针每格 45°',1024,128));sub.position.set(0,-.8,.025);board.add(sub);
 return board;
}
