// One deterministic timeline drives the particles, architecture and its shadows.
// Ground-to-roof gathering is adapted to each region's own footprint and height.
export const GROWTH_DURATION = 8.4;
export const LOCAL_DURATION = .29;
const clamp = v => Math.max(0, Math.min(1, v));
export function arrivalAt(x,y,z,bounds,height){
 const front=clamp((bounds[3]-z)/Math.max(1,bounds[3]-bounds[2]));
 const across=clamp((bounds[1]-x)/Math.max(1,bounds[1]-bounds[0]));
 const h=clamp(y/height);
 const ripple=Math.sin(x/height*2.3+z/height*1.7)*Math.sin(z/height*3.1-x/height*.8);
 return Math.max(.015,Math.min(.69,.025+front*.10+across*.04+h*.49+ripple*.014));
}
export function growthPhase(progress){return progress>=1?'完整凝聚':progress<.20?'基座聚形':progress<.65?'主体与幕墙生长':progress<.88?'屋顶收束':'材质凝聚';}
export function surfaceAt(progress,arrival){const t=clamp((progress-arrival)/LOCAL_DURATION);const v=clamp((t-.66)/.34);const m=clamp((progress-.56)/.40);return v*v*(3-2*v)*m*m*(3-2*m);}
export const growthFieldGLSL = `
 uniform float uGrowth,uHeight,uSpan,uCohesion;
 uniform vec4 uGrowthBounds;
 float arrivalAt(vec3 p){
   float front=clamp((uGrowthBounds.w-p.z)/max(1.,uGrowthBounds.w-uGrowthBounds.z),0.,1.);
   float across=clamp((uGrowthBounds.y-p.x)/max(1.,uGrowthBounds.y-uGrowthBounds.x),0.,1.);
   float h=clamp(p.y/uHeight,0.,1.);
   float ripple=sin(p.x/uHeight*2.3+p.z/uHeight*1.7)*sin(p.z/uHeight*3.1-p.x/uHeight*.8);
   return clamp(.025+front*.10+across*.04+h*.49+ripple*.014,.015,.69);
 }
 float localGrowth(float arrival){return clamp((uGrowth-arrival)/${LOCAL_DURATION},0.,1.);}
 float solidGrowth(float local){return smoothstep(.66,1.,local)*smoothstep(.56,.96,uGrowth)*uCohesion;}
`;
const trajectory = `
 vec3 gather(vec3 home,float local,float seed,float clock){
   float land=smoothstep(.08,1.,local),loose=1.-land;
   float crest=sin(local*3.14159265);
   vec3 q=home/max(uSpan,.001)*13.;
   // Coherent rolling folds keep neighboring grains in flowing ribbons.
   float fold=sin(q.x*1.2+q.z*.7-clock*1.1+sin(q.z*1.7+clock*.3));
   vec3 eddy=vec3(sin(q.z+clock*.7)-cos(q.y-clock*.4),
                 sin(q.x-clock*.5)-cos(q.z+clock*.6),
                 sin(q.y+clock*.4)-cos(q.x-clock*.5));
   vec3 p=home;
   p.x+=loose*uSpan*(.085+eddy.x*.025+fold*.023);
   p.z+=loose*uSpan*(.05+eddy.z*.023+fold*.018+(seed-.5)*.014);
   p.y=mix(.20+seed*.28,home.y,land)+crest*(uHeight*.25+uSpan*.026)*(1.+fold*.28);
   p.y+=loose*eddy.y*uSpan*.003;
   return p;
 }
`;
export const growthVertex = `
 attribute vec3 aHome;attribute float aSeed,aArrival,aBuilding;
 uniform float uTime,uSize,uSelected,uPulse,uDust;
 varying vec3 vColor;varying float vAlpha;
 ${growthFieldGLSL}
 ${trajectory}
 void main(){
   float local=localGrowth(aArrival),land=smoothstep(.08,1.,local);
   float moving=sin(local*3.14159265),energy=moving*(1.-land);
   vec3 p=local>=1.0?position:gather(aHome,local,aSeed,uTime)+(position-aHome)*land;
   float dustEnvelope=smoothstep(.0,.15,local)*(1.-smoothstep(.45,.99,local));
   if(uDust>.5){
     float turn=aSeed*31.+uTime*1.4+aHome.z/uSpan*8.;
     p+=vec3(cos(turn),sin(turn*.7)*.7,sin(turn))*(.005+aSeed*.025)*uSpan*dustEnvelope;
   }
   vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
   float selected=(1.-step(.1,abs(aBuilding-uSelected)))*uPulse;
   vec3 porcelain=mix(color*.10,vec3(.012,.10,.16),.62);
   vec3 gold=mix(vec3(.26,.085,.012),vec3(.82,.36,.045),aSeed);
   vColor=mix(porcelain,gold,.18+energy*1.8)+selected*vec3(.12,.48,.55);
   float shimmer=.91+.09*sin(uTime*.7+aSeed*170.);
   vAlpha=smoothstep(.0,.10,local)*(.80+.20*moving)*shimmer*(1.-solidGrowth(local));
   float size=clamp(uSize*460./max(1.,-mv.z),1.5,4.4)*(1.+energy*.4);
   if(uDust>.5){vColor=mix(vec3(.10,.75,.94),vec3(2.4,1.25,.34),step(.18,aSeed));vAlpha=dustEnvelope*.60;size*=.6+aSeed*.5;}
   gl_PointSize=size;
 }
`;
export const growthFragment = `
 varying vec3 vColor;varying float vAlpha;
 void main(){
   float d=length(gl_PointCoord-.5)*2.;if(d>1.||vAlpha<.001)discard;
   float core=exp(-d*d*3.7);if(vAlpha*core<.025)discard;
   gl_FragColor=vec4(vColor,vAlpha*core);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
 }
`;

// Apply the identical spatial reveal to PBR materials and depth/shadow materials.
export function bindGrowthMaterial(material,uniforms){
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
   compile.call(material,shader,renderer);
   for(const name of ['uGrowth','uHeight','uSpan','uCohesion','uGrowthBounds'])shader.uniforms[name]=uniforms[name];
   shader.vertexShader='varying vec3 vGrowthWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
     vec4 growthWorld=vec4(transformed,1.);
     #ifdef USE_INSTANCING
       growthWorld=instanceMatrix*growthWorld;
     #endif
     vGrowthWorld=(modelMatrix*growthWorld).xyz;
   `);
   shader.fragmentShader='varying vec3 vGrowthWorld;\n'+growthFieldGLSL+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
     float growthSolid=solidGrowth(localGrowth(arrivalAt(vGrowthWorld)));
     float growthGrain=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
     if(growthSolid<.001||growthGrain>growthSolid)discard;
   `);
 };
 material.customProgramCacheKey=()=>key+'|town-flow-growth-33';material.needsUpdate=true;
}
