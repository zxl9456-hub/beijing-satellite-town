import * as THREE from 'three';

// Local architectural finishes: source material assignments remain distinct.
export function createRegionMaterials(){
 const cache=new Map();
 function material(source){
  const name=source.name,role=source.userData.artRole;
  if(cache.has(name))return cache.get(name);
  const green=role==='grass'||['*6','*32'].includes(name)||name.includes('酒店庭园');
  const glass=!green&&(role==='glass'||['*11','*12','*25','*29','*34','*38','*65','_9U)HQBFXUM5HCINFK2_Y(3'].includes(name)||/Glass|玻璃|boli|sqbl|Enscape/.test(name)||name==='Material.002');
  const dark=/深灰|深色|Black/.test(name);
  const frame=['*22','*27','*52'].includes(name)||name.includes('Aluminum')||name.includes('facade fins');
  const m=new THREE.MeshPhysicalMaterial({name,color:green?'#748844':glass?'#41677d':dark?'#637783':frame?'#b9c1c2':'#e2ded2',metalness:glass?.34:dark?.25:frame?.30:.05,roughness:green?.91:glass?.19:dark?.48:frame?.31:.65,clearcoat:glass?.7:frame?.25:.08,clearcoatRoughness:.20,envMapIntensity:glass?1.1:.62,side:THREE.DoubleSide});
  m.userData={...source.userData,glass,roofGarden:green};
  if(glass){m.emissive.set('#ffb14d');m.emissiveIntensity=.85;}
  m.onBeforeCompile=s=>{
   s.vertexShader='varying vec3 regionPosition;varying vec3 regionNormal;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nregionPosition=position;regionNormal=normal;');
   s.fragmentShader='varying vec3 regionPosition;varying vec3 regionNormal;\nfloat rhash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}\n'+s.fragmentShader;
   if(glass){
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     vec3 rn=normalize(regionNormal);float wall=1.-smoothstep(.4,.8,abs(rn.y));
     vec2 facade=abs(rn.z)>abs(rn.x)?regionPosition.xy:regionPosition.zy;
     vec2 cell=floor((facade+vec2(.37,0.))/vec2(1.65,3.6)),pane=fract((facade+vec2(.37,0.))/vec2(1.65,3.6));
     float occupied=step(.34,rhash(cell));float edge=min(min(pane.x,1.-pane.x),min(pane.y,1.-pane.y));
     float inset=smoothstep(.012,.045,edge);float curtain=.7+.3*smoothstep(.1,.9,sin(pane.x*35.));
     diffuseColor.rgb*=.68+rhash(cell)*.5;
     diffuseColor.rgb=mix(vec3(.28,.34,.36),diffuseColor.rgb,inset);
     diffuseColor.rgb=mix(vec3(.72,.69,.62),diffuseColor.rgb,wall);
    `);
    s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
     float ceiling=smoothstep(.82,.87,pane.y)*(1.-smoothstep(.93,.98,pane.y));
     float desk=step(.73,pane.x)*step(pane.y,.22);
     totalEmissiveRadiance*=wall*inset*occupied*(.42*curtain+ceiling*.8+desk*.13);
    `);
   }else{
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     float grain=rhash(floor(regionPosition.xz*55.)+floor(regionPosition.y*41.));
     diffuseColor.rgb*=.95+grain*.1;
     ${green?'diffuseColor.rgb*=.90+.1*sin(regionPosition.x*.35)*sin(regionPosition.z*.52);diffuseColor.rgb=mix(vec3(.62,.64,.59),diffuseColor.rgb,smoothstep(.55,.9,abs(normalize(regionNormal).y)));':''}
    `);
   }
  };
  m.customProgramCacheKey=()=>`region-finish-19-${glass}-${green}`;cache.set(name,m);return m;
 }
 return {material,setUV(){},update(){},dispose(){cache.forEach(m=>m.dispose());}};
}
