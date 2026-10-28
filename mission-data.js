export const missions = [
 {id:'exhibition',n:1,title:'展馆寻星记',region:'航天产业展示中心',star:'展示之星',reward:'巡航号',rewardNote:'直线回收光束，第5关可以驾驶',goal:'检查卫星、寻找模块，结合星图修复失联的逐星信号',controls:'点击展品近看，拖动翻转并打开检修盖；组合模块、转动刻度环；支持触屏和键盘',hint:'星仔：轨道仪停止运转了，先看看档案柜里留下了什么检修记录',duration:'约6–10分钟',color:'#66bfa5'},
 {id:'research',n:2,title:'拼一颗小卫星',region:'卫星研发区',star:'研发之星',reward:'追星号',rewardNote:'自动追踪目标，第5关适合轻松体验',goal:'选择工程订单，在质量、预算和供电约束下设计、装配并交付任务卫星',controls:'先选订单与部件方案，再检查接口、旋转装配并完成三项联调',hint:'星仔：先查看任务单，我们一起造一颗真正能工作的卫星。',duration:'约4–6分钟',color:'#e5a06b'},
 {id:'operations',n:3,title:'接住太空信号',region:'卫星运营区',star:'运营之星',reward:'护航号',rewardNote:'可恢复护罩，第5关提供更高容错',goal:'搜寻卫星、匹配频率，持续追踪并完整接收三路庆典邀请',controls:'拖动方位和频率旋钮；方向键微调，按住空格或接收按钮完成传输',hint:'讯宝：先找到最强方向，再调出真实应答频率，接收时留意天线漂移。',duration:'约3–5分钟',color:'#a4b968'},
 {id:'data',n:4,title:'双星地图迷航',region:'空间数据应用区',star:'数据之星',reward:'星雨号',rewardNote:'扇形散射，第5关适合清理成片垃圾',goal:'操控星仔穿越城市沙盘，指挥讯宝扫描与接桥，找回三枚数据核心并上传完整地图',controls:'方向键/WASD 或触屏按钮移动；Q 扫描、E 互动、R 召回讯宝；点击道路自动寻路',hint:'星仔：先请讯宝扫描街区，找到第一枚地形核心，再一起接通光桥',duration:'约4–6分钟',color:'#6eafd3'},
 {id:'incubation',n:5,title:'新发明试飞场',region:'卫星加速孵化中心',star:'孵化之星',reward:'庆典星光装置',rewardNote:'第7关把回收核心接入庆典配电台',goal:'选择航线，回收失联探测器的星光核心，返回泊位亲手交付',controls:'方向键/WASD或拖动移动；空格释放机型技能，按住E或操作按钮回收与交付',hint:'讯宝：核心在右前方。靠近后按住回收，再返回左侧基地泊位交付。',duration:'约2–3分钟',color:'#eaa26c'},
 {id:'talent',n:6,title:'星仔的社区逐星跑',region:'卫星人才社区',star:'人才之星',reward:'社区庆典装饰',rewardNote:'第7关亲手布置社区能量灯串',goal:'选择配送路线、躲避组合障碍，把足够的社区能量送到会场',controls:'左右换道，空格/↑跳跃，↓滑铲；支持触屏与单手手势',hint:'星仔：低栏跳、拱门滑、花坛绕。收集能量，注意碰撞会掉货；不足可以跑补给线。',duration:'约2–4分钟',color:'#ab93ce'},
 {id:'exchange',n:7,title:'小镇派对排排坐',region:'卫星交流中心',star:'交流之星',reward:'全镇庆典与纪念合影',rewardNote:'点亮七个区域，留下你和双IP的纪念画面',goal:'布置旅途成果，满足圆桌来宾心愿，按依赖关系编排庆典流程',controls:'先选择设备放置区域，再点选来宾与座位，最后编排开幕节目',hint:'讯宝：展品、供电、迎宾各有功能；圆桌首尾相邻，节目需要先巡检再通电。',duration:'约3–5分钟',color:'#d4b76b'}
];
export const missionById=id=>missions.find(m=>m.id===id);
export const gameURL=id=>'./game.html?region='+encodeURIComponent(id);
export const regionURL=id=>'./explore.html?region='+encodeURIComponent(id);
export const ships=[
 {id:'cruise',title:'巡航号',color:'#3fb9d2',desc:'直线光束 · 集中清理前方',preview:'回收光束沿正前方发射'},
 {id:'tracker',title:'追星号',color:'#ee9f4d',desc:'自动追踪 · 推荐',preview:'弹道自动转向附近目标'},
 {id:'guard',title:'护航号',color:'#ab94d5',desc:'直线光束＋恢复护罩',preview:'护罩抵挡一次碰撞，约15秒恢复'},
 {id:'rain',title:'星雨号',color:'#6fbe98',desc:'扇形散射 · 宽幅清理',preview:'三个方向同时发射回收光束'}
];
export const parts=[{id:'antenna',title:'天线',note:'接收与发送信号'},{id:'wings',title:'太阳翼',note:'把阳光变成电能'},{id:'camera',title:'相机',note:'观察地球的眼睛'},{id:'power',title:'电源',note:'储存并分配能量'}];
export const guests=[{id:'lin',title:'研发员小林',note:'和小周相邻',color:'#4aa7c1'},{id:'zhou',title:'运营员小周',note:'和小林相邻',color:'#e7a056'},{id:'guide',title:'讲解员',note:'靠展示台',color:'#ac94cd'},{id:'guest',title:'数据伙伴',note:'期待一起交流',color:'#72b69a'}];
