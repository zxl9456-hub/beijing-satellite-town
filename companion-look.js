import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// A continuous sky reflection gives animated characters broad tonal gradients,
// without the rectangular studio highlights that made them read as vinyl toys.
function characterEnvironment(renderer){
  const studio=new THREE.Scene(),geometry=new THREE.SphereGeometry(20,32,24);
  const p=geometry.attributes.position,colors=new Float32Array(p.count*3);
  const sky=new THREE.Color('#ceddec'),horizon=new THREE.Color('#a5b2c1'),ground=new THREE.Color('#756c63'),color=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const y=p.getY(i)/20;
    color.copy(y>=0?horizon:ground).lerp(y>=0?sky:horizon,y>=0?Math.sqrt(y):1+y);
    color.toArray(colors,i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide});
  studio.add(new THREE.Mesh(geometry,material));
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.025);
  geometry.dispose();material.dispose();pmrem.dispose();return environment;
}

export function createCompanionStudio(renderer,scene,{world=false}={}){
  let environment;
  if(world){
    const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
    environment=pmrem.fromScene(studio,.035);studio.dispose();pmrem.dispose();
  }else environment=characterEnvironment(renderer);
  scene.environment=environment.texture;
  scene.environmentIntensity=world?.46:.80;
  if(!world)renderer.shadowMap.type=THREE.VSMShadowMap;
  const hemisphere=new THREE.HemisphereLight(world?'#e8f2ff':'#d8e6fa',world?'#b4b4b7':'#8a705c',world?.38:.32);
  scene.add(hemisphere);
  const key=new THREE.DirectionalLight(world?'#fff8ef':'#fff5eb',world?2.45:3.1);
  key.position.set(world?-3.8:-5,world?5:6,world?4.5:3.8);key.target.position.set(0,1,0);
  key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-3,right:3,top:3.5,bottom:-2,near:.1,far:18});
  key.shadow.normalBias=.009;key.shadow.bias=-.00008;key.shadow.radius=5;
  if(!world){key.shadow.mapSize.set(1024,1024);key.shadow.blurSamples=8;}
  scene.add(key,key.target);
  if(world){
    // The architecture retains its established sunset lighting.
    for(const [color,intensity,position] of [['#e6efff',.65,[4,2,4]],['#ffd099',1.7,[-4,3,-2.5]],['#c5e5ff',.55,[3,2.5,-3]]]){
      const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);scene.add(light);
    }
  }else{
    const bounce=new THREE.DirectionalLight('#cddff5',.14);
    bounce.position.set(4,2,-1);scene.add(bounce);
  }
  return {dispose(){environment.dispose();}};
}

export function prepareCompanionMaterials(model,key,{directLightScale=1}={}){
  const converted=new Map();
  function convert(source){
    if(converted.has(source))return converted.get(source);
    if(!source.isMeshStandardMaterial)return source;
    const material=new THREE.MeshPhysicalMaterial();
    THREE.MeshStandardMaterial.prototype.copy.call(material,source);
    material.name=`${source.name} / ${key} animation finish`;
    material.envMapIntensity=.62;material.ior=1.43;material.specularIntensity=.68;
    material.clearcoat=.025;material.clearcoatRoughness=.5;material.metalness=0;
    material.roughness=1;material.normalScale.setScalar(.07);
    if(material.map)material.map.anisotropy=4;
    material.emissiveIntensity=key==='xunbao'?.48:0;
    if(!material.map)material.color.set('#e4e5e5');
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 ipLocalPosition;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nipLocalPosition = position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 ipLocalPosition;')
        .replace('#include <map_fragment>',`
          #include <map_fragment>
          vec3 ipBase=diffuseColor.rgb;
          float ipMax=max(max(ipBase.r,ipBase.g),ipBase.b),ipMin=min(min(ipBase.r,ipBase.g),ipBase.b);
          float ipSaturation=(ipMax-ipMin)/max(ipMax,0.001);
          float ipLuma=dot(ipBase,vec3(0.2126,0.7152,0.0722));
          float ipBlue=smoothstep(0.025,0.13,ipBase.b-ipBase.r)*smoothstep(0.25,0.55,ipSaturation);
          float ipOrange=smoothstep(0.12,0.36,ipBase.r-ipBase.b)*smoothstep(0.45,0.70,ipSaturation);
          float ipSkin=${key==='xingzai'?'1.0':'0.0'}*smoothstep(0.06,0.18,ipBase.r-ipBase.b)
            *(1.0-smoothstep(0.52,0.72,ipSaturation))*smoothstep(0.35,0.65,ipBase.r);
          float ipShell=(1.0-smoothstep(0.12,0.32,ipSaturation))*smoothstep(0.15,0.45,ipLuma);
          float ipSuit=${key==='xingzai'?'1.0':'0.0'}*ipShell*(1.0-smoothstep(0.77,0.88,ipLocalPosition.y));
          float ipFaceRegion=smoothstep(0.17,0.24,ipLocalPosition.z)*(1.0-smoothstep(0.25,0.35,abs(ipLocalPosition.x)));
          float ipEyes=${key==='xingzai'?'1.0':'0.0'}*ipBlue*ipFaceRegion*smoothstep(0.92,1.04,ipLocalPosition.y)*(1.0-smoothstep(1.35,1.47,ipLocalPosition.y));
          float ipDisplay=${key==='xunbao'?'1.0':'0.0'}*ipFaceRegion*smoothstep(0.01,0.10,ipBase.b-ipBase.r)*(1.0-smoothstep(0.055,0.18,ipLuma));
          // Retain occlusion/seams but flatten baked hot spots. Lighting creates the volume.
          vec3 ipWhite=vec3(0.92,0.92,0.90)*mix(0.86,1.0,smoothstep(0.08,0.78,ipLuma));
          vec3 ipColor=mix(ipBase,ipWhite,ipShell);
          vec3 ipBlueColor=mix(ipBase,vec3(0.004,0.23,0.42)*mix(0.76,1.08,smoothstep(0.025,0.45,ipLuma)),0.70);
          vec3 ipOrangeColor=mix(ipBase,vec3(0.95,0.19,0.010)*mix(0.84,1.08,smoothstep(0.08,0.65,ipLuma)),0.70);
          ipColor=mix(ipColor,ipBlueColor,ipBlue*(1.0-max(ipEyes,ipDisplay)));
          ipColor=mix(ipColor,ipOrangeColor,ipOrange);
          vec3 ipSkinColor=mix(ipBase,vec3(1.0,0.64,0.43)*mix(0.72,1.10,smoothstep(0.25,0.75,ipLuma)),0.48);
          diffuseColor.rgb=clamp(mix(ipColor,ipSkinColor,ipSkin),0.0,1.0);
        `).replace('#include <roughnessmap_fragment>',`
          #include <roughnessmap_fragment>
          roughnessFactor=mix(0.52,0.46,ipBlue);
          roughnessFactor=mix(roughnessFactor,0.46,ipOrange);
          roughnessFactor=mix(roughnessFactor,0.70,ipSuit);
          roughnessFactor=mix(roughnessFactor,0.76,ipSkin);
          roughnessFactor=mix(roughnessFactor,0.30,max(ipEyes,ipDisplay));
        `).replace('#include <lights_physical_fragment>',`
          #include <lights_physical_fragment>
          material.clearcoat=mix(0.012,0.065,max(ipEyes,ipDisplay));
          material.clearcoat*=1.0-max(ipSuit,ipSkin);
          material.clearcoatRoughness=mix(0.55,0.32,max(ipEyes,ipDisplay));
          material.specularColor*=mix(0.75,0.35,max(ipSkin,ipSuit));
        `).replace('#include <lights_fragment_end>',`
          #include <lights_fragment_end>
          // Compensate for the brighter architectural sun on game characters only.
          reflectedLight.directDiffuse*=${directLightScale.toFixed(3)};
          reflectedLight.directSpecular*=${directLightScale.toFixed(3)};
          // Subtle warm diffuse wrap on skin, without an emissive/glowing surface.
          float ipSoftEdge=pow(1.0-saturate(dot(normal,geometryViewDir)),2.0);
          reflectedLight.indirectDiffuse+=diffuseColor.rgb*vec3(0.10,0.042,0.025)*ipSkin*(0.35+ipSoftEdge*0.65);
        `);
    };
    material.customProgramCacheKey=()=>`ip-animation-v38-${key}-${directLightScale}`;
    converted.set(source,material);source.dispose();return material;
  }
  model.traverse(object=>{if(object.isMesh)object.material=Array.isArray(object.material)?object.material.map(convert):convert(object.material);});
}
