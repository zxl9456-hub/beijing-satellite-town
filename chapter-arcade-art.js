import * as THREE from 'three';
import {part,pavement,finishMaterial,flowerbed,plantedTree,glazedBuilding,lightPost,bench,batchStatic,makeGround} from './mission-scenery.js?art=34b';
import {V,disk,arc,line,heroAsset} from './chapter-art.js?art=34b';
import {gate} from './chapter-props.js?art=34b';
import {label} from './mission-stage.js?art=34b';

export function flightPort(stage,root){
 pavement(root,55,85,0,-20,-.8);const runway=part(root,20.6,.2,58,'glass',0,-.55,-17);runway.material=finishMaterial('glass').clone();runway.material.color.set('#263e4b');runway.material.roughness=.34;
 for(let i=0;i<30;i++){const z=10-i*2;part(root,20,.012,.013,'metal',0,-.44,z);for(const s of [-1,1]){part(root,.035,.02,58,'gold',s*10.1,-.43,-17);part(root,.16,.025,.55,'warm',s*9.7,-.42,z);if(i%4===0){lightPost(root,s*11.4,z,1.6);flowerbed(root,s*12.6,z,1.4,2,i%4);}}}
 for(const x of [-6,-2,2,6])part(root,.014,.015,58,'metal',x,-.43,-17);
 for(let i=0;i<15;i++)for(const s of [-1,1]){const chevron=part(root,.55,.018,.04,'gold',s*.22,-.41,8-i*3);chevron.rotation.y=s*.6;}
 const port=new THREE.Group();port.userData.keepSeparate=true;root.add(port);port.position.set(0,-.4,-23);const arch=gate(port,{width:20,height:8});heroAsset(stage,'incubation',port,22,arch);label(root,'STARFLIGHT / 逐星试飞港',0,6.8,-23,8);
 for(const s of [-1,1]){for(let i=0;i<4;i++){const z=-3-i*13;glazedBuilding(root,s*19,z,7,4+i%2,8);plantedTree(root,s*13.8,z-3,1.2,i%2===0);const dock=part(root,4,.4,7,'stone',s*15,.15,z+1);for(let j=0;j<5;j++)part(root,3.8,.08,.4,'glass',s*15,.4,z-1+j*.8);}
  for(let i=0;i<4;i++){const g=new THREE.Group();g.position.set(s*12,0,-10-i*9);root.add(g);disk(g,.6,.15,'metal');disk(g,.48,.05,'cyan',0,.12);part(g,.12,1.4,.12,'gold',0,.7);part(g,.65,.35,.1,'metal',0,1.4);}}
 stage.depthOfField={band:32,aperture:1.3};stage.focusTarget=V(0,0,-8);batchStatic(root,new Set([port]));
}
export function dressShip(g,color){
 const white=finishMaterial('metal').clone();white.color.set('#e9e7df');white.roughness=.25;white.clearcoat=.6;
 const body=new THREE.Mesh(new THREE.SphereGeometry(.4,32,24),white);body.scale.set(.95,.52,2.3);body.position.set(0,.18,0);body.castShadow=true;g.add(body);
 const canopy=new THREE.Mesh(new THREE.SphereGeometry(.27,32,20),finishMaterial('glass'));canopy.scale.set(.85,.55,1.65);canopy.position.set(0,.4,-.2);g.add(canopy);
 const accent=new THREE.MeshPhysicalMaterial({color,roughness:.32,metalness:.4});
 for(const s of [-1,1]){const shape=new THREE.Shape();shape.moveTo(s*.2,-.6);shape.lineTo(s*1.05,.4);shape.lineTo(s*.9,.7);shape.lineTo(s*.25,.35);shape.closePath();const wing=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:3,steps:1}),white);wing.rotation.x=Math.PI/2;wing.position.y=.15;wing.castShadow=true;g.add(wing);part(g,.08,.035,.65,accent,s*.63,.18,.24);const pod=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.65,4,16),finishMaterial('gold'));pod.rotation.x=Math.PI/2;pod.position.set(s*.49,.14,.42);g.add(pod);const tail=arc(g,.085,.02,'cyan');tail.position.set(s*.49,.14,.86);part(g,.025,.16,.36,accent,s*.2,.38,.5);}
}
export function runnerRoute(stage,root){
 stage.scene.background.set('#e1dfd0');stage.scene.fog.color.set('#d6ddcf');stage.scene.fog.near=44;stage.scene.fog.far=110;stage.depthOfField={band:25,aperture:1.6};stage.focusTarget=V(0,1,-9);
 makeGround(root,70,170,'#a6b287',0,-60);pavement(root,7,170,0,-60,.025);
 for(const s of [-1,1]){pavement(root,1.3,170,s*4.2,-60,.02);part(root,.07,.025,170,'gold',s*3.48,.1,-60);part(root,.025,.025,170,'warm',s*3.4,.1,-60);}
 const tiles=[];
 for(let i=0;i<8;i++){
  const g=new THREE.Group();root.add(g);g.position.z=-i*12;tiles.push(g);
  for(const s of [-1,1]){plantedTree(g,s*5.5,-6,1.25,i%3===0);flowerbed(g,s*4.7,-3,1.1,2,3);lightPost(g,s*3.95,-6,2.1);bench(g,s*5.1,1,s>0?-Math.PI/2:Math.PI/2);glazedBuilding(g,s*(11+i%2*2),-3,5.4,5+i%3,6);for(let j=0;j<4;j++)part(g,.04,.01,.9,'stone',s,.09,-j*3);}
  batchStatic(g);
 }
 const portal=new THREE.Group();root.add(portal);portal.position.set(0,0,-38);const arch=gate(portal,{width:8.1,height:4.7,wood:true});heroAsset(stage,'talent',portal,10,arch);label(portal,'林荫社区 / 星光步道',0,4.6,0,4.8);
 const water=new THREE.Group();root.add(water);for(const s of [-1,1]){const p=part(water,4,.025,22,'glass',s*8,.1,-25);p.material=finishMaterial('glass').clone();p.material.color.set('#6b9c9d');for(let i=0;i<8;i++){part(water,4.1,.035,.09,'wood',s*8,.13,-35+i*3);}}
 const sports=new THREE.Group();root.add(sports);for(const s of [-1,1]){part(sports,5,.04,13,'glass',s*7,.1,-9);for(const z of [-15,-3])part(sports,4.7,.015,.045,'stone',s*7,.14,z);for(const x of [4.65,9.35])part(sports,.04,.015,12,'stone',s*x,.14,-9);const r=arc(sports,1,.016,'stone');r.rotation.x=-Math.PI/2;r.position.set(s*7,.15,-9);part(sports,.1,2.7,.12,'metal',s*7,1.4,-15);part(sports,1.3,.75,.09,'metal',s*7,2.8,-15);const hoop=arc(sports,.28,.025,'gold');hoop.rotation.x=-Math.PI/2;hoop.position.set(s*7,2.5,-14.65);}
 sports.visible=false;
 return {tiles,portal,water,sports,update(distance){tiles.forEach((g,i)=>g.position.z=12-((i*12+96-distance%96)%96));portal.position.z=-38+(distance%120);portal.visible=portal.position.z<-7;water.visible=distance>=120&&distance<240;sports.visible=distance>=240;}};
}

export function orbitalObject(e){
 const g=new THREE.Group(),s=e.size||.7;
 if(e.type==='trash'){
  const core=part(g,s*.5,s*.45,s*.62,'metal',0,.1);core.rotation.set(.2,.3,.15);
  part(g,s*.52,.025,s*.3,'gold',0,.36,0);const engine=disk(g,s*.18,s*.3,'glass',0,.15,s*.38);engine.rotation.x=Math.PI/2;
  for(const side of [-1,1]){part(g,s*.35,.035,.06,'gold',side*s*.39,.1);const wing=new THREE.Group();wing.position.set(side*s*.59,.11,0);wing.rotation.z=side*.22;g.add(wing);part(wing,s*.5,.025,s*.65,'metal');part(wing,s*.44,.012,s*.59,'glass',0,.022);for(let i=0;i<4;i++)part(wing,s*.44,.008,.009,'gold',0,.032,(i-1.5)*s*.15);}
 }else if(e.type==='ufo'){
  const saucer=new THREE.Mesh(new THREE.SphereGeometry(s*.62,32,16),finishMaterial('metal'));saucer.scale.y=.23;saucer.position.y=.16;saucer.castShadow=true;g.add(saucer);
  const rim=arc(g,s*.6,.026,'gold');rim.rotation.x=-Math.PI/2;rim.position.y=.16;
  const dome=new THREE.Mesh(new THREE.SphereGeometry(s*.34,32,20,0,Math.PI*2,0,Math.PI/2),finishMaterial('glass'));dome.position.y=.2;g.add(dome);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const m=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),finishMaterial('warm'));m.position.set(Math.sin(a)*s*.52,.1,Math.cos(a)*s*.52);g.add(m);}
 }else{const b=new THREE.Mesh(new THREE.SphereGeometry(.2,24,16),new THREE.MeshPhysicalMaterial({color:'#afdce2',metalness:.15,roughness:.12,clearcoat:1}));g.add(b);}
 return g;
}
