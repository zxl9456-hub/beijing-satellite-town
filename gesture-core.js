import {clamp} from './mission-core.js?art=39a';
// Landmark coordinates stay in memory; only discrete runner actions leave this interpreter.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class RunnerGesture{
 constructor(){this.label=null;this.previous=null;this.lastSeen=0;this.neutral=null;this.samples=[];this.lane=1;this.wasFist=false;this.jumpArmed=true;this.cooldown=0;this.history=[];this.lost=false;this.started=0;}
 process(hands,now){
  if(!this.started)this.started=now;const candidates=hands.filter(h=>h.landmarks?.length===21&&h.landmarks.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));let hand;
  if(this.label){const same=candidates.filter(h=>h.label===this.label);hand=same.sort((a,b)=>this.previous?distance(a.landmarks[9],this.previous.raw)-distance(b.landmarks[9],this.previous.raw):0)[0];if(hand&&this.previous&&distance(hand.landmarks[9],this.previous.raw)>.32)hand=null;}else hand=candidates[0];
  if(!hand){const lost=now-(this.lastSeen||this.started)>600;this.lost=lost;return {tracked:false,lost,events:[],calibrated:!!this.neutral};}
  this.label=hand.label||'main';const l=hand.landmarks;const raw={x:l[9].x,y:l[9].y};let cx=0,cy=0;for(const i of [0,5,9,13,17]){cx+=1-l[i].x;cy+=l[i].y;}cx/=5;cy/=5;
  const dt=this.previous?clamp((now-this.previous.time)/1000,.008,.12):.033,alpha=1-Math.exp(-dt/.075),x=this.previous?this.previous.x+(cx-this.previous.x)*alpha:cx,y=this.previous?this.previous.y+(cy-this.previous.y)*alpha:cy;
  const folded=[8,12,16,20].filter((tip,i)=>distance(l[tip],l[0])<distance(l[[5,9,13,17][i]],l[0])*1.45).length;const fist=folded>=3,open=folded<=1;this.lastSeen=now;this.lost=false;this.previous={x,y,time:now,raw};const events=[];
  if(!this.neutral){if(open){this.samples.push({x,y,t:now});this.samples=this.samples.filter(s=>now-s.t<1000);if(this.samples.length>=8&&now-this.samples[0].t>750){const xs=this.samples.map(s=>s.x),ys=this.samples.map(s=>s.y);if(Math.max(...xs)-Math.min(...xs)<.07&&Math.max(...ys)-Math.min(...ys)<.07){this.neutral={x:xs.reduce((a,b)=>a+b)/xs.length,y:ys.reduce((a,b)=>a+b)/ys.length};events.push('calibrated');}}}else this.samples=[];return {tracked:true,lost:false,calibrated:!!this.neutral,x,y,open,fist,lane:1,events};}
  const rel=x-this.neutral.x,threshold=.12,hysteresis=.035;let next=this.lane;if(this.lane===1){if(rel<-threshold)next=0;if(rel>threshold)next=2;}else if(this.lane===0&&rel>-threshold+hysteresis)next=rel>threshold?2:1;else if(this.lane===2&&rel<threshold-hysteresis)next=rel<-threshold?0:1;if(next!==this.lane){this.lane=next;events.push('lane');}
  this.history.push({y,t:now});this.history=this.history.filter(p=>now-p.t<200);const oldest=this.history[0],rise=oldest?oldest.y-y:0,velocity=oldest&&now>oldest.t?rise/((now-oldest.t)/1000):0;
  if(Math.abs(y-this.neutral.y)<.07&&open)this.jumpArmed=true;
  if(open&&this.jumpArmed&&now>this.cooldown&&rise>.045&&velocity>.55&&y<this.neutral.y-.045){events.push('jump');this.jumpArmed=false;this.cooldown=now+700;}
  if(fist&&!this.wasFist&&now>this.cooldown){events.push('slide');this.cooldown=now+700;}if(fist)this.wasFist=true;else if(open)this.wasFist=false;
  return {tracked:true,lost:false,calibrated:true,x,y,open,fist,lane:this.lane,events};
 }
 resetCalibration(){this.neutral=null;this.samples=[];this.history=[];this.lane=1;this.previous=null;this.label=null;this.lastSeen=0;this.started=0;this.jumpArmed=true;this.wasFist=false;}
}
