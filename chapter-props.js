import * as THREE from 'three';
import {part,finishMaterial,flowerbed} from './mission-scenery.js?art=34b';
import {V,disk,arc,line,screen,gate} from './chapter-art.js?art=34b';

export function radarConsole(parent){
 const g=new THREE.Group();parent.add(g);
 for(const [r,h,y,k] of [[3.8,.18,.09,'stone'],[3.65,.13,.245,'gold'],[3.5,.35,.48,'metal'],[3.42,.07,.69,'gold'],[3.25,.06,.76,'glass']])disk(g,r,h,k,0,y);
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;const m=part(g,i%4===0?.075:.035,.023,i%4===0?.22:.11,'gold',Math.sin(a)*3.16,.8,Math.cos(a)*3.16);m.rotation.y=a;}
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const b=part(g,.43,.17,.06,'glass',Math.sin(a)*3.5,.47,Math.cos(a)*3.5);b.rotation.y=a;}
 for(const s of [-1,1]){const sc=screen(g,1.25,.65,s*3.18,1.12,-.85);sc.rotation.x=-.5;sc.rotation.y=-s*.3;part(g,.18,.6,.2,'gold',s*3.18,.78,-.85);}
 const base=new THREE.Group();base.position.set(0,0,-3.5);g.add(base);disk(base,.76,.3,'stone',0,.2);disk(base,.62,.13,'gold',0,.42);part(base,.65,1.6,.65,'metal',0,1.16);for(const s of [-1,1]){const b=part(base,.16,1.9,.24,'gold',s*.5,1.15);b.rotation.z=s*.2;}
 const dish=new THREE.Group();dish.position.set(0,2.65,0);dish.rotation.x=.5;base.add(dish);
 const profile=Array.from({length:25},(_,i)=>{const r=i/24*1.7;return new THREE.Vector2(r,r*r*.23);});
 const face=new THREE.Mesh(new THREE.LatheGeometry(profile,96),new THREE.MeshPhysicalMaterial({color:'#e4e4da',metalness:.65,roughness:.28,side:THREE.DoubleSide}));dish.add(face);const rim=arc(dish,1.7,.06);rim.rotation.x=-Math.PI/2;rim.position.y=.665;
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;line(dish,profile.filter((_,j)=>j%3===0).map(v=>V(Math.sin(a)*v.x,v.y+.008,Math.cos(a)*v.x)),'gold',.012);}
 for(const a of [0,2.094,4.189])line(dish,[V(Math.sin(a)*1.4,.45,Math.cos(a)*1.4),V(0,1.65,0)],'metal',.028);part(dish,.18,.35,.18,'gold',0,1.67);
 return g;
}
export function globeMonument(parent){
 const g=new THREE.Group();parent.add(g);disk(g,1.35,.18,'stone',0,.09);disk(g,1.16,.1,'gold',0,.22);part(g,.9,1,.85,'metal',0,.76);screen(g,.6,.33,0,.8,.44);
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(1.12,64,48),finishMaterial('glass'));sphere.position.y=2.35;g.add(sphere);
 for(let i=0;i<7;i++){const a=(i-3)/4.5;const r=Math.sqrt(1-a*a)*1.125;const m=arc(g,r,.009,'gold');m.rotation.x=-Math.PI/2;m.position.y=2.35+a*1.12;}
 for(let i=0;i<10;i++){const m=arc(g,1.13,.009,'gold');m.position.y=2.35;m.rotation.y=i*Math.PI/10;}
 for(const tilt of [-.6,.7]){const m=arc(g,1.42,.045);m.position.y=2.35;m.rotation.z=tilt;m.rotation.y=tilt;}
 for(const s of [-1,1])flowerbed(g,s*1.25,0,.6,.6,3);
 return g;
}
export function celebrationStage(parent){
 const g=new THREE.Group();parent.add(g);const a=disk(g,4.5,.24,'stone',0,.12);a.scale.z=.56;const b=disk(g,4.25,.1,'gold',0,.28);b.scale.z=.55;const c=disk(g,4.1,.09,'stone',0,.36);c.scale.z=.55;
 for(const s of [-1,1]){const arch=arc(g,2,.11,'metal',0,Math.PI*1.68);arch.position.set(s*.78,2.2,-.4);arch.rotation.z=s*.15+.2;const rim=arc(g,2.01,.018,'warm',0,Math.PI*1.68);rim.position.copy(arch.position);rim.rotation.copy(arch.rotation);
  for(let i=0;i<10;i++){const x=s*(3.1+i*.08),z=-.3+Math.sin(i/9*Math.PI)*.6;part(g,.055,2.3+i*.04,.11,'wood',x,1.6,z);}
  flowerbed(g,s*3.5,.6,1.6,1,3);
 }
 const wire=Array.from({length:24},(_,i)=>V(-4.5+i/23*9,3.7-Math.sin(i/23*Math.PI)*.55,1));line(g,wire,'gold',.012);
 for(let i=0;i<wire.length;i+=2){const bulb=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),finishMaterial('warm'));bulb.position.copy(wire[i]);g.add(bulb);}
 return g;
}
export function diningChair(parent,x,z,angle){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;parent.add(g);const velvet=new THREE.MeshPhysicalMaterial({color:'#608b8b',roughness:.84,sheen:.6,sheenColor:new THREE.Color('#b9d7c8')});part(g,.86,.18,.82,velvet,0,.57,0,.1);part(g,.86,.7,.15,velvet,0,.94,-.35,.1);for(const s of [-1,1]){part(g,.055,.64,.055,'gold',s*.33,.3,-.28);part(g,.055,.53,.055,'gold',s*.33,.27,.28);part(g,.055,.07,.75,'gold',s*.46,.83);part(g,.055,.55,.055,'gold',s*.46,.55,.28);}return g;}
export function guestModel(parent,color){const g=new THREE.Group();parent.add(g);const cloth=new THREE.MeshStandardMaterial({color,roughness:.85}),skin=new THREE.MeshStandardMaterial({color:'#d9b095',roughness:.65});const capsule=(r,len,mat,x,y,z)=>{const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,5,12),mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};capsule(.19,.3,cloth,0,.72,0);capsule(.16,.08,skin,0,1.12,0);const hair=capsule(.165,.02,new THREE.MeshStandardMaterial({color:'#493e35',roughness:.9}),0,1.2,-.035);hair.scale.y=.65;g.userData.legs=[];for(const s of [-1,1]){const leg=capsule(.075,.32,finishMaterial('glass'),s*.1,.28,0);g.userData.legs.push(leg);capsule(.065,.26,cloth,s*.24,.74,0).rotation.z=s*.12;capsule(.055,.04,skin,s*.27,.52,0);part(g,.15,.12,.25,'glass',s*.1,.065,.065);}return g;}
export {gate};
