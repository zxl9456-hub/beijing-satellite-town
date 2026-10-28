import {missions,ships} from './mission-data.js?art=37a';
export const PROGRESS_KEY='satellite-town-star-plan-v1';
export function sanitizeProgress(raw){
 const result={version:1,completed:[],best:{}};
 if(!raw||raw.version!==1||!Array.isArray(raw.completed))return result;
 for(const m of missions){if(raw.completed.includes(m.id))result.completed.push(m.id);else break;}
 for(const id of result.completed){const r=raw.best?.[id];if(r&&Number.isFinite(r.score)&&Number.isFinite(r.seconds))result.best[id]={score:Math.max(0,Math.min(100000,Math.round(r.score))),seconds:Math.max(0,Math.min(36000,r.seconds))};}
 if(raw.campaign&&typeof raw.campaign==='object'){result.campaign={};for(const id of result.completed){const r=raw.campaign[id];if(!r||typeof r!=='object')continue;const outcome=cleanOutcome(id,r.outcome);if(outcome)result.campaign[id]={outcome,cleared:{explore:r.cleared?.explore===true,challenge:r.cleared?.challenge===true}};}}
 return result;
}
function cleanOutcome(id,value){if(!value||typeof value!=='object')return null;const artifact={research:'任务卫星',operations:'三路邀请信号',data:'地表观察报告',incubation:'星光核心',talent:'社区能量',exchange:'星光庆典'}[id];if(!artifact)return null;const v={artifact};if(id==='research'){v.order=['observation','communications','navigation'].includes(value.order)?value.order:'observation';v.loadout={};for(const k of ['power','wings','camera','antenna'])v.loadout[k]=Math.max(0,Math.min(k==='power'||k==='wings'?1:2,Math.floor(Number(value.loadout?.[k])||0)));}if(id==='operations')v.links=3;if(id==='data'){v.changes=value.changes===4?4:3;v.priority='bank';}if(id==='incubation'){v.recovered=true;v.route=value.route==='risk'?'risk':'safe';v.ship=ships.some(s=>s.id===value.ship)?value.ship:'tracker';}if(id==='talent'){v.energy=Math.max(0,Math.min(10000,Math.round(Number(value.energy)||0)));v.route=value.route==='reward'?'reward':'safe';}if(id==='exchange')v.guests=value.guests===6?6:4;return v;}
export class ProgressStore{
 constructor(storage){this.storage=storage;this.available=!!storage;this.state=this.read();}
 read(){try{return sanitizeProgress(JSON.parse(this.storage?.getItem(PROGRESS_KEY)||'null'));}catch{return sanitizeProgress(null);}}
 refresh(){if(this.available)this.state=this.read();return this.state;}
 get count(){return this.state.completed.length;}
 get next(){return missions[this.count]||null;}
 status(id){const i=missions.findIndex(m=>m.id===id);return this.state.completed.includes(id)?'done':i===this.count?'ready':'locked';}
 get outcomes(){return Object.fromEntries(this.state.completed.filter(id=>id!=='exhibition').map(id=>[id,this.state.campaign?.[id]?.outcome||cleanOutcome(id,{energy:9})]));}
 get fleet(){return ships.slice(0,Math.min(4,this.count));}
 complete(id,stats={}){
  if(this.available)this.refresh();
  const m=missions.find(x=>x.id===id);if(!m||this.status(id)==='locked')throw new Error('请按顺序完成前面的区域');
  const first=!this.state.completed.includes(id);if(first)this.state.completed.push(id);
  const score=Number.isFinite(stats.score)?Math.max(0,Math.min(100000,Math.round(stats.score))):0;
  const seconds=Number.isFinite(stats.seconds)?Math.max(0,Math.min(36000,stats.seconds)):0;
  if(!this.state.best[id]||score>this.state.best[id].score)this.state.best[id]={score,seconds};
  if(['explore','challenge'].includes(stats.difficulty)){const outcome=cleanOutcome(id,stats.outcome);if(outcome){this.state.campaign??={};const old=this.state.campaign[id];this.state.campaign[id]={outcome,cleared:{...old?.cleared,[stats.difficulty]:true}};}}
  try{this.storage?.setItem(PROGRESS_KEY,JSON.stringify(this.state));}catch{this.available=false;}
  return {first,count:this.count,reward:m.reward,star:m.star};
 }
}
export function browserProgress(){let storage;try{storage=localStorage;const probe=PROGRESS_KEY+'-probe';storage.setItem(probe,'1');storage.removeItem(probe);}catch{storage=undefined;}return new ProgressStore(storage);}
