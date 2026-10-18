import * as THREE from 'three';

// Linear HDR sky: cool skylight, a peach horizon, and a small bright west sun.
// A neutral lower hemisphere avoids green reflection on the curtain walls.
export function createArchitecturalSky(renderer){
 const pmrem=new THREE.PMREMGenerator(renderer),targets={};
 for(const evening of [false,true]){
  const w=512,h=256,data=new Float32Array(w*h*4);
  const sun=new THREE.Vector3(-360,evening?225:390,650).normalize();
  const zenith=new THREE.Color(evening?'#93afd0':'#a2c1db');
  const horizon=new THREE.Color(evening?'#ffe1ba':'#efe8d9');
  const earth=new THREE.Color('#819096');
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const phi=(x+.5)/w*Math.PI*2,theta=(y+.5)/h*Math.PI;
   const direction=new THREE.Vector3(-Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi));
   const t=direction.y;
   const color=t>=0?horizon.clone().lerp(zenith,Math.pow(t,.6)):earth.clone().lerp(horizon,Math.exp(t*13)*.35);
   const sunDot=Math.max(0,direction.dot(sun));
   const aureole=Math.pow(sunDot,24)*(evening?.75:.30);
   const disc=Math.pow(sunDot,9500)*28;
   color.add(new THREE.Color('#ffd098').multiplyScalar(aureole+disc));
   const cloud=Math.pow(Math.max(0,Math.sin(phi*6.2+theta*9.1)*Math.sin(phi*13.-theta*4.)),5)*Math.exp(-(((t-.16)*8.)**2))*.11;
   color.addScalar(cloud);
   const i=(y*w+x)*4;data[i]=color.r*1.6;data[i+1]=color.g*1.6;data[i+2]=color.b*1.6;data[i+3]=1;
  }
  const tex=new THREE.DataTexture(data,w,h,THREE.RGBAFormat,THREE.FloatType);
  tex.mapping=THREE.EquirectangularReflectionMapping;tex.needsUpdate=true;
  targets[evening?'evening':'afternoon']=pmrem.fromEquirectangular(tex);tex.dispose();
 }
 pmrem.dispose();
 return {get(mode){return targets[mode].texture;},dispose(){Object.values(targets).forEach(t=>t.dispose());}};
}

export async function addArchitecturalLighting(scene){
 const response=await fetch('./assets/detail/eave-contours.json');
 if(!response.ok)throw new Error('建筑灯带文件载入失败');
 const contours=await response.json(),group=new THREE.Group();group.name='建筑科技细节 / 实体屋檐灯带';
 const cyan=new THREE.MeshStandardMaterial({color:'#bfebef',emissive:'#6dcdde',emissiveIntensity:1.55,metalness:.15,roughness:.28});
 const amber=new THREE.MeshStandardMaterial({color:'#ffdab2',emissive:'#ffc17c',emissiveIntensity:2.5,metalness:.15,roughness:.28});
 const baseCyan=cyan.clone();baseCyan.color.set('#69d7e1');baseCyan.emissive.set('#18c9df');baseCyan.emissiveIntensity=6;
 const sleeve=new THREE.MeshPhysicalMaterial({color:'#d9e1e4',metalness:.65,roughness:.26,clearcoat:.4});
 const tube=new THREE.CylinderGeometry(1,1,1,6),dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
 const led=[],cases=[];
 contours.forEach((c,i)=>{
  // Alternating restrained cool eaves and warm hotel / terrace accents.
  for(let j=1;j<c.points.length;j++){
   const a=new THREE.Vector3(...c.points[j-1]),b=new THREE.Vector3(...c.points[j]);
   const length=a.distanceTo(b);if(length<.15)continue;
   dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());
   dummy.scale.set(.13,length,.13);dummy.updateMatrix();led.push({matrix:dummy.matrix.clone(),kind:i%4===1?'warm':'cool'});
   dummy.position.y-=.10;dummy.scale.set(.16,length,.16);dummy.updateMatrix();cases.push(dummy.matrix.clone());
  }
  // The actual podium footprint becomes a cyan entry outline, as in the reference.
  if(c.height>17&&c.height<19&&c.center[0]<-80&&c.center[0]>-150&&c.center[1]>70&&c.center[1]<130){
   for(let j=1;j<c.points.length;j++){
    const a=new THREE.Vector3(c.points[j-1][0],.36,c.points[j-1][2]),b=new THREE.Vector3(c.points[j][0],.36,c.points[j][2]);
    const length=a.distanceTo(b);if(length<.15)continue;
    dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());dummy.scale.set(.18,length,.18);dummy.updateMatrix();led.push({matrix:dummy.matrix.clone(),kind:'base'});
   }
  }
 });
 for(const kind of ['warm','cool','base']){
  const records=led.filter(p=>p.kind===kind);const mesh=new THREE.InstancedMesh(tube,kind==='warm'?amber:kind==='base'?baseCyan:cyan,records.length);mesh.name=kind==='warm'?'香槟色檐口照明':kind==='base'?'裙房入口青蓝轮廓':'青蓝色金属檐口照明';
  records.forEach((p,i)=>mesh.setMatrixAt(i,p.matrix));mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
 }
 const housings=new THREE.InstancedMesh(tube,sleeve,cases.length);housings.name='灯带金属型材';cases.forEach((m,i)=>housings.setMatrixAt(i,m));housings.instanceMatrix.needsUpdate=true;group.add(housings);
 scene.add(group);
 return {group,setLight(mode){cyan.emissiveIntensity=mode==='evening'?1.55:.45;baseCyan.emissiveIntensity=mode==='evening'?6:2;amber.emissiveIntensity=mode==='evening'?2.5:.55;},dispose(){tube.dispose();cyan.dispose();baseCyan.dispose();amber.dispose();sleeve.dispose();}};
}
