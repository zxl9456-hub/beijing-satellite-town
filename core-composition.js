import * as THREE from 'three';

// Spatial art direction only: positions, geometry, scale and interaction bounds stay unchanged.
// Keep the 16 core building groups clear and let peripheral context recede at a distance.
export function createCoreComposition(){
 const uniforms={uCoreContextGain:{value:1}};
 const attached=new Set();
 function install(scene){
  scene.traverse(o=>{
   if(!o.isMesh)return;
   for(const material of Array.isArray(o.material)?o.material:[o.material]){
    if(!material||material.isShaderMaterial||attached.has(material))continue;
    attached.add(material);const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
    material.onBeforeCompile=(shader,renderer)=>{
     previous.call(material,shader,renderer);Object.assign(shader.uniforms,uniforms);
     shader.vertexShader='varying vec3 vCoreContextWorld;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec3 coreContextLocal=transformed;
      #ifdef USE_INSTANCING
       coreContextLocal=(instanceMatrix*vec4(coreContextLocal,1.)).xyz;
      #endif
      vCoreContextWorld=(modelMatrix*vec4(coreContextLocal,1.)).xyz;`);
     shader.fragmentShader='varying vec3 vCoreContextWorld;uniform float uCoreContextGain;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      float coreOutside=max(max(-185.-vCoreContextWorld.x,vCoreContextWorld.x-278.),max(-244.-vCoreContextWorld.z,vCoreContextWorld.z-340.));
      float coreContext=smoothstep(8.,135.,coreOutside)*smoothstep(180.,420.,distance(cameraPosition,vCoreContextWorld))*uCoreContextGain;
      float coreLuma=dot(outgoingLight,vec3(.2126,.7152,.0722));
      vec3 quietContext=mix(outgoingLight,vec3(coreLuma)*vec3(.92,1.,1.035),.43)*.56;
      outgoingLight=mix(outgoingLight,quietContext,coreContext);
      #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=>previousKey+'|core-context-v12';material.needsUpdate=true;
   }
  });
 }
 return {install,setView(view){uniforms.uCoreContextGain.value=['overview','hotel'].includes(view)?1:.45;}};
}
