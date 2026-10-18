import * as THREE from 'three';

// Raycast lightweight roof-derived volumes, never the 8-million-triangle beauty mesh.
// These proxies are interaction bounds, not a replacement for the visible architecture.
export async function createInteractiveLight({scene,camera,canvas,materials,onSelect,onClear,onApproach,describeBuilding}){
 const response=await fetch('./assets/detail/interaction-footprints.json');
 if(!response.ok)throw new Error('建筑交互轮廓载入失败');
 const {buildings,bounds}=await response.json();
 if(describeBuilding)buildings.forEach(b=>{b.modelTitle=b.title;b.title=describeBuilding(b);});
 const byId=new Map(buildings.map(b=>[b.id,b])),proxies=[],group=new THREE.Group();
 group.name='鼠标交互 / 建筑轮廓光';
 const pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster(),normalMatrix=new THREE.Matrix3();
 const maskCanvas=document.createElement('canvas');maskCanvas.width=maskCanvas.height=1024;
 const ctx=maskCanvas.getContext('2d'),[minX,minZ,maxX,maxZ]=bounds;
 ctx.fillStyle='#000';ctx.fillRect(0,0,1024,1024);
 const path=(ring)=>{ring.forEach(([x,z],i)=>{const px=(x-minX)/(maxX-minX)*1024,py=(z-minZ)/(maxZ-minZ)*1024;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();};
 for(const b of buildings){ctx.beginPath();path(b.footprint);b.holes.forEach(path);ctx.fillStyle=`rgb(${b.id*8},0,0)`;ctx.fill('evenodd');}
 const mask=new THREE.CanvasTexture(maskCanvas);mask.flipY=false;mask.colorSpace=THREE.NoColorSpace;mask.minFilter=mask.magFilter=THREE.NearestFilter;mask.generateMipmaps=false;
 const uniforms={
  uPickMask:{value:mask},uPickBounds:{value:new THREE.Vector4(minX,minZ,maxX-minX,maxZ-minZ)},
  uHoverId:{value:0},uSelectedId:{value:0},uHoverGain:{value:0},uSelectedGain:{value:0},
  uClickPoint:{value:new THREE.Vector3()},
  uPickTime:{value:0},uClickAge:{value:10},uBuildingHeight:{value:45}
 };
 // The footprint mask prevents merged material batches from lighting unrelated buildings.
 for(const m of materials.cache.values()){
  if(m.userData.grass||m.userData.paving||m.name==='*55')continue;
  const previous=m.onBeforeCompile,previousKey=m.customProgramCacheKey();
  m.onBeforeCompile=(shader,renderer)=>{
   previous.call(m,shader,renderer);Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='varying vec3 vPickWorld;varying vec3 vPickNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPickWorld=(modelMatrix*vec4(transformed,1.)).xyz;vPickNormal=normalize(mat3(modelMatrix)*objectNormal);');
   shader.fragmentShader=`uniform sampler2D uPickMask;uniform vec4 uPickBounds;
    uniform float uHoverId,uSelectedId,uHoverGain,uSelectedGain,uPickTime,uClickAge,uBuildingHeight;
    uniform vec3 uClickPoint;varying vec3 vPickWorld;varying vec3 vPickNormal;\n`+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    vec2 pickUv=(vPickWorld.xz-uPickBounds.xy)/uPickBounds.zw;
    float pickId=floor(texture2D(uPickMask,clamp(pickUv,0.,1.)).r*255./8.+.5);
    float pickIn=step(0.,pickUv.x)*step(pickUv.x,1.)*step(0.,pickUv.y)*step(pickUv.y,1.)*step(2.,vPickWorld.y);
    float picked=pickIn*(1.-step(.25,abs(pickId-uSelectedId)))*step(.5,uSelectedId)*uSelectedGain;
    float hovered=pickIn*(1.-step(.25,abs(pickId-uHoverId)))*step(.5,uHoverId)*uHoverGain;
    float pickRim=pow(1.-abs(dot(normalize(cameraPosition-vPickWorld),normalize(vPickNormal))),2.);
    float scanY=mod(uClickAge*17.,uBuildingHeight+12.)-6.;
    float scan=exp(-pow((vPickWorld.y-scanY)/2.8,2.))*exp(-uClickAge*.55);
    float clickWave=exp(-pow((distance(vPickWorld,uClickPoint)-uClickAge*28.)/1.8,2.))*max(0.,1.-uClickAge/2.4);
    outgoingLight+=vec3(.07,.74,1.)*(hovered*(.025+.04*pickRim)+picked*(.025+.055*pickRim+.20*scan+.18*clickWave));
    #include <opaque_fragment>`);
  };
  m.customProgramCacheKey=()=>previousKey+'|local-interaction-light-v2';m.needsUpdate=true;
 }
 const proxyMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 const outlineSegments=[],upAxis=new THREE.Vector3(0,1,0),dummy=new THREE.Object3D();
 function addSegment(a,b,id,route,length){
  const distance=a.distanceTo(b);if(distance<.06)return;
  dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(upAxis,b.clone().sub(a).normalize());dummy.scale.set(.24,distance,.24);dummy.updateMatrix();
  outlineSegments.push({matrix:dummy.matrix.clone(),id,route,length:distance});
 }
 for(const b of buildings){
  for(const c of b.contours){
   const shape=new THREE.Shape(c.points.slice(0,-1).map(p=>new THREE.Vector2(p[0],-p[2])));
   const geometry=new THREE.ExtrudeGeometry(shape,{depth:c.height,bevelEnabled:false,steps:1,curveSegments:1});geometry.rotateX(-Math.PI/2);
   const proxy=new THREE.Mesh(geometry,proxyMaterial);proxy.userData.building=b;proxy.updateMatrixWorld();proxies.push(proxy);
   let route=0;for(let i=1;i<c.points.length;i++){
    const a=new THREE.Vector3(...c.points[i-1]),z=new THREE.Vector3(...c.points[i]);a.y+=.20;z.y+=.20;
    addSegment(a,z,b.id,route);route+=a.distanceTo(z);
   }
  }
  let route=0;for(let i=1;i<b.footprint.length;i++){
   const a=new THREE.Vector3(b.footprint[i-1][0],.34,b.footprint[i-1][1]),z=new THREE.Vector3(b.footprint[i][0],.34,b.footprint[i][1]);
   addSegment(a,z,b.id,route);route+=a.distanceTo(z);
  }
 }
 const tube=new THREE.CylinderGeometry(1,1,1,5),ids=new Float32Array(outlineSegments.length),routes=new Float32Array(outlineSegments.length),lengths=new Float32Array(outlineSegments.length);
 outlineSegments.forEach((s,i)=>{ids[i]=s.id;routes[i]=s.route;lengths[i]=s.length;});
 tube.setAttribute('aBuildingId',new THREE.InstancedBufferAttribute(ids,1));tube.setAttribute('aRoute',new THREE.InstancedBufferAttribute(routes,1));tube.setAttribute('aLength',new THREE.InstancedBufferAttribute(lengths,1));
 const outlineMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float aBuildingId,aRoute,aLength;varying float vBuildingId,vRoute;void main(){vBuildingId=aBuildingId;vRoute=aRoute+(position.y+.5)*aLength;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uHoverId,uSelectedId,uHoverGain,uSelectedGain,uPickTime;varying float vBuildingId,vRoute;void main(){
   float s=(1.-step(.25,abs(vBuildingId-uSelectedId)))*uSelectedGain*step(.5,uSelectedId);
   float h=(1.-step(.25,abs(vBuildingId-uHoverId)))*uHoverGain*step(.5,uHoverId);
   float lightWeight=max(s,h*.18);if(lightWeight<.005)discard;
   gl_FragColor=vec4(vec3(.10,1.15,1.45),lightWeight*.55);
  }`});
 const outline=new THREE.InstancedMesh(tube,outlineMaterial,outlineSegments.length);outline.name='选中建筑 / 原屋顶与地面轮廓';outline.frustumCulled=false;
 outlineSegments.forEach((s,i)=>outline.setMatrixAt(i,s.matrix));outline.instanceMatrix.needsUpdate=true;group.add(outline);
 scene.add(group);
 const hint=document.querySelector('#hover-hint');
 const activePointers=new Set();let enabled=true,inside=false,pressed=null,dragged=false,multiTouch=false,pending=null,lastPick=0,hoverHit=null,selected=null,selectedPoint=null,clickStart=-100,clickTimer;
 let hoverGain=0,selectionGain=0,disposed=false,hoverSince=0,scrollUntil=0;
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 function pick(x,y){
  const rect=canvas.getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(proxies,false)[0];
  if(!hit)return null;
  normalMatrix.getNormalMatrix(hit.object.matrixWorld);const normal=hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
  return {record:hit.object.userData.building,point:hit.point.clone(),normal};
 }
 function showHint(hit,now){
  canvas.style.cursor=pressed?'grabbing':hit&&enabled?'pointer':'grab';
  if(!hit||!enabled||now-hoverSince<.18){hint.classList.add('hidden');return;}
  hint.textContent=hit.record.title+' · 点击查看';hint.style.left=`${Math.min(innerWidth-200,Math.max(12,pending.x+18))}px`;hint.style.top=`${Math.min(innerHeight-115,Math.max(18,pending.y-40))}px`;hint.classList.remove('hidden');
 }
 function clearHover(){hoverHit=null;uniforms.uHoverId.value=0;hint.classList.add('hidden');canvas.style.cursor=pressed?'grabbing':'grab';}
 function select(record,point,normal){
  if(!record)return;selected=record;selectedPoint=point?.clone()??new THREE.Vector3(...record.center);clickStart=performance.now()/1000;
  uniforms.uSelectedId.value=record.id;uniforms.uBuildingHeight.value=record.height;uniforms.uClickPoint.value.copy(selectedPoint);
 }
 function clear(){clearTimeout(clickTimer);selected=null;selectedPoint=null;uniforms.uSelectedId.value=0;clearHover();}
 function down(e){
  activePointers.add(e.pointerId);if(activePointers.size>1)multiTouch=true;
  clearTimeout(clickTimer);
  if(multiTouch){pressed=null;clearHover();return;}
  pressed={id:e.pointerId,x:e.clientX,y:e.clientY,type:e.pointerType,button:e.button};dragged=false;clearHover();
 }
 function move(e){
  if(pressed&&Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y)>6)dragged=true;
  if(e.pointerType==='mouse'){inside=true;pending={x:e.clientX,y:e.clientY};}
 }
 function up(e){
  const canClick=pressed?.id===e.pointerId&&pressed.button===0&&!dragged&&!multiTouch&&e.button===0&&Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y)<=6;
  pressed=null;activePointers.delete(e.pointerId);if(activePointers.size===0)multiTouch=false;
  if(canClick){const hit=pick(e.clientX,e.clientY);clearTimeout(clickTimer);clickTimer=setTimeout(()=>{if(disposed)return;if(hit){select(hit.record,hit.point,hit.normal);onSelect(hit.record);}else{clear();onClear();}},220);}
  if(e.pointerType!=='mouse'){inside=false;clearHover();}else pending={x:e.clientX,y:e.clientY};
 }
 function cancel(e){pressed=null;activePointers.delete(e.pointerId);if(activePointers.size===0)multiTouch=false;clearTimeout(clickTimer);clearHover();}
 function leave(){inside=false;clearHover();}
 function wheel(){scrollUntil=performance.now()/1000+.18;clearHover();}
 function doubleClick(e){if(e.button!==0)return;clearTimeout(clickTimer);const hit=pick(e.clientX,e.clientY);if(hit){select(hit.record,hit.point,hit.normal);onSelect(hit.record,{approach:true});}onApproach(hit,e);}
 function blur(){pressed=null;activePointers.clear();multiTouch=false;inside=false;clearTimeout(clickTimer);clearHover();}
 const events={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,pointerleave:leave,wheel,dblclick:doubleClick};
 Object.entries(events).forEach(([name,fn])=>canvas.addEventListener(name,fn));window.addEventListener('blur',blur);
 return {
  group,buildings,select,clear,
  recordForLandmark(i,position){return buildings.filter(b=>b.zone===i).sort((a,b)=>Math.hypot(a.center[0]-position[0],a.center[2]-position[2])-Math.hypot(b.center[0]-position[0],b.center[2]-position[2]))[0];},
  setEnabled(value){enabled=value;group.visible=value;if(!value){clearHover();hoverGain=selectionGain=0;uniforms.uHoverGain.value=uniforms.uSelectedGain.value=0;}},
  getFocus(){if(!enabled||!selectedPoint)return null;const p=selectedPoint.clone().project(camera);return p.z<1&&p.z> -1&&Math.abs(p.x)<.9&&Math.abs(p.y)<.9?selectedPoint:null;},
  update(now,dt,suspended=false){
   uniforms.uPickTime.value=reducedMotion.matches?0:now;uniforms.uClickAge.value=reducedMotion.matches?10:now-clickStart;
   if(inside&&pending&&!pressed&&!multiTouch&&!suspended&&enabled&&now>=scrollUntil&&now-lastPick>1/30){lastPick=now;const next=pick(pending.x,pending.y);if(next?.record.id!==hoverHit?.record.id)hoverSince=now;hoverHit=next;showHint(hoverHit,now);}
   if(pressed||multiTouch||suspended||!enabled||now<scrollUntil)clearHover();
   hoverGain=THREE.MathUtils.damp(hoverGain,hoverHit&&enabled?1:0,12,dt);selectionGain=THREE.MathUtils.damp(selectionGain,selected&&enabled?1:0,9,dt);
   uniforms.uHoverGain.value=enabled?hoverGain:0;uniforms.uSelectedGain.value=enabled?selectionGain:0;
   if(hoverHit&&enabled){
    uniforms.uHoverId.value=hoverHit.record.id;
   }
  },
  dispose(){disposed=true;clearTimeout(clickTimer);Object.entries(events).forEach(([name,fn])=>canvas.removeEventListener(name,fn));window.removeEventListener('blur',blur);proxies.forEach(m=>m.geometry.dispose());proxyMaterial.dispose();mask.dispose();tube.dispose();outlineMaterial.dispose();scene.remove(group);hint.classList.add('hidden');}
 };
}
