import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const ease = x => { x = THREE.MathUtils.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const duration = {wave: 3.6, heart: 4.2, duet: 4.8};

// Home-only poses; rounded suit sleeves retain volume at the shoulder and elbow.
export function createHomeCompanions(scene, onFinish) {
  const rigs = new Map();
  let action = null;
  const effects = new THREE.Group();
  effects.name = 'Companion interaction keepsakes';
  scene.add(effects);
  const heart = new THREE.Shape();
  heart.moveTo(0, -.72);
  heart.bezierCurveTo(-1.45, .12, -.8, 1.12, 0, .48);
  heart.bezierCurveTo(.8, 1.12, 1.45, .12, 0, -.72);
  const heartGeometry = new THREE.ExtrudeGeometry(heart, {depth: .11, bevelEnabled: true, bevelSize: .07, bevelThickness: .06, bevelSegments: 3, steps: 1, curveSegments: 18});
  const heartMaterial = new THREE.MeshStandardMaterial({color:'#e5a49c', roughness:.35, metalness:.08, emissive:'#a3433a', emissiveIntensity:.16, transparent:true});
  const hearts = Array.from({length:5}, () => {
    const mesh = new THREE.Mesh(heartGeometry, heartMaterial.clone());
    mesh.visible=false;effects.add(mesh); return mesh;
  });
  const starShape = new THREE.Shape();
  for(let i=0;i<10;i++) {
    const a=i*Math.PI/5+Math.PI/2, r=i%2?.38:1;
    const x=Math.cos(a)*r,y=Math.sin(a)*r;
    if(i)starShape.lineTo(x,y);else starShape.moveTo(x,y);
  }
  starShape.closePath();
  const starGeometry = new THREE.ExtrudeGeometry(starShape,{depth:.08,bevelEnabled:true,bevelSize:.035,bevelThickness:.03,bevelSegments:2,steps:1});
  const stars = Array.from({length:7},(_,i)=>{
    const mesh=new THREE.Mesh(starGeometry,new THREE.MeshStandardMaterial({color:i%2?'#8dc5ca':'#e6c586',roughness:.3,metalness:.12,transparent:true}));
    mesh.visible=false;effects.add(mesh);return mesh;
  });
  const modelQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),desired=new THREE.Vector3(),from=new THREE.Vector3(),targetQ=new THREE.Quaternion(),deltaQ=new THREE.Quaternion();
  function register(buddy) {
    const bones=new Map();
    buddy.model.traverse(b=>{if(b.isBone)bones.set(b.name.replace(/\./g,''),{bone:b,q:b.quaternion.clone(),p:b.position.clone()});});
    rigs.set(buddy.key,{...buddy,bones,basePosition:buddy.group.position.clone(),baseRotation:buddy.group.quaternion.clone(),look:{x:0,y:0,targetX:0,targetY:0}});
  }
  function setLookTarget(key,x,y) {
    const look=rigs.get(key)?.look;if(!look)return;
    look.targetX=Number.isFinite(x)?THREE.MathUtils.clamp(x,-1,1):0;
    look.targetY=Number.isFinite(y)?THREE.MathUtils.clamp(y,-1,1):0;
  }
  function clearLook() {rigs.forEach(r=>{r.look.targetX=r.look.targetY=0;});}
  const lookQ=new THREE.Quaternion(),lookEuler=new THREE.Euler(0,0,0,'YXZ'),pivot=new THREE.Vector3(),offset=new THREE.Vector3();
  function applyLook(r,dt,strength) {
    const look=r.look,isStar=r.key==='xingzai';
    const returning=look.targetX===0&&look.targetY===0;
    const mix=1-Math.exp(-Math.max(0,dt)*(returning?4.8:isStar?7.5:6.5));
    look.x=THREE.MathUtils.lerp(look.x,look.targetX,mix);look.y=THREE.MathUtils.lerp(look.y,look.targetY,mix);
    const x=look.x*strength,y=look.y*strength;
    // Rotate around each character's centre, keeping the standing/floating
    // position stable. Head and body share the turn instead of twisting the neck.
    pivot.set(0,isStar?.95:.63,0);offset.copy(pivot).applyQuaternion(r.group.quaternion);
    lookQ.setFromEuler(lookEuler.set(y*(isStar?.045:.16),x*(isStar?.26:.48),isStar?0:-x*.025));
    r.group.quaternion.multiply(lookQ);
    r.group.position.add(offset).sub(pivot.applyQuaternion(r.group.quaternion));
    if(isStar){const head=r.bones.get('Head');if(head){lookQ.setFromEuler(lookEuler.set(y*.10,x*.20,-x*.012));head.bone.quaternion.multiply(lookQ);}}
  }
  function aim(rig,name,direction,weight=1) {
    const entry=rig.bones.get(name.replace(/\./g,''));if(!entry)return;
    const b=entry.bone;
    rig.model.updateWorldMatrix(true,true);
    rig.model.getWorldQuaternion(modelQ);b.parent.getWorldQuaternion(parentQ).invert();
    desired.set(...direction).normalize().applyQuaternion(modelQ).applyQuaternion(parentQ);
    from.copy(UP).applyQuaternion(entry.q);
    deltaQ.setFromUnitVectors(from,desired);
    targetQ.copy(deltaQ).multiply(entry.q);
    b.quaternion.slerp(targetQ,weight);
  }
  function tilt(rig,name,x,y,z,weight=1) {
    const e=rig.bones.get(name.replace(/\./g,''));if(!e)return;
    targetQ.setFromEuler(new THREE.Euler(x,y,z));
    targetQ.premultiply(e.q);e.bone.quaternion.slerp(targetQ,weight);
  }
  function play(mode,key,still=false) {
    if(!duration[mode])return;
    const starts=new Map();
    rigs.forEach((r,k)=>starts.set(k,{p:r.group.position.clone(),q:r.group.quaternion.clone(),bones:new Map([...r.bones].map(([name,e])=>[name,e.bone.quaternion.clone()]))}));
    action={mode,key,t:still?1.5:0,blend:still?1:0,starts};
    update(0,0,still);
  }
  function update(dt,time,staticPose=false) {
    hearts.forEach(m=>m.visible=false);stars.forEach(m=>m.visible=false);
    if(action){action.t+=dt;action.blend+=dt/ .32;}
    const t=action?.t||0, mode=action?.mode;
    const w=action?ease(t/.55)*(1-ease((t-(duration[mode]-.65))/.65)):0;
    rigs.forEach(r=>{
      r.bones.forEach(e=>{e.bone.quaternion.copy(e.q);e.bone.position.copy(e.p);});
      r.group.position.copy(r.basePosition);r.group.quaternion.copy(r.baseRotation);
      if(!staticPose){
        r.group.position.y+=Math.sin(time*1.8+(r.key==='xingzai'?0:1))*(r.key==='xingzai'?.008:.035);
        tilt(r,r.key==='xingzai'?'Head':'Body',0,0,Math.sin(time*.85)*.018);
      }
      const involved=action&&(mode==='duet'||action.key===r.key);
      if(involved){
        const isStar=r.key==='xingzai';
        if(mode==='wave'){
          // A clear raised hand with a small wrist wave, away from the face.
          const swing=Math.sin(Math.max(0,t-.5)*9)*.23;
          aim(r,isStar?'UpperArm.L':'Arm.L',isStar?[.95,.12,.24]:[.85,.30,.12],w);
          if(isStar)aim(r,'Forearm.L',[.42+swing*.5,1,.12],w);
          tilt(r,'Hand.L',0,0,swing,w);
          tilt(r,isStar?'Head':'Body',0,-.06,-.055,w);
          r.group.position.y+=Math.sin(t*3)*.025*w;
        } else if(mode==='heart'){
          for(const [side,sign] of [['L',1],['R',-1]]){
            aim(r,isStar?'UpperArm.'+side:'Arm.'+side,[-sign*.18,-.25,.92],w);
            if(isStar)aim(r,'Forearm.'+side,[-sign*.60,.28,.65],w);
            tilt(r,'Hand.'+side,0,sign*.18,-sign*.2,w);
          }
          tilt(r,isStar?'Head':'Body',.07,0,.04,w);
          r.group.rotation.y=THREE.MathUtils.lerp(r.group.rotation.y,0,w);
        } else if(mode==='duet'){
          const sign=isStar?1:-1;
          r.group.position.x+=sign*.10*w;
          r.group.position.y+=Math.abs(Math.sin((t-.5)*3.4))*.085*w;
          r.group.rotation.z=sign*Math.sin((t-.4)*3.4)*.045*w;
          r.group.rotation.y+=sign*.12*w;
          for(const [side,s] of [['L',1],['R',-1]]){
            aim(r,isStar?'UpperArm.'+side:'Arm.'+side,isStar?[s*.98,.06+Math.sin(t*5+s)*.07,.18]:[s*.9,.25+Math.sin(t*5+s)*.2,.15],w);
            if(isStar)aim(r,'Forearm.'+side,[s*.52,.95,.15],w);
          }
          tilt(r,isStar?'Head':'Body',0,-sign*.10,sign*.025,w);
        }
      }
      // Gestures stay readable; looking follows gently underneath their poses.
      if(!staticPose)applyLook(r,dt,1-(involved?w*(mode==='heart'?.75:mode==='duet'?.65:.35):0));
      if(action&&action.blend<1){
        const start=action.starts.get(r.key),mix=ease(action.blend);
        if(start){r.group.position.lerpVectors(start.p,r.group.position,mix);r.group.quaternion.slerpQuaternions(start.q,r.group.quaternion,mix);r.bones.forEach((e,name)=>e.bone.quaternion.slerpQuaternions(start.bones.get(name),e.bone.quaternion,mix));}
      }
    });
    if(mode==='heart'){
      const r=rigs.get(action.key);
      if(r){
        const y=r.key==='xingzai'?.72:.50;
        hearts.forEach((m,i)=>{
          const delay=i*.18, rise=ease((t-.8-delay)/2.5), appear=ease((t-.45-delay)/.35)*w;
          m.visible=appear>.001;m.scale.setScalar((i===0?.16:.052)*appear);
          m.position.set(i?Math.sin(i*2.3)*.25*rise:0,y+(i?rise*.8:0),.55+(i?rise*.1:0)).applyQuaternion(r.group.quaternion).add(r.group.position);
          m.rotation.set(0,Math.sin(t*2+i)*.15, i?Math.sin(t+i)*.15:0);
          m.quaternion.premultiply(r.group.quaternion);
          m.material.opacity=i?appear*.8:appear;
        });
      }
    }
    if(mode==='duet')stars.forEach((m,i)=>{
      const a=i/7*Math.PI*2+t*.55;
      m.visible=w>.001;m.scale.setScalar((i%2?.065:.045)*w);
      m.position.set(.10+Math.cos(a)*1.55,1.35+Math.sin(a)*.73,.12+Math.cos(a)*.08);
      m.rotation.z=-a*.3;m.material.opacity=w*.9;
    });
    if(action&&t>=duration[mode]){action=null;onFinish?.();}
  }
  return {register,play,update,setLookTarget,clearLook,dispose(){effects.removeFromParent();heartGeometry.dispose();heartMaterial.dispose();starGeometry.dispose();[...hearts,...stars].forEach(m=>m.material.dispose());}};
}
