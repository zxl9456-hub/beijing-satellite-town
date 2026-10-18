// Decorative feedback only. Native cursors and scene input always stay in charge.
const PREFERENCE='satellite-town-cursor-light';
export function createCursorLight({pointer,surface,enabled=true}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=enabled,gesture=null,disposed=false,scrollUntil=0;
 const pulses=new Map();
 try{const saved=localStorage.getItem(PREFERENCE);if(saved!==null)active=saved==='on';}catch{}
 const allowed=e=>!disposed&&active&&!reduced.matches&&!document.hidden&&e.pointerType==='mouse'&&e.target===surface&&performance.now()>=scrollUntil;
 function hide(){pointer.classList.add('hidden');}
 function clear(){hide();for(const [node,timer] of pulses){clearTimeout(timer);node.remove();}pulses.clear();}
 function reset(){gesture=null;clear();}
 function show(e){pointer.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;pointer.classList.remove('hidden');}
 function move(e){
  if(gesture&&e.pointerId===gesture.id&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>5)gesture.dragged=true;
  if(!allowed(e)||e.buttons||gesture){hide();return;}
  show(e);
 }
 function down(e){
  clear();
  if(gesture){gesture=null;return;}
  if(!allowed(e)||e.button!==0)return;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),dragged:false};
 }
 function pulse(x,y){
  // One short, stationary confirmation; no trail and no full-screen canvas redraw.
  for(const [node,timer] of pulses){clearTimeout(timer);node.remove();}pulses.clear();
  const node=document.createElement('span');node.className='cursor-click';node.setAttribute('aria-hidden','true');
  node.style.left=`${x}px`;node.style.top=`${y}px`;document.body.append(node);
  const remove=()=>{clearTimeout(pulses.get(node));pulses.delete(node);node.remove();};
  pulses.set(node,setTimeout(remove,300));node.addEventListener('animationend',remove,{once:true});
 }
 function up(e){
  const start=gesture;gesture=null;
  if(!allowed(e)||e.button!==0||e.buttons||start?.id!==e.pointerId)return;
  const rect=surface.getBoundingClientRect();
  if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return;
  if(!start.dragged&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<=5&&performance.now()-start.time<600)pulse(e.clientX,e.clientY);
  // After a drag, wait for a fresh move before restoring the small hover accent.
 }
 function out(e){if(!e.relatedTarget){reset();return;}if(e.target===surface)hide();}
 function wheel(){scrollUntil=performance.now()+180;reset();}
 function visibility(){if(document.hidden)reset();}
 const events={pointermove:move,pointerdown:down,pointerup:up,pointercancel:reset,pointerout:out,wheel,keydown:reset};
 Object.entries(events).forEach(([name,fn])=>document.addEventListener(name,fn,{capture:true,passive:true}));
 window.addEventListener('blur',reset);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',reset);hide();
 return {
  get enabled(){return active;},
  setEnabled(value){active=!!value;reset();try{localStorage.setItem(PREFERENCE,active?'on':'off');}catch{}},
  dispose(){disposed=true;reset();Object.entries(events).forEach(([name,fn])=>document.removeEventListener(name,fn,true));window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',reset);}
 };
}
