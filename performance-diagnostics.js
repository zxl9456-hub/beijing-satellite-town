// Opt-in, local-only diagnostics. No uploads or visitor telemetry.
if(new URLSearchParams(location.search).has('profile')){
 const stats={frames:0,intervals:[],longTasks:[],started:performance.now(),visible:!document.hidden};let last=0,raf;
 const frame=now=>{if(!document.hidden&&last){const dt=now-last;if(dt<1000){stats.intervals.push(dt);if(stats.intervals.length>600)stats.intervals.shift();}}last=now;stats.frames++;raf=requestAnimationFrame(frame);};
 try{new PerformanceObserver(list=>{for(const e of list.getEntries()){stats.longTasks.push({start:Math.round(e.startTime),duration:Math.round(e.duration)});if(stats.longTasks.length>100)stats.longTasks.shift();}}).observe({type:'longtask',buffered:true});}catch{}
 window.__performanceReport=()=>{const a=[...stats.intervals].sort((a,b)=>a-b),avg=a.reduce((s,x)=>s+x,0)/(a.length||1);return {frames:stats.frames,samples:a.length,fps:Math.round(1000/avg),p95Ms:Math.round(a[Math.floor(a.length*.95)]||0),over50ms:a.filter(x=>x>50).length,longTasks:stats.longTasks.slice(-8),canvases:[...document.querySelectorAll('canvas')].map(c=>({id:c.id,width:c.width,height:c.height,state:{...c.dataset}}))};};
 document.addEventListener('visibilitychange',()=>{last=0;stats.visible=!document.hidden;});const timer=setInterval(()=>{document.documentElement.dataset.performance=JSON.stringify(window.__performanceReport());},2000);raf=requestAnimationFrame(frame);addEventListener('pagehide',()=>{cancelAnimationFrame(raf);clearInterval(timer);},{once:true});
}
