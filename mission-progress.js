import {missions,ships} from './mission-data.js?art=34b';
export const PROGRESS_KEY='satellite-town-star-plan-v1';
export function sanitizeProgress(raw){
 const result={version:1,completed:[],best:{}};
 if(!raw||raw.version!==1||!Array.isArray(raw.completed))return result;
 for(const m of missions){if(raw.completed.includes(m.id))result.completed.push(m.id);else break;}
 for(const id of result.completed){const r=raw.best?.[id];if(r&&Number.isFinite(r.score)&&Number.isFinite(r.seconds))result.best[id]={score:Math.max(0,Math.min(100000,Math.round(r.score))),seconds:Math.max(0,Math.min(36000,r.seconds))};}
 return result;
}
export class ProgressStore{
 constructor(storage){this.storage=storage;this.available=!!storage;this.state=this.read();}
 read(){try{return sanitizeProgress(JSON.parse(this.storage?.getItem(PROGRESS_KEY)||'null'));}catch{return sanitizeProgress(null);}}
 refresh(){if(this.available)this.state=this.read();return this.state;}
 get count(){return this.state.completed.length;}
 get next(){return missions[this.count]||null;}
 status(id){const i=missions.findIndex(m=>m.id===id);return this.state.completed.includes(id)?'done':i===this.count?'ready':'locked';}
 get fleet(){return ships.slice(0,Math.min(4,this.count));}
 complete(id,stats={}){
  if(this.available)this.refresh();
  const m=missions.find(x=>x.id===id);if(!m||this.status(id)==='locked')throw new Error('请按顺序完成前面的区域');
  const first=!this.state.completed.includes(id);if(first)this.state.completed.push(id);
  const score=Number.isFinite(stats.score)?Math.max(0,Math.min(100000,Math.round(stats.score))):0;
  const seconds=Number.isFinite(stats.seconds)?Math.max(0,Math.min(36000,stats.seconds)):0;
  if(!this.state.best[id]||score>this.state.best[id].score)this.state.best[id]={score,seconds};
  try{this.storage?.setItem(PROGRESS_KEY,JSON.stringify(this.state));}catch{this.available=false;}
  return {first,count:this.count,reward:m.reward,star:m.star};
 }
}
export function browserProgress(){let storage;try{storage=localStorage;const probe=PROGRESS_KEY+'-probe';storage.setItem(probe,'1');storage.removeItem(probe);}catch{storage=undefined;}return new ProgressStore(storage);}
