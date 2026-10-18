// Match GPU work to the viewport; sustained slow frames lower resolution gradually.
// Simulation steps, input handling and the original geometry are unaffected.
export function pixelRatioFor(width,height,{dpr=globalThis.devicePixelRatio||1,scale=1,max=1.5,mobile=width<760}={}){
 const pixels=mobile?1100000:2100000;
 return Math.min(dpr,max,Math.sqrt(pixels/Math.max(1,width*height)))*scale;
}
export class RenderBudget{
 constructor(){this.scale=1;this.last=0;this.elapsed=0;this.samples=0;this.slow=0;this.cooldown=2400;}
 reset(){this.last=0;this.elapsed=0;this.samples=0;this.slow=0;}
 sample(now){const dt=now-this.last;this.last=now;if(dt<=0||dt>200){this.elapsed=this.samples=this.slow=0;return false;}this.cooldown-=dt;
  if(this.cooldown>0)return false;this.elapsed+=dt;this.samples++;if(dt>24)this.slow++;
  if(this.elapsed<2000||this.samples<25)return false;
  const struggling=this.slow/this.samples>.4;this.elapsed=this.samples=this.slow=0;
  if(struggling&&this.scale>.76){this.scale=Math.max(.75,Math.round((this.scale-.125)*1000)/1000);this.cooldown=5000;return true;}return false;
 }
}
export const yieldToBrowser=()=>new Promise(resolve=>setTimeout(resolve,0));
