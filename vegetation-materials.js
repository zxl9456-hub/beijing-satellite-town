import * as THREE from 'three';

// A thin-leaf backlight approximation. The incoming light already includes its shadow mask.
export function protectVegetationLighting(shader){
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nif(any(notEqual(normal,normal)))normal=vec3(0.,0.,1.);');
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','if(any(notEqual(outgoingLight,outgoingLight)))outgoingLight=vec3(0.);outgoingLight=clamp(outgoingLight,vec3(0.),vec3(48.));\n#include <opaque_fragment>');
}
export function addLeafTransmission(shader,mask='1.0',strength=.22){
 protectVegetationLighting(shader);
 const call='RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
 const lights=THREE.ShaderChunk.lights_fragment_begin.replaceAll(call,call+`
 { float leafBack=pow(clamp(.5-.5*dot(geometryNormal,directLight.direction),0.,1.),2.);
  float leafForward=pow(max(0.,dot(geometryViewDir,-directLight.direction)),3.);
  reflectedLight.directDiffuse+=diffuseColor.rgb*directLight.color*${mask}*leafBack*(.42+.58*leafForward)*${strength.toFixed(3)}*RECIPROCAL_PI; }
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',lights);
}

export function configurePhotographicTree(material,{maps,center,height,isBranch}){
 const leaf=material.name==='foliage',branch=isBranch??(material.map?.image?.src??material.map?.name??'').includes('_branch_');
 material.transparent=false;material.depthWrite=true;material.metalness=0;material.color.set(leaf?'#ffffff':'#e3ded0');
 material.normalMap=leaf?maps.leafNormal:branch?maps.branchNormal:maps.barkNormal;
 material.normalScale=new THREE.Vector2(leaf?.58:.85,leaf?.58:.85);
 material.roughnessMap=leaf?maps.leafARM:branch?maps.branchARM:maps.barkARM;
 material.aoMap=material.roughnessMap;material.aoMapIntensity=leaf?.45:.8;material.roughness=leaf?.79:.92;material.envMapIntensity=leaf?.46:.38;
 if(leaf){
  material.alphaMap=maps.alpha;material.alphaTest=.34;material.alphaToCoverage=false;material.side=THREE.DoubleSide;
  material.onBeforeCompile=s=>{
   s.uniforms.canopyCenter={value:new THREE.Vector3(center.x,height*.57,center.z)};
   s.vertexShader='uniform vec3 canopyCenter;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvec3 canopyNormal=normalize((position-canopyCenter)*vec3(1.,.62,1.));objectNormal=normalize(mix(objectNormal,canopyNormal,.24));');
   s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
    vec4 sampledDiffuseColor=texture2D(map,vMapUv);
    float leafLuma=dot(sampledDiffuseColor.rgb,vec3(.24,.62,.14));
    vec3 leafDetail=vec3(clamp(pow(max(leafLuma,.001),.65)*1.85,.025,.78));
    diffuseColor.rgb*=mix(leafDetail,sampledDiffuseColor.rgb*1.8,.18);
    diffuseColor.a*=sampledDiffuseColor.a;
    #endif`);
   addLeafTransmission(s);
  };
  material.customProgramCacheKey=()=> 'photographic-thin-leaf-pbr-v2';
 }else{material.onBeforeCompile=protectVegetationLighting;material.customProgramCacheKey=()=> 'photographic-bark-pbr-v2';}
 return material;
}
