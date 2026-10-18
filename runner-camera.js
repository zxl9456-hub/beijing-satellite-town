import {HandTracker} from './hand-tracker.js';
import {RunnerGesture} from './gesture-core.js?art=34b';
export class RunnerCamera{
 constructor(api){this.api=api;this.core=new RunnerGesture();this.ready=false;this.latest=null;this.stopped=true;this.startedAt=0;this.video=document.querySelector('#gesture-video');this.status=document.querySelector('#gesture-status');this.panel=document.querySelector('#gesture-panel');this.tracker=new HandTracker(this.video,(hands,t)=>{if(this.stopped)return;this.latest=this.core.process(hands,t);this.api.result(this.latest);},(state,message)=>{if(this.stopped)return;this.ready=state==='ready';this.status.textContent=state==='ready'?'单手识别已就绪，请张开手掌':message;if(state==='error')this.api.error(message);});}
 async start(){this.stopped=false;this.startedAt=performance.now();this.panel.hidden=false;this.core.resetCalibration();this.latest=null;await this.tracker.start();const stream=this.video.srcObject;for(const track of stream?.getVideoTracks()||[])track.addEventListener('ended',()=>{if(!this.stopped)this.api.error('摄像头已断开，请重连或切换键盘触屏');});}
 tick(now){if(this.stopped)return;this.tracker.tick(now);if(this.ready){if(now-(this.core.lastSeen||this.startedAt)>600)this.api.loss();if(this.latest?.tracked)this.status.textContent=this.latest.calibrated?['左道','中道','右道'][this.latest.lane]+' · '+(this.latest.fist?'握拳':'张掌'):'保持手掌在中央，正在校准';}}
 stop(){this.stopped=true;this.ready=false;this.tracker.stop();this.panel.hidden=true;this.latest=null;}
}
