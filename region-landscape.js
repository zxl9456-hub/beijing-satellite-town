import * as THREE from 'three';
import {preparePlants,plantedTree,flowerbed,lightPost,bench,part,batchStatic} from './mission-scenery.js?art=40a';

export function insideFootprint(x,z,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function signedArea(poly){return poly.reduce((n,p,i)=>{const q=poly[(i+1)%poly.length];return n+p[0]*q[1]-q[0]*p[1];},0)/2;}
function edgeSamples(poly,spacing){const result=[],sign=signedArea(poly)>0?1:-1;let total=0,next=spacing*.5;for(let i=0;i<poly.length-1;i++){const a=poly[i],b=poly[i+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.001)continue;while(next<total+length){const t=(next-total)/length;result.push({x:a[0]+dx*t,z:a[1]+dz*t,nx:sign*dz/length,nz:-sign*dx/length,angle:-Math.atan2(dz,dx)});next+=spacing;}total+=length;}return result;}
function line(parent,a,b,material,r=.045){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.sub(start),length=delta.length();if(length<.01)return;const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,6),material);m.position.copy(start).addScaledVector(delta,.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());m.scale.y=length;parent.add(m);return m;}
function pavedMaterial(){const m=new THREE.MeshStandardMaterial({color:'#d4cbbc',roughness:.86});m.onBeforeCompile=s=>{s.vertexShader='varying vec3 pavingWorld;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\npavingWorld=(modelMatrix*vec4(transformed,1.)).xyz;');s.fragmentShader='varying vec3 pavingWorld;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 uv=pavingWorld.xz/vec2(2.4,1.2);uv.x+=mod(floor(uv.y),2.)*.5;vec2 f=fract(uv);float joint=1.-smoothstep(.008,.026,min(min(f.x,1.-f.x),min(f.y,1.-f.y)));float noise=fract(sin(dot(floor(uv),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=mix(.96+noise*.08,.72,joint);
 `);};m.customProgramCacheKey=()=> 'region-paving-19';return m;}

export async function createRegionLandscape({scene,model,meta,baseCenter,region}){
 const response=await fetch(`./assets/explore/${region.id}.landscape.json?art=19`);if(!response.ok)throw new Error('区域景观数据载入失败');const data=await response.json();await preparePlants();
 const architecture=new THREE.Group();architecture.name='原模型屋顶与立面精饰';model.add(architecture);
 const site=new THREE.Group();site.name='区域景观与入口广场';site.position.set(-baseCenter.x,0,-baseCenter.z);scene.add(site);
 const w=meta.max[0]-meta.min[0]+28,d=meta.max[2]-meta.min[2]+28,cx=(meta.max[0]+meta.min[0])/2,cz=(meta.max[2]+meta.min[2])/2;
 part(site,w,1.6,d,pavedMaterial(),cx,-1.0,cz,.6);
 part(site,w+.5,.26,d+.5,new THREE.MeshStandardMaterial({color:'#b6ada0',roughness:.85}),cx,-1.85,cz,.5);
 const warm=new THREE.MeshStandardMaterial({color:'#fff1c8',emissive:'#ffb95d',emissiveIntensity:3.5,roughness:.35});
 const cyan=new THREE.MeshStandardMaterial({color:'#91ebe3',emissive:'#12bed1',emissiveIntensity:2.5,roughness:.28});
 const shadowFloor=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(w,d)*20,Math.max(w,d)*20),new THREE.MeshStandardMaterial({color:'#d6d9cc',roughness:1}));shadowFloor.rotation.x=-Math.PI/2;shadowFloor.position.set(cx,-1.99,cz);shadowFloor.receiveShadow=true;site.add(shadowFloor);
 let treeCount=0,roofCount=0;
 const occupied=(x,z,padding=2.5)=>data.buildings.some(b=>[[0,0],[padding,0],[-padding,0],[0,padding],[0,-padding]].some(([dx,dz])=>insideFootprint(x+dx,z+dz,b.footprint)));
 const planted=[];
 for(const b of data.buildings){
  const detail=new THREE.Group();detail.userData.buildingId=b.id;architecture.add(detail);
  // Follow the original stepped and curved parapets, with small recessed warm strips.
  for(const c of b.contours){for(let i=1;i<c.points.length;i++){const a=[...c.points[i-1]],q=[...c.points[i]];a[1]=q[1]=c.height-.16;line(detail,a,q,warm,.045);}}
  for(const [x,y,z,h] of b.replacementPlants??[]){const tree=plantedTree(detail,x,z,h/2.8,Math.floor(x+z)%3===0);tree.position.y=y;roofCount++;}
  const anchors=b.roofPlants,step=Math.max(1,Math.floor(anchors.length/18));
  anchors.forEach(([x,y,z,r],i)=>{
   if(i%step!==0)return;const terrace=new THREE.Group();terrace.position.set(x,y,z);detail.add(terrace);
   if(i%3!==1){plantedTree(terrace,0,0,1.05+r*.70,i%3===0);roofCount++;part(terrace,2.5,.24,2.5,'stone',0,.06,0,.12);part(terrace,2.25,.10,2.25,'grass',0,.22,0,.05);}
   else{flowerbed(terrace,0,0,3.0,1.25,i);bench(terrace,0,1.5);}
  });
  // The street furniture is placed outside every source footprint, including neighbouring wings.
  const samples=edgeSamples(b.footprint,23);
  samples.forEach((e,i)=>{const x=e.x+e.nx*5.5,z=e.z+e.nz*5.5;if(occupied(x,z)||planted.some(p=>Math.hypot(x-p[0],z-p[1])<7))return;
   planted.push([x,z]);const bed=new THREE.Group();bed.position.set(x,-.17,z);site.add(bed);part(bed,4.2,.34,3.3,'stone',0,.15,0,.2);part(bed,3.9,.14,3.0,'grass',0,.36,0,.12);const tree=plantedTree(bed,0,0,2.20+(i%3)*.22,(i+b.id)%3!==1);tree.position.y=.4;treeCount++;
   if(i%2===0){const f=flowerbed(site,x+e.nx*2,z+e.nz*2,3.1,1.1,i+b.id);f.rotation.y=e.angle;}
   const lamp=lightPost(site,e.x+e.nx*3.5,e.z+e.nz*3.5,3.4);lamp.position.y=-.12;
   if(i%3===0)bench(site,e.x+e.nx*3.7+e.nz*2,e.z+e.nz*3.7-e.nx*2,e.angle);
  });
  // Ground-level cyan wayfinding is deliberately restrained to a single entrance-side edge.
  const front=edgeSamples(b.footprint,8).filter(e=>e.nz>.65).sort((a,b)=>b.z-a.z)[0];
  if(front){for(const side of [-1,1]){const x=front.x+side*2.6,z=front.z+3.2;if(!occupied(x,z,.2)){line(site,[x,-.10,z],[x,-.10,z+4],cyan,.065);lightPost(site,x,z+4,2.2);}}}
 }
 // Landscaped courtyards occupy the open spaces between the original buildings.
 if(data.buildings.length>1){let count=0;for(let x=meta.min[0]+13;x<meta.max[0]-8;x+=23)for(let z=meta.min[2]+13;z<meta.max[2]-8;z+=23){if(count>=4||occupied(x,z,9)||planted.some(p=>Math.hypot(x-p[0],z-p[1])<12))continue;count++;planted.push([x,z]);const bed=new THREE.Group();bed.position.set(x,-.17,z);site.add(bed);part(bed,8,.28,4.5,'stone',0,.12,0,.35);part(bed,7.7,.12,4.2,'grass',0,.32,0,.28);for(const side of [0]){const t=plantedTree(bed,side*2,0,2.3+(count%3)*.22,(count+side)%3!==0);t.position.y=.38;treeCount++;}flowerbed(site,x,z+2.5,6,1.1,count);bench(site,x,z+4.2);lightPost(site,x+4.5,z+3.8,3.1);}}
 // A little landscape beyond the plinth gives the lens near/far depth while leaving architecture clear.
 for(let i=0;i<4;i++){const x=cx+(i-1.5)*w/3,z=cz-d/2-8-(i%3)*3;plantedTree(site,x,z,2.0+(i%3)*.25,i%3!==0);treeCount++;}
 const foliage=new Set();for(const root of [architecture,site])root.traverse(o=>{if(o.isMesh&&o.material.name==='foliage'&&!foliage.has(o.material)){const m=o.material;foliage.add(m);const c=m.color.getHexString();m.color.set(c==='d4aa47'?'#c9b36f':c==='8eab55'?'#95a578':'#7f9970');m.alphaTest=.28;m.envMapIntensity=.65;}});
 architecture.children.forEach(group=>batchStatic(group));batchStatic(site);
 const clones=new Map();architecture.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(!clones.has(m)){const c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;clones.set(m,c);}o.material=clones.get(m);});
 return {site,architecture,treeCount,roofCount};
}
