export const researchParts=['power','wings','camera','antenna'];
export const researchNames={power:'电源模块',wings:'太阳翼',camera:'遥感相机',antenna:'通信天线'};
export const researchPorts={power:'底部 · 矩形电源舱',wings:'侧面 · 双铰链接口',camera:'前部 · 圆形光学口',antenna:'顶部 · 同轴接口'};
export class ResearchState{
 constructor(seed=Date.now()){let a=seed>>>0;const r=()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};this.level=2;this.time=0;this.done=false;this.blueprint=false;this.inspected=[];this.placed=[];this.orientation=Object.fromEntries(researchParts.map(k=>[k,0]));this.keys=Object.fromEntries(researchParts.map(k=>[k,1+Math.floor(r()*3)]));this.settings={wings:0,camera:0,antenna:0};this.targets={wings:1+Math.floor(r()*3),camera:1+Math.floor(r()*3),antenna:1+Math.floor(r()*3)};this.tested=[];this.cooldown=0;this.mistakes=0;this.hints=0;this.revision=0;this.message='';}
 get max(){return 13;}
 get count(){return Number(this.blueprint)+this.inspected.length+this.placed.length+this.tested.length+Number(this.done);}
 get phase(){return this.done?'complete':!this.blueprint?'brief':this.placed.length<4?'assembly':this.tested.length<3?'testing':'launch';}
 get score(){return Math.max(20,100-this.mistakes*5-this.hints*3);}
 tick(dt){if(this.done||!Number.isFinite(dt)||dt<0)return;this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);}
 reject(message){this.message=message;if(!this.cooldown){this.mistakes++;this.cooldown=1;this.revision++;}return false;}
 read(){if(this.done||this.blueprint)return false;this.blueprint=true;this.revision++;return true;}
 inspect(id){if(this.done||!this.blueprint||!researchParts.includes(id)||this.inspected.includes(id))return false;this.inspected.push(id);this.revision++;return true;}
 rotate(id,delta){if(this.done||this.cooldown||!this.inspected.includes(id)||this.placed.includes(id)||![-1,1].includes(delta))return false;this.orientation[id]=(this.orientation[id]+delta+4)%4;this.revision++;return true;}
 place(id,port){if(this.done||this.cooldown||!this.blueprint||!researchParts.includes(id)||!researchParts.includes(port)||this.placed.includes(id))return false;if(!this.inspected.includes(id))return this.reject('先检查部件的连接器和定位箭头。');if(id!==port)return this.reject('接口结构不匹配，查看工程手册里的连接器说明。');if(id!=='power'&&!this.placed.includes('power'))return this.reject('先安装电源模块，为其他部件建立供电连接。');if(this.orientation[id]!==this.keys[id])return this.reject('定位箭头还没有对准，请旋转部件后再锁定。');this.placed.push(id);this.revision++;return true;}
 configure(id,delta){if(this.done||this.cooldown||this.placed.length!==4||!Object.hasOwn(this.settings,id)||this.tested.includes(id)||![-1,1].includes(delta))return false;const max=id==='wings'?5:4;this.settings[id]=(this.settings[id]+delta+max)%max;this.revision++;return true;}
 test(id){if(this.done||this.cooldown||this.placed.length!==4||!Object.hasOwn(this.settings,id)||this.tested.includes(id))return false;if(id!=='wings'&&!this.tested.includes('wings'))return this.reject('先完成太阳翼供电测试，再给载荷通电。');if(this.settings[id]!==this.targets[id])return this.reject(id==='wings'?'发电效率不足，调整太阳翼使它正对模拟光源。':id==='camera'?'标定图仍不清晰，请使用任务单指定的焦位。':'没有收到匹配的应答，请核对地面站信道。');this.tested.push(id);this.revision++;return true;}
 launch(){if(this.done||this.tested.length!==3)return false;this.done=true;this.revision++;return true;}
 hint(){if(this.done)return 0;this.hints++;this.revision++;return this.hints;}
}
