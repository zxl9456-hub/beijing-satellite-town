// Campaign rules are renderer-independent so every objective can be verified with real input.
import {MapQuestState} from './map-quest-state.js?art=40a';
import {ResearchState,researchParts} from './research-state.js?art=40a';
import {FlightState,RunnerState,createMissionState,clamp,seeded} from './mission-core.js?art=40a';
export const difficultyNames={explore:'轻松探索',challenge:'进阶挑战'};
export const campaignStory={
 2:{task:'为星光庆典设计一颗任务卫星',output:'任务卫星',xing:'精准装配',xun:'设计诊断'},
 3:{task:'把庆典邀请通过卫星传回小镇',output:'三路邀请信号',xing:'稳定天线',xun:'频谱扫描'},
 4:{task:'找回三枚数据核心，协作连接城市地图',output:'双星导航地图',xing:'寻路与锁桥',xun:'扫描与中继'},
 5:{task:'回收失联探测器的星光核心并送回基地',output:'星光核心',xing:'紧急维修',xun:'回收牵引'},
 6:{task:'把社区能量送到星光庆典会场',output:'社区能量',xing:'稳固货舱',xun:'紧急救援'},
 7:{task:'用沿途的成果筹备属于大家的庆典',output:'星光庆典',xing:'布置协助',xun:'约束检查'}
};
const init=(s,difficulty='explore',seed=Date.now())=>{s.difficulty=difficulty==='challenge'?'challenge':'explore';s.hard=s.difficulty==='challenge';s.random=seeded(seed);s.charges={xingzai:s.hard?1:2,xunbao:s.hard?2:3};s.assistUntil=0;s.message='';s.revision=s.revision||0;s.mistakes=s.mistakes||0;};
const spend=(s,who)=>{if(s.done||s.failed||!s.charges[who]){s.message='本次协作次数已用完，仍可自行完成任务';return false;}s.charges[who]--;s.revision++;return true;};
const deltaAngle=(a,b)=>((a-b+540)%360)-180;
const shuffle=(a,r)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export const engineeringOrders={
 observation:{title:'观测卫星',need:'相机达到 3 级成像能力，拍摄庆典场地',sensor:3,link:1},
 communications:{title:'通信卫星',need:'天线达到 3 级通信能力，广播庆典邀请',sensor:1,link:3},
 navigation:{title:'导航卫星',need:'相机与天线均达到 2 级，辅助社区配送',sensor:2,link:2}
};
// Cost and mass use fictional engineering units; they illustrate trade-offs, not real specifications.
export const componentOptions={
 power:[{title:'轻量电源',mass:2,cost:2,supply:3},{title:'长航电源',mass:4,cost:4,supply:6}],
 wings:[{title:'紧凑太阳翼',mass:2,cost:2,supply:3},{title:'高效太阳翼',mass:3,cost:4,supply:6}],
 camera:[{title:'广角相机',mass:1,cost:2,draw:2,sensor:1},{title:'多光谱相机',mass:2,cost:3,draw:3,sensor:2},{title:'精密相机',mass:3,cost:5,draw:5,sensor:3}],
 antenna:[{title:'轻型天线',mass:1,cost:2,draw:2,link:1},{title:'定向天线',mass:2,cost:3,draw:3,link:2},{title:'高增益天线',mass:3,cost:5,draw:5,link:3}]
};
export class EngineeringState extends ResearchState{
 constructor(options={}){super(options.seed);init(this,options.difficulty,options.seed);this.order='observation';this.loadout={power:0,wings:0,camera:0,antenna:0};this.designLocked=false;}
 get phase(){return !this.designLocked?'design':super.phase;}
 get max(){return 14;}
 get count(){return super.count+Number(this.designLocked);}
 get limits(){return this.hard?{mass:10,cost:14,reserve:1}:{mass:13,cost:18,reserve:0};}
 get metrics(){const m={mass:0,cost:0,supply:0,draw:0,sensor:0,link:0};for(const id of researchParts)for(const k of Object.keys(m))m[k]+=componentOptions[id][this.loadout[id]][k]||0;return m;}
 get designErrors(){const m=this.metrics,l=this.limits,o=engineeringOrders[this.order],a=[];if(m.mass>l.mass)a.push('质量超出 '+(m.mass-l.mass)+' 单位');if(m.cost>l.cost)a.push('预算超出 '+(m.cost-l.cost)+' 单位');if(m.supply-m.draw<l.reserve)a.push('供电余量不足 '+(l.reserve-m.supply+m.draw)+' 单位');if(m.sensor<o.sensor)a.push('成像能力不足');if(m.link<o.link)a.push('通信能力不足');return a;}
 selectOrder(id){if(this.designLocked||!engineeringOrders[id])return false;this.order=id;this.revision++;return true;}
 choose(id,index){if(this.designLocked||!componentOptions[id]?.[index])return false;this.loadout[id]=index;this.revision++;return true;}
 commitDesign(){if(this.designLocked)return false;if(this.designErrors.length)return this.reject('设计未通过：'+this.designErrors.join('；'));this.designLocked=true;this.revision++;this.message='方案已冻结，进入实体装配与联调';return true;}
 read(){return this.designLocked&&super.read();}
 assist(who){if(!spend(this,who))return false;if(who==='xunbao'){this.message=this.designErrors.length?'讯宝诊断：'+this.designErrors.join('；'):'讯宝诊断：质量、供电和任务能力均达标；联调参数见工程手册';}else{const id=researchParts.find(x=>this.inspected.includes(x)&&!this.placed.includes(x));if(!id){this.charges[who]++;this.message='先检查一个待安装的部件，星仔才能帮忙对准';return false;}this.orientation[id]=this.keys[id];this.message='星仔已帮你对准定位箭头，请选择正确接口锁定';}return true;}
 outcome(){return {artifact:'任务卫星',order:this.order,loadout:{...this.loadout},metrics:this.metrics};}
}
export class SignalState{
 constructor(options={}){init(this,options.difficulty,options.seed);this.time=0;this.done=false;this.connections=0;this.phase='aim';this.heading=0;this.frequency=1;this.received=0;this.scanUntil=0;this.links=Array.from({length:3},(_,i)=>({bearing:35+Math.floor(this.random()*285),frequency:2+Math.floor(this.random()*7),drift:i+1}));}
 get max(){return 3;}
 get count(){return this.connections+this.received/this.required;}
 get required(){return this.hard?8:5;}
 get link(){return this.links[Math.min(2,this.connections)];}
 get targetBearing(){return (this.link.bearing+(this.phase==='track'?Math.sin(this.time*.6)*this.link.drift*(this.time<this.assistUntil?.2:2):0)+360)%360;}
 get tolerance(){return this.hard?5:10;}
 get directionStrength(){return Math.max(0,Math.round(100-Math.abs(deltaAngle(this.heading,this.targetBearing))*2));}
 get frequencyStrength(){return Math.max(0,100-Math.abs(this.frequency-this.link.frequency)*24);}
 get signalOpen(){return Math.abs(deltaAngle(this.heading,this.targetBearing))<=this.tolerance&&this.frequency===this.link.frequency;}
 get scan(){return this.heading*Math.PI/180;}
 get signalTarget(){return this.targetBearing*Math.PI/180;}
 get score(){return Math.max(10,100-this.mistakes*4);}
 turn(value){if(this.done||!Number.isFinite(value))return;this.heading=(value%360+360)%360;this.revision++;}
 tune(value){if(this.done)return;this.frequency=clamp(Math.round(value),1,9);this.revision++;}
 act(){if(this.done)return false;if(this.phase==='aim'&&this.directionStrength>=100-this.tolerance*2){this.phase='tune';this.message='天线锁定，寻找真正的应答频率';}else if(this.phase==='tune'&&this.frequency===this.link.frequency){this.phase='track';this.message='开始接收：按住接收键，并持续修正天线方向';}else{this.mistakes++;this.message='信号尚未匹配，观察强度仪再调整';this.revision++;return false;}this.revision++;return true;}
 tick(dt,input={}){if(this.done)return;this.time+=clamp(dt,0,.1);if(input.turn)this.turn(this.heading+input.turn*dt*(this.hard?28:32));if(this.phase!=='track')return;if(input.receive&&this.signalOpen)this.received=Math.min(this.required,this.received+dt);else this.received=Math.max(0,this.received-dt*(this.hard?.85:.35));if(this.received>=this.required){this.connections++;this.received=0;this.phase=this.connections===3?'complete':'aim';this.done=this.connections===3;this.heading=0;this.frequency=1;this.message=this.done?'三路邀请已完整送达小镇':'链路已存档，开始下一颗卫星的接力';this.revision++;}}
 assist(who){if(!spend(this,who))return false;if(who==='xingzai'){this.assistUntil=this.time+12;this.message='星仔稳定天线 12 秒，漂移减缓';}else{this.scanUntil=this.time+8;this.message='讯宝已展开频谱扫描，8 秒内显示真实信标';}return true;}
 outcome(){return {artifact:'三路邀请信号',links:3};}
}
export class RescueFlightState extends FlightState{
 constructor(ship,options={}){super(ship);init(this,options.difficulty,options.seed);this.phase='route';this.route=null;this.health=this.hard?3:5;this.maxHealth=this.health;this.failed=false;this.carrying=false;this.checkpoint=false;this.abilityCooldown=0;this.missionClock=0;this.combatClock=0;this.travel=0;this.hold=0;this.core={x:2.8,z:-.8};this.dock={x:-2,z:.6};}
 get max(){return 3;}
 get count(){if(this.done)return this.max;return (this.phase==='outbound'?this.travel/this.travelRequired:this.phase==='recover'?1:this.phase==='return'?1.6+Math.min(.4,this.travel/25):this.phase==='dock'?2:0)+Number(this.done);}
 get travelRequired(){return this.route==='safe'?28:20;}
 get limit(){return this.hard?115:150;}
 get actionTarget(){return this.phase==='recover'?this.core:this.phase==='dock'?this.dock:null;}
 get nearTarget(){const t=this.actionTarget;return !!t&&Math.hypot(this.x-t.x,this.z-t.z)<(this.time<this.assistUntil?1.8:this.hard?.8:1.15);}
 chooseRoute(route){if(this.phase!=='route'||!['safe','risk'].includes(route))return false;this.route=route;this.phase='outbound';this.message=route==='safe'?'外环航线：航程较长，碎片较少':'核心航线：更快抵达，碎片密集';this.revision++;return true;}
 ability(){if(this.done||this.failed||this.phase==='route'||this.abilityCooldown>0)return false;this.abilityCooldown=12;const messages={cruise:'巡航号冲击光束：清空前方碎片',tracker:'追星号磁力回收：吸附可见回收物',guard:'护航号强化护罩：6 秒免伤',rain:'星雨号脉冲：清空近身危险'};if(this.ship==='guard')this.protect=6;else if(this.ship==='tracker'){this.score+=this.pickups.length;this.pickups=[];this.protect=2;}else this.entities=this.entities.filter(e=>this.ship==='cruise'?Math.abs(e.x-this.x)>1.8:Math.hypot(e.x-this.x,e.z-this.z)>8);this.message=messages[this.ship];this.revision++;return true;}
 tick(dt,input={}){if(this.done||this.failed||this.phase==='route')return;dt=clamp(dt,0,.1);const elapsed=this.time;this.time=this.combatClock;this.spawnAt=Math.min(this.spawnAt,this.time+(this.route==='risk'?.65:1.6));const prevPhase=this.phase;super.tick(dt,input);this.combatClock=this.time;if(this.combatClock>40){this.combatClock=20;this.spawnAt=20.8;}this.time=elapsed+dt;this.done=false;this.missionClock+=dt;this.abilityCooldown=Math.max(0,this.abilityCooldown-dt);for(const e of this.events)if(e.type==='hit'){this.health--;this.hold=0;}if(this.route==='safe'&&this.entities.length>6)this.entities=this.entities.slice(-6);this.travel+=dt;
 if(this.phase==='outbound'&&this.travel>=this.travelRequired){this.phase='recover';this.travel=0;this.message='探测器已找到！移动到金色核心附近，按住回收键';this.revision++;}
 if(this.phase==='return'&&this.travel>=12){this.phase='dock';this.message='基地已开放：靠近左侧青色泊位，按住交付键';this.revision++;}
 if(this.actionTarget){this.hold=this.nearTarget&&input.interact?this.hold+dt:Math.max(0,this.hold-dt*2);if(this.hold>=(this.hard?3:2)){this.hold=0;if(this.phase==='recover'){this.carrying=true;this.checkpoint=true;this.phase='return';this.travel=0;this.message='星光核心已回收，检查点已保存。返航交付！';}else{this.done=true;this.phase='complete';this.message='核心已安全交付，庆典主灯获得能源';}this.revision++;}}
 if(!this.done&&(this.health<=0||this.missionClock>=this.limit)){this.failed=true;this.message=this.health<=0?(this.checkpoint?'机体需要维修，讯宝保留了已回收的核心':'机体需要维修，整备后再次出发'):'本次航行能源不足，返回最近检查点';this.revision++;}if(prevPhase!==this.phase)this.entities=this.entities.filter(e=>e.z<-4);}
 retry(){if(!this.failed)return false;this.failed=false;this.health=this.maxHealth;this.missionClock=0;this.combatClock=0;this.spawnAt=.8;this.travel=0;this.hold=0;this.x=0;this.z=3;this.entities=[];this.bullets=[];this.pickups=[];this.events=[];this.slow=0;this.protect=3;this.abilityCooldown=0;this.phase=this.checkpoint?'return':'outbound';this.revision++;return true;}
 assist(who){if(!spend(this,who))return false;if(who==='xingzai'){this.health=Math.min(this.maxHealth,this.health+2);this.protect=3;this.message='星仔修复 2 格机体，并提供 3 秒保护';}else{this.assistUntil=this.time+15;this.message='讯宝开启 15 秒牵引，核心与泊位的操作范围扩大';}return true;}
 outcome(){return {artifact:'星光核心',ship:this.ship,route:this.route,recovered:true};}
}
export class DeliveryRunnerState extends RunnerState{
 constructor(options={}){super();init(this,options.difficulty,options.seed);this.phase='route';this.route=null;this.energy=0;this.required=this.hard?14:9;this.segment=0;this.endDistance=360;this.rescueUsed=false;this.lostEnergy=0;this.cargoShield=0;this.restored=false;this.makeCourse();}
 get max(){return this.required+1;}
 get count(){return Math.min(this.required,this.energy)+Number(this.done);}
 makeCourse(){this.obstacles=[];this.tokens=[];const start=this.distance||0;const length=this.segment?120:360;this.endDistance=start+length;const n=this.segment?12:30;for(let i=0;i<n;i++){const lane=(i+Math.floor(this.random()*3))%3,d=start+18+i*(this.segment?8:10.8);this.tokens.push({id:this.segment*100+i,lane,distance:d,collected:false,value:this.route==='reward'?2:1});if(i%3!==0||this.route==='reward')this.obstacles.push({id:this.segment*100+i,lane:(lane+(i%2?1:0))%3,distance:d+4.5,type:['barrier','arch','planter'][i%3],passed:false});}this.revision++;}
 chooseRoute(route){if(!['route','arrival'].includes(this.phase)||!['safe','reward'].includes(route)||this.done)return false;if(this.phase==='arrival'){this.segment++;this.distance=0;}this.route=route;this.phase='run';this.makeCourse();this.message=route==='safe'?'林荫线：障碍较少，每枚能量 +1':'运动线：能量翻倍，跳跃与滑铲组合更多';this.revision++;return true;}
 tick(dt){if(this.done||this.phase!=='run')return;const before=this.score;super.tick(dt);this.done=false;const gained=this.score-before;this.energy+=gained*(this.route==='reward'?2:1);this.cargoShield=Math.max(0,this.cargoShield-dt);for(const e of this.events)if(e.type==='hit'&&this.cargoShield<=0){const lost=Math.min(this.energy,this.hard?3:2);this.energy-=lost;this.lostEnergy+=lost;this.message='碰撞掉落 '+lost+' 枚能量；可以继续收集';}if(this.distance>=this.endDistance-.001){this.distance=this.endDistance;this.phase='arrival';this.message=this.energy>=this.required?'抵达会场，请亲手交付社区能量':'抵达会场，能量不足。选择 120 米补给路线继续收集';this.revision++;}}
 deliver(){if(this.phase!=='arrival'||this.energy<this.required)return false;this.done=true;this.phase='complete';this.revision++;return true;}
 assist(who){if(who==='xunbao'&&this.rescueUsed){this.message='本关紧急救援已经使用';return false;}if(!spend(this,who))return false;if(who==='xingzai'){this.cargoShield=12;this.protect=Math.max(this.protect,2);this.message='星仔加固货舱 12 秒，碰撞不会丢失能量';}else{this.rescueUsed=true;this.energy+=this.lostEnergy;this.lostEnergy=0;this.slow=0;this.protect=6;this.message='讯宝找回本次掉落的能量，并提供 6 秒保护';}return true;}
 outcome(){return {artifact:'社区能量',energy:this.energy,route:this.route,rescue:this.rescueUsed};}
}
const partyNames={lin:'研发员小林',zhou:'运营员小周',guide:'讲解员',guest:'数据伙伴',pilot:'试飞员',runner:'社区信使'};
export class CelebrationState{
 constructor(options={}){init(this,options.difficulty,options.seed);this.time=0;this.done=false;this.phase='decorate';this.seats={};this.placements={};this.program=[];this.inspected=false;this.artifacts=options.outcomes||{};this.people=(this.hard?['lin','zhou','guide','guest','pilot','runner']:['lin','zhou','guide','guest']).map((id,i)=>({id,title:partyNames[id],color:['#4aa7c1','#e7a056','#ac94cd','#72b69a','#92a5c2','#d4ad78'][i]}));const n=this.people.length;
 // Derive every constraint from a shuffled, valid seating arrangement.
 this.solution=shuffle([...this.people.map(x=>x.id)],this.random);const pos=id=>this.solution.indexOf(id);const near=(a,b)=>Math.min(Math.abs(a-b),n-Math.abs(a-b))===1;
 this.rules=[{kind:'fixed',a:'guide',seat:pos('guide'),text:'讲解员坐在 '+(pos('guide')+1)+' 号讲解位'},{kind:near(pos('lin'),pos('zhou'))?'near':'apart',a:'lin',b:'zhou',text:'小林与小周'+(near(pos('lin'),pos('zhou'))?'相邻':'不相邻')},{kind:'not',a:'guest',seat:(pos('guest')+1)%n,text:'数据伙伴不坐 '+((pos('guest')+1)%n+1)+' 号位'}];if(this.hard){this.rules.push({kind:'opposite',a:this.solution[0],b:this.solution[3],text:partyNames[this.solution[0]]+'与'+partyNames[this.solution[3]]+'相对而坐'},{kind:'near',a:this.solution[2],b:this.solution[3],text:partyNames[this.solution[2]]+'与'+partyNames[this.solution[3]]+'相邻'});}this.decors=[{id:'satellite',title:'任务卫星展品',zone:'display',source:'research'},{id:'core',title:'星光核心',zone:'power',source:'incubation'},{id:'energy',title:'社区能量灯串',zone:'welcome',source:'talent'}];this.programItems=shuffle([{id:'check',title:'安全巡检',note:'检查报告与岸线，先于一切活动'},{id:'power',title:'主灯通电',note:'安全巡检之后，投影之前'},{id:'invite',title:'播放邀请信号',note:'主灯通电之后，演出之前'},{id:'show',title:'卫星星图演出',note:'收到邀请、接通主灯之后'},{id:'photo',title:'全镇合影',note:'演出结束后'}],this.random);this.message='把沿途获得的成果布置到正确位置';}
 get max(){return 3+this.people.length+this.programItems.length+1;}
 get count(){return Object.keys(this.placements).length+Object.keys(this.seats).length+this.program.length+Number(this.done);}
 get score(){return Math.max(10,100-this.mistakes*5);}
 tick(dt){if(!this.done)this.time+=clamp(dt,0,.1);}
 placeDecor(id,zone){if(this.phase!=='decorate')return false;const d=this.decors.find(d=>d.id===id);if(!d)return false;if(d.zone!==zone){this.message='功能不匹配：展品去展示区，核心接配电台，灯串布置迎宾区';this.mistakes++;this.revision++;return false;}this.placements[id]=zone;this.revision++;if(Object.keys(this.placements).length===3){this.phase='seating';this.message='设备已连接，请按来宾心愿安排座位';}return true;}
 seat(id,index){if(this.phase!=='seating'||!this.people.some(x=>x.id===id)||!Number.isInteger(index)||index<0||index>=this.people.length)return false;const old=this.seats[id],occupant=Object.keys(this.seats).find(x=>this.seats[x]===index);if(occupant&&occupant!==id){if(old===undefined)delete this.seats[occupant];else this.seats[occupant]=old;}this.seats[id]=index;this.revision++;return true;}
 ruleMet(r){const a=this.seats[r.a],b=this.seats[r.b],n=this.people.length;if(a===undefined)return false;const d=Math.min(Math.abs(a-b),n-Math.abs(a-b));return r.kind==='fixed'?a===r.seat:r.kind==='not'?a!==r.seat:b===undefined?false:r.kind==='near'?d===1:r.kind==='apart'?d!==1:d===n/2;}
 confirmSeats(){if(this.phase!=='seating')return false;if(Object.keys(this.seats).length!==this.people.length||!this.rules.every(r=>this.ruleMet(r))){this.mistakes++;this.inspected=true;this.message='还有心愿没有满足，请调整标记的座位关系';this.revision++;return false;}this.phase='program';this.message='来宾都准备好了，按照节目依赖关系安排顺序';this.revision++;return true;}
 addProgram(id){if(this.phase!=='program'||!this.programItems.some(p=>p.id===id)||this.program.includes(id))return false;this.program.push(id);this.revision++;return true;}
 undoProgram(){if(this.phase!=='program')return;this.program.pop();this.revision++;}
 launch(){if(this.phase!=='program')return false;const correct=['check','power','invite','show','photo'];if(correct.some((x,i)=>this.program[i]!==x)){this.mistakes++;this.message='顺序未就绪：先安全检查、通电、广播邀请，再演出与合影';this.revision++;return false;}this.done=true;this.phase='complete';this.message='设备、来宾与节目均已就绪，一起开启星光庆典';this.revision++;return true;}
 assist(who){if(!spend(this,who))return false;if(who==='xingzai'){if(this.phase==='decorate'){const d=this.decors.find(x=>!this.placements[x.id]);this.placeDecor(d.id,d.zone);this.message='星仔协助布置了一件庆典设备';}else if(this.phase==='seating'){this.seat('guide',this.solution.indexOf('guide'));this.message='星仔带讲解员找到了讲解位';}else{this.charges[who]++;this.message='节目顺序需要你决定，依照卡片上的先后关系安排';return false;}}else{this.inspected=true;this.message=this.phase==='seating'?'讯宝已逐条检查心愿，查看下方反馈':this.phase==='program'?'讯宝：先检查安全，再接电、广播、演出，最后合影':'讯宝：展品、供电、迎宾三个区域各有用途';}return true;}
 outcome(){return {artifact:'星光庆典',guests:this.people.length,program:[...this.program],placements:{...this.placements}};}
}
export function createCampaignState(n,options={}){return n===1?createMissionState(1):n===2?new EngineeringState(options):n===3?new SignalState(options):n===4?new MapQuestState(options):n===5?new RescueFlightState(options.ship||'tracker',options):n===6?new DeliveryRunnerState(options):new CelebrationState(options);}
