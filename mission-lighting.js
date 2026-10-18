import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {CachedAOPass as SSAOPass} from './cached-ao.js?art=34b';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {CinematicLensPass,createFilmGrade} from './cinematic-lens.js?art=34b';
import {createArchitecturalSky} from './architectural-lighting.js?art=34b';

export function createMissionLighting(stage){
 const {renderer,scene}=stage;
 // Keep the character's neutral face fill, and move the key to a low west sun.
 const lights=scene.children.filter(o=>o.isDirectionalLight),sun=lights.find(o=>o.castShadow);
 sun.color.set('#ffe0a8');sun.intensity=4.2;sun.position.set(-17,12,9);sun.target.position.set(0,0,-6);sun.shadow.mapSize.set(innerWidth<760?1024:2048,innerWidth<760?1024:2048);
 Object.assign(sun.shadow.camera,{left:-28,right:28,top:25,bottom:-25,near:.1,far:90});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.018;sun.shadow.bias=-.00006;sun.shadow.radius=3;
 lights.filter(o=>o!==sun).forEach((o,i)=>{o.intensity=[.6,.35,.25][i]??.3;});
 const hemi=scene.children.find(o=>o.isHemisphereLight);if(hemi){hemi.color.set('#c7ddff');hemi.groundColor.set('#bbad92');hemi.intensity=.48;}
 const sky=createArchitecturalSky(renderer);scene.environment=sky.get('evening');scene.environmentIntensity=.42;
 renderer.toneMappingExposure=1.06;
 const composer=new EffectComposer(renderer);for(const target of [composer.renderTarget1,composer.renderTarget2]){target.depthTexture=new THREE.DepthTexture(target.width,target.height,THREE.UnsignedIntType);target.samples=2;}
 const beauty=new RenderPass(scene,stage.camera);composer.addPass(beauty);
 const ao=new SSAOPass(scene,stage.camera,800,450,16);ao.kernelRadius=.65;ao.minDistance=.0004;ao.maxDistance=.017;composer.addPass(ao);
 const renderAO=ao.render.bind(ao);ao.render=(...args)=>{const hidden=[];scene.traverse(o=>{if(o.visible&&o.userData.aoExclude){hidden.push(o);o.visible=false;}});try{renderAO(...args);}finally{hidden.forEach(o=>o.visible=true);}};
 const bloom=new UnrealBloomPass(new THREE.Vector2(800,450),.2,.55,1.35);composer.addPass(bloom);
 const lens=new CinematicLensPass(stage.camera);lens.uniforms.orthographic={value:1};lens.material.fragmentShader=lens.material.fragmentShader.replace('uniform float cameraNear,cameraFar,focusDistance,focusBand,aperture,maxBlur,bokehGain;','uniform float cameraNear,cameraFar,focusDistance,focusBand,aperture,maxBlur,bokehGain,orthographic;').replace('return cameraNear*cameraFar/(cameraFar+d*(cameraNear-cameraFar));','return mix(cameraNear*cameraFar/(cameraFar+d*(cameraNear-cameraFar)),mix(cameraNear,cameraFar,d),orthographic);');lens.uniforms.aperture.value=6;composer.addPass(lens);
 const grade=createFilmGrade();grade.uniforms.uWarmth.value=.016;grade.uniforms.uShadowLift.value=.004;grade.uniforms.uGlow.value=.014;composer.addPass(grade);composer.addPass(new OutputPass());
 let lastCamera;
 function syncCamera(){if(lastCamera===stage.camera)return;lastCamera=stage.camera;beauty.camera=stage.camera;ao.camera=stage.camera;ao.ssaoMaterial.defines.PERSPECTIVE_CAMERA=stage.camera.isPerspectiveCamera?1:0;ao.ssaoMaterial.needsUpdate=true;lens.camera=stage.camera;lens.uniforms.orthographic.value=stage.camera.isOrthographicCamera?1:0;}
 return {resize(w,h){syncCamera();composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);ao.setSize(Math.round(w*.6*stage.budget.scale),Math.round(h*.6*stage.budget.scale));},render(){syncCamera();const runner=stage.camera.isPerspectiveCamera;const target=stage.focusTarget?.clone()||new THREE.Vector3(0,.6,runner?-7:0),dir=new THREE.Vector3();stage.camera.getWorldDirection(dir);const focus=target.sub(stage.camera.position).dot(dir);lens.uniforms.focusDistance.value=focus;lens.uniforms.focusBand.value=stage.depthOfField?.band??(stage.exhibition?8:runner?13:7);lens.uniforms.aperture.value=stage.depthOfField?.aperture??(stage.exhibition?2.2:runner?3.5:8);composer.render();},dispose(){sky.dispose();composer.passes.forEach(p=>p.dispose?.());composer.dispose();}};
}
