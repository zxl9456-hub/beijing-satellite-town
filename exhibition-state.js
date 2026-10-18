// Puzzle conditions are independent of meshes, camera angles and DOM controls.
export const exhibitTypes=['navigation','communication','weather'];
export const exhibitNames={navigation:'导航卫星',communication:'通信卫星',weather:'气象卫星'};
export const signalOrder=['weather','navigation','communication'];
export const launchOrder=['navigation','weather','communication'];
export class ExhibitionState{
 constructor(seed=Date.now()){
  let n=seed>>>0;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  this.time=0;this.done=false;this.revision=0;this.mistakes=0;this.hints=0;this.cooldown=0;this.hintLevels={};
  this.layout=shuffle([...exhibitTypes]);const marks=shuffle(['△','◇','○']),codes=shuffle([1,2,3,4,5,6,7]);
  this.symbols=Object.fromEntries(exhibitTypes.map((id,i)=>[id,marks[i]]));this.codes=Object.fromEntries(exhibitTypes.map((id,i)=>[id,codes[i]]));
  this.journal=false;this.chart=false;this.observed=[];this.rearSeen=[];this.hatches=[];this.chips=[];this.identified=[];this.slots=[null,null,null];this.dials=[0,0,0];this.signal=false;this.sequence=[];
 }
 get phase(){return this.done?'complete':!this.journal?'brief':this.identified.length<3||this.chips.length<3?'inspect':!this.chart?'chart':this.slots.some(x=>!x)?'assemble':!this.signal?'align':this.sequence.length<3?'sequence':'launch';}
 get count(){return Number(this.journal)+this.identified.length+this.chips.length+Number(this.chart)+this.slots.filter(Boolean).length+Number(this.signal)+this.sequence.length+Number(this.done);}
 get max(){return 16;}
 get score(){return Math.max(20,100-this.mistakes*4-this.hints*3);}
 tick(dt){if(this.done)return;this.time+=Math.max(0,dt);this.cooldown=Math.max(0,this.cooldown-dt);}
 readJournal(){if(this.done||this.journal)return false;this.journal=true;this.revision++;return true;}
 inspect(slot){const id=this.layout[slot];if(this.done||!id)return false;if(!this.observed.includes(id)){this.observed.push(id);this.revision++;}return id;}
 inspectRear(slot){const id=this.layout[slot];if(this.done||!this.journal||!id||!this.observed.includes(id)||this.rearSeen.includes(id))return false;this.rearSeen.push(id);this.revision++;return true;}
 openHatch(slot){const id=this.layout[slot];if(this.done||!id||!this.rearSeen.includes(id)||this.hatches.includes(id))return false;this.hatches.push(id);this.revision++;return true;}
 collectChip(slot){const id=this.layout[slot];if(this.done||!id||!this.hatches.includes(id)||this.chips.includes(id))return false;this.chips.push(id);this.revision++;return true;}
 fail(seconds=1){this.mistakes++;this.cooldown=seconds;this.revision++;return false;}
 identify(slot,answer){const id=this.layout[slot];if(this.done||!this.journal||!id||!this.observed.includes(id)||this.identified.includes(id)||this.cooldown||!exhibitTypes.includes(answer))return false;if(answer!==id)return this.fail();this.identified.push(id);this.revision++;return true;}
 readChart(){if(this.done||!this.journal||this.chart)return false;this.chart=true;this.revision++;return true;}
 install(id,index){if(this.done||this.cooldown||!this.chart||this.identified.length<3||this.chips.length<3||!Number.isInteger(index)||index<0||index>2||!exhibitTypes.includes(id)||this.slots[index]||this.slots.includes(id))return false;if(signalOrder[index]!==id)return this.fail(1.2);this.slots[index]=id;this.revision++;return true;}
 turnDial(index,delta){if(this.phase!=='align'||this.cooldown||!Number.isInteger(index)||index<0||index>2||![-1,1].includes(delta))return false;this.dials[index]=(this.dials[index]+delta+8)%8;this.revision++;return true;}
 verifySignal(){if(this.phase!=='align'||this.cooldown)return false;if(!signalOrder.every((id,i)=>this.codes[id]===this.dials[i]))return this.fail(2);this.signal=true;this.revision++;return true;}
 activate(id){if(this.phase!=='sequence'||this.cooldown||!exhibitTypes.includes(id))return false;if(id!==launchOrder[this.sequence.length]){this.sequence=[];return this.fail(1.5);}this.sequence.push(id);this.revision++;return true;}
 launch(){if(this.phase!=='launch')return false;this.done=true;this.revision++;return true;}
 hint(){if(this.done)return 0;const p=this.phase;this.hints++;this.hintLevels[p]=Math.min(3,(this.hintLevels[p]||0)+1);this.revision++;return this.hintLevels[p];}
}
