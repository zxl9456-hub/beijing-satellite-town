// A small depth grid anchored to actual architectural samples, including curved
// façades and courtyards. Empty parts of bounding boxes cannot receive a touch.
export class ParticlePicking {
  constructor(home, size = 96) { this.home=home;this.size=size;this.indices=new Int32Array(size*size);this.depth=new Float32Array(size*size);this.matrix=null; }
  update(matrix) {
    const e=matrix;
    if(this.matrix && e.every((x,i)=>Math.abs(x-this.matrix[i])<1e-7))return;
    this.matrix=Array.from(e);this.indices.fill(-1);this.depth.fill(Infinity);
    for(let i=0;i<this.home.length;i+=3){
      const x=this.home[i],y=this.home[i+1],z=this.home[i+2],w=e[3]*x+e[7]*y+e[11]*z+e[15];if(w<=0)continue;
      const nx=(e[0]*x+e[4]*y+e[8]*z+e[12])/w,ny=(e[1]*x+e[5]*y+e[9]*z+e[13])/w,nz=(e[2]*x+e[6]*y+e[10]*z+e[14])/w;
      if(Math.abs(nx)>=1||Math.abs(ny)>=1||Math.abs(nz)>1)continue;
      const k=Math.floor((1-ny)*.5*this.size)*this.size+Math.floor((nx+1)*.5*this.size);
      if(nz<this.depth[k]){this.indices[k]=i;this.depth[k]=nz;}
    }
  }
  pick(x,y,matrix,width,height) {
    this.update(matrix);const cx=Math.floor(x*this.size),cy=Math.floor(y*this.size),radius=Math.max(16,Math.min(width,height)*.07),range=Math.min(12,Math.ceil(radius/Math.min(width,height)*this.size)+1);
    let best=-1,distance=radius*radius;
    for(let sy=Math.max(0,cy-range);sy<=Math.min(this.size-1,cy+range);sy++)for(let sx=Math.max(0,cx-range);sx<=Math.min(this.size-1,cx+range);sx++){
      const index=this.indices[sy*this.size+sx];if(index<0)continue;
      const dx=((sx+.5)/this.size-x)*width,dy=((sy+.5)/this.size-y)*height,d=dx*dx+dy*dy;
      if(d<distance){best=index;distance=d;}
    }
    return best<0?null:[this.home[best],this.home[best+1],this.home[best+2]];
  }
}
