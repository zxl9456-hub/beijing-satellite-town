import * as THREE from 'three';

// Lighting is evaluated at the actual hit surface. No screen-space cursor overlay.
export function createSurfaceFeedback({scene,camera,canvas,root,scale=10,onDirty=()=>{},onTap=()=>{},enabled=()=>true}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),normalMatrix=new THREE.Matrix3();
 const uniforms={uSurfacePoint:{value:new THREE.Vector3()},uSurfaceGain:{value:0},uSurfaceRadius:{value:scale*.085},uSurfaceClick:{value:new THREE.Vector3()},uSurfaceAge:{value:10}};
 const originals=new Map(),clones=new Map(),targets=[];
 root.traverse(o=>{if(!o.isMesh||!o.visible)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();targets.push(o);originals.set(o,o.material);
  const adapt=m=>{if(clones.has(m))return clones.get(m);const clone=m.clone(),compile=m.onBeforeCompile,key=m.customProgramCacheKey();
   clone.onBeforeCompile=(shader,renderer)=>{compile.call(clone,shader,renderer);Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec3 vSurfaceWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvSurfaceWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader='varying vec3 vSurfaceWorld;uniform vec3 uSurfacePoint,uSurfaceClick;uniform float uSurfaceGain,uSurfaceRadius,uSurfaceAge;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float surfaceFalloff=exp(-pow(distance(vSurfaceWorld,uSurfacePoint)/uSurfaceRadius,2.)*2.);
     float surfaceRim=pow(1.-abs(dot(normalize(vViewPosition),normal)),2.);
     float surfaceWave=exp(-pow((distance(vSurfaceWorld,uSurfaceClick)/uSurfaceRadius-uSurfaceAge*3.)/.13,2.))*max(0.,1.-uSurfaceAge/.65);
     outgoingLight+=vec3(.42,.32,.17)*surfaceFalloff*uSurfaceGain*(.12+.32*surfaceRim)+vec3(.10,.28,.30)*surfaceWave*.22;
     #include <opaque_fragment>`);
   };clone.customProgramCacheKey=()=>key+'|surface-feedback-33';clones.set(m,clone);return clone;
  };o.material=Array.isArray(o.material)?o.material.map(adapt):adapt(o.material);
 });
 const ring=new THREE.Mesh(new THREE.RingGeometry(.78,1,48),new THREE.MeshBasicMaterial({color:'#c3e2d8',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));ring.visible=false;ring.renderOrder=4;scene.add(ring);
 let pickDirty=false,pending=null,hit=null,lastPick=0,down=null,blocked=false,age=10,disposed=false;const contacts=new Set();
 function pick(e){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return null;pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);root.updateWorldMatrix(true,true);camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);return ray.intersectObjects(targets.filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}),false)[0]??null;}
 function clear(){pickDirty=false;pending=null;hit=null;canvas.style.cursor='grab';onDirty();}
 function pulse(h){if(!h||reduced.matches)return;age=0;uniforms.uSurfaceClick.value.copy(h.point);normalMatrix.getNormalMatrix(h.object.matrixWorld);const n=h.face.normal.clone().applyMatrix3(normalMatrix).normalize();ring.position.copy(h.point).addScaledVector(n,scale*.0006);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);onDirty();}
 const events={
  pointermove:e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down.moved=true;if(e.pointerType==='mouse'&&!e.buttons){pending=e;pickDirty=true;onDirty();}else clear();},
  pointerdown:e=>{contacts.add(e.pointerId);if(contacts.size>1)blocked=true;down=e.button===0&&!blocked?{id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),moved:false}:null;clear();},
  pointerup:e=>{const tap=down?.id===e.pointerId&&!blocked&&!down.moved&&performance.now()-down.time<400&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<=6;down=null;contacts.delete(e.pointerId);if(!contacts.size)blocked=false;if(tap&&enabled()){const h=pick(e);if(h){pulse(h);onTap(h,e);}}},
  pointercancel:e=>{contacts.delete(e.pointerId);down=null;if(!contacts.size)blocked=false;clear();},pointerleave:clear,wheel:clear
 };Object.entries(events).forEach(([k,v])=>canvas.addEventListener(k,v,{passive:true}));
 const blur=()=>{down=null;contacts.clear();blocked=false;clear();};window.addEventListener('blur',blur);
 return {pulse,clear,get hit(){return hit;},update(dt,now){if(disposed)return false;if(!enabled()){hit=null;pending=null;pickDirty=false;}
   if(pickDirty&&pending&&!down&&enabled()&&now-lastPick>70){lastPick=now;pickDirty=false;hit=pick(pending);if(hit)uniforms.uSurfacePoint.value.copy(hit.point);canvas.style.cursor=hit?'pointer':'grab';}
   const desired=hit&&!reduced.matches?1:0;uniforms.uSurfaceGain.value=THREE.MathUtils.damp(uniforms.uSurfaceGain.value,desired,16,dt);
   age+=dt;uniforms.uSurfaceAge.value=age;ring.visible=age<.65;ring.scale.setScalar(scale*(.009+age*.06));ring.material.opacity=(1-age/.65)*.45;
   canvas.dataset.surface=hit?'building':'none';return pickDirty||Math.abs(uniforms.uSurfaceGain.value-desired)>.002||age<.65;
  },dispose(){disposed=true;Object.entries(events).forEach(([k,v])=>canvas.removeEventListener(k,v));window.removeEventListener('blur',blur);originals.forEach((m,o)=>o.material=m);clones.forEach(m=>m.dispose());ring.removeFromParent();ring.geometry.dispose();ring.material.dispose();}
 };
}
