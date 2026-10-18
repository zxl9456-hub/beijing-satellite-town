import * as THREE from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

// Read beauty-pass depth. Trees and small lights use their actual scene distance.
// No extra geometry render is required for focus or bokeh.
export class CinematicLensPass extends ShaderPass {
 constructor(camera){
  super({
   uniforms:{tDiffuse:{value:null},tDepth:{value:null},resolution:{value:new THREE.Vector2(1,1)},cameraNear:{value:camera.near},cameraFar:{value:camera.far},focusDistance:{value:250},focusBand:{value:30},aperture:{value:18},maxBlur:{value:10},bokehGain:{value:.07}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`
    uniform sampler2D tDiffuse,tDepth;
    uniform vec2 resolution;
    uniform float cameraNear,cameraFar,focusDistance,focusBand,aperture,maxBlur,bokehGain;
    varying vec2 vUv;
    float distanceAt(vec2 uv){float d=texture2D(tDepth,uv).x;return cameraNear*cameraFar/(cameraFar+d*(cameraNear-cameraFar));}
    float coc(float z){float limit=maxBlur*mix(1.,.66,step(focusDistance,z));return min(limit,max(0.,abs(z-focusDistance)-focusBand)/max(z,1.)*aperture);}
    void main(){
     float z=distanceAt(vUv),radius=coc(z);
     vec3 center=texture2D(tDiffuse,vUv).rgb;
     if(radius<.25){gl_FragColor=vec4(center,1.);return;}
     vec3 sum=center;float total=1.;
     // A fixed disk kernel produces round highlights and avoids directional stripes.
     for(int i=0;i<32;i++){
      float f=float(i)+.5,angle=f*2.39996323;
      vec2 disk=vec2(cos(angle),sin(angle))*sqrt(f/32.);
      vec2 uv=clamp(vUv+disk*radius/resolution,vec2(.001),vec2(.999));
      float sampleZ=distanceAt(uv),sampleCoC=coc(sampleZ);
      // Keep a focused silhouette from bleeding into a blurred foreground.
      float crossFocus=step(focusDistance,z)*step(sampleZ,focusDistance-focusBand);
      float weight=mix(1.,.10,crossFocus)*mix(.20,1.,smoothstep(.0,1.5,sampleCoC+radius*.12));
      vec3 color=texture2D(tDiffuse,uv).rgb;
      float energy=max(max(color.r,color.g),color.b);
      weight*=1.+smoothstep(.8,3.,energy)*bokehGain;
      sum+=color*weight;total+=weight;
     }
     gl_FragColor=vec4(sum/total,1.);
    }
   `
  });
  this.camera=camera;this.material.depthTest=false;this.material.depthWrite=false;
 }
 updateFocus(target,view,focusSubject=null,dt=.05){
  const direction=new THREE.Vector3();this.camera.getWorldDirection(direction);
  const subject=(focusSubject??target).clone();if(!focusSubject)subject.y+=view==='garden'?.28:['trees','foliage'].includes(view)?.5:view==='overview'?5:8;
  const focus=Math.max(15,subject.sub(this.camera.position).dot(direction));
  const smoothed=THREE.MathUtils.damp(this.uniforms.focusDistance.value,focus,7,dt);this.uniforms.focusDistance.value=smoothed;
  this.uniforms.focusBand.value=smoothed*(focusSubject?.12:['trees','foliage'].includes(view)?.24:view==='garden'?.12:view==='overview'?.20:view==='courtyard'?.14:.12);
  this.uniforms.aperture.value=['trees','foliage'].includes(view)?8:view==='garden'?17:view==='overview'?17:view==='courtyard'?25:20;
 }
 render(renderer,writeBuffer,readBuffer,...rest){
  this.uniforms.tDepth.value=this.depthTexture??readBuffer.depthTexture;
  this.uniforms.resolution.value.set(readBuffer.width,readBuffer.height);
  this.uniforms.cameraNear.value=this.camera.near;this.uniforms.cameraFar.value=this.camera.far;
  const scale=readBuffer.height/900;
  this.uniforms.maxBlur.value=(this.uniforms.aperture.value>22?13:10)*scale;
  // Match the visual blur in CSS pixels across desktop and high-DPI phones.
  this.uniforms.aperture.value*=scale;
  super.render(renderer,writeBuffer,readBuffer,...rest);
  this.uniforms.aperture.value/=scale;
 }
}

export function createFilmGrade(){
 const pass=new ShaderPass({uniforms:{tDiffuse:{value:null},uWarmth:{value:.038},uGlow:{value:.016},uShadowLift:{value:.027}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
  uniform sampler2D tDiffuse;uniform float uWarmth,uGlow,uShadowLift;varying vec2 vUv;
  void main(){
   vec3 color=texture2D(tDiffuse,vUv).rgb;
   float luminance=dot(color,vec3(.2126,.7152,.0722));
   color=mix(vec3(luminance),color,1.10);
   float shade=1.-smoothstep(.08,.52,luminance);
   color*=mix(vec3(1.),vec3(.96,1.,1.045),shade*.45);
   color+=vec3(1.,1.025,1.07)*shade*uShadowLift;
   color*=vec3(1.+uWarmth,1.,1.-uWarmth*.65);
   float veil=pow(max(0.,1.-length((vUv-vec2(.06,.94))*vec2(.9,1.))),4.);
   color+=vec3(1.,.66,.32)*veil*uGlow;
   float vignette=smoothstep(.82,.18,length((vUv-.5)*vec2(.85,1.)));
   color*=mix(.975,1.,vignette);
   gl_FragColor=vec4(max(color,0.),1.);
  }`});
 pass.material.depthTest=false;pass.material.depthWrite=false;return pass;
}
