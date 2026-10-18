import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {CustomBlending,Matrix4} from 'three';
// Static architecture does not need a second geometry pass every animation frame.
// Camera/viewport/scene changes invalidate immediately; moving scenes opt out.
export class CachedAOPass extends SSAOPass{
 constructor(...args){super(...args);this.cacheStatic=false;this.cacheValid=false;this.cachedScene=null;this.cachedView=new Matrix4();this.cachedProjection=new Matrix4();}
 invalidate(){this.cacheValid=false;}
 setSize(w,h){super.setSize(w,h);this.cacheValid=false;}
 render(renderer,write,read,...rest){
  this.camera.updateMatrixWorld();const valid=this.cacheStatic&&this.cacheValid&&this.cachedScene===this.scene&&this.cachedView.equals(this.camera.matrixWorld)&&this.cachedProjection.equals(this.camera.projectionMatrix);
  if(valid){this.copyMaterial.uniforms.tDiffuse.value=this.blurRenderTarget.texture;this.copyMaterial.blending=CustomBlending;this._renderPass(renderer,this.copyMaterial,this.renderToScreen?null:read);return;}
  // The beauty pass already updated the shadow atlas; normals do not need it again.
  const auto=renderer.shadowMap.autoUpdate,dirty=renderer.shadowMap.needsUpdate;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
  try{super.render(renderer,write,read,...rest);}finally{renderer.shadowMap.autoUpdate=auto;renderer.shadowMap.needsUpdate=dirty;}
  this.cachedScene=this.scene;this.cachedView.copy(this.camera.matrixWorld);this.cachedProjection.copy(this.camera.projectionMatrix);this.cacheValid=true;
 }
}
