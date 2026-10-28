import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {yieldToBrowser} from './render-budget.js?art=37a';
// Reuse the same mesh/material/interaction objects; only the geometry changes.
export function createParkDetail({town,info,materials,onChange=()=>{}}){
 const records=[];town.traverse(mesh=>{if(mesh.isMesh)records.push({mesh,overview:mesh.geometry,full:null});});
 const controller=new AbortController();let disposed=false,loading=false,loaded=false,wanted=false,applied=false,index=0,retryAt=0,settledAt=0;
 async function load(){loading=true;try{
  const parts=await Promise.all(info.modelFiles.map(async file=>{const r=await fetch('./assets/'+file,{signal:controller.signal});if(!r.ok)throw Error('Detail model '+r.status);return r.arrayBuffer();}));
  const raw=await new Response(new Blob(parts).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const {scene}=await new GLTFLoader().parseAsync(raw,'./assets/');const meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
  if(disposed){meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});return;}
  if(meshes.length!==records.length||meshes.some((m,i)=>m.name!==records[i].mesh.name))throw Error('Detail geometry layout mismatch');
  for(let i=0;i<meshes.length;i++){
   const m=meshes[i],original=m.material;m.material=records[i].mesh.material;materials.setUV(m);original.dispose();records[i].full=m.geometry;
   if(i%12===0)await yieldToBrowser();if(disposed){meshes.forEach(o=>o.geometry.dispose());return;}
  }
  loaded=true;index=0;
 }catch(e){if(!disposed){retryAt=performance.now()+30000;console.warn('Close-view detail remains available for retry',e.message);}}finally{loading=false;}}
 return {update(distance,moving,now){
  const next=distance<(wanted?260:220);if(next!==wanted){wanted=next;index=0;settledAt=now;}
  if(wanted&&!loaded&&!loading&&!moving&&now>retryAt&&now-settledAt>400)load();
  if(loaded&&(applied!==wanted||index<records.length)){let changed=false;for(let count=0;index<records.length&&count<4;count++,index++){const r=records[index];r.mesh.geometry=wanted?r.full:r.overview;changed=true;}if(index===records.length)applied=wanted;if(changed)onChange();}
  return loading?'loading':applied?'full':'overview';
 },dispose(){disposed=true;controller.abort();records.forEach(r=>{r.overview.dispose();r.full?.dispose();});}};
}
