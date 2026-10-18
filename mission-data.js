export const missions = [
 {id:'exhibition',n:1,title:'展馆寻星记',region:'航天产业展示中心',star:'展示之星',reward:'巡航号',rewardNote:'直线回收光束，第5关可以驾驶',goal:'检查卫星、寻找模块，结合星图修复失联的逐星信号',controls:'点击展品近看，拖动翻转并打开检修盖；组合模块、转动刻度环；支持触屏和键盘',hint:'星仔：轨道仪停止运转了，先看看档案柜里留下了什么检修记录',duration:'约6–10分钟',color:'#66bfa5'},
 {id:'research',n:2,title:'拼一颗小卫星',region:'卫星研发区',star:'研发之星',reward:'追星号',rewardNote:'自动追踪目标，第5关适合轻松体验',goal:'检查接口、旋转锁定四个部件，通过地面联调后交付卫星',controls:'点击部件近看，旋转定位箭头后选择接口；装配后调整参数并测试',hint:'星仔：先查看任务单，我们一起造一颗真正能工作的卫星。',duration:'约4–6分钟',color:'#e5a06b'},
 {id:'operations',n:3,title:'接住太空信号',region:'卫星运营区',star:'运营之星',reward:'护航号',rewardNote:'可恢复护罩，第5关提供更高容错',goal:'扫描光进入金色高亮区时连接，成功3次',controls:'点击连接信号，或按空格；点早了可以继续尝试',hint:'看扫描光慢慢靠近金色区域，等到重合再连接。',duration:'约30–45秒',color:'#a4b968'},
 {id:'data',n:4,title:'地球找不同',region:'空间数据应用区',star:'数据之星',reward:'星雨号',rewardNote:'扇形散射，第5关适合清理成片垃圾',goal:'对比前后两张卫星示意图，找到3处变化',controls:'点击右图的变化区域；键盘也可选择观察区域',hint:'从绿地、河道和道路入手，看看哪里有了变化。',duration:'约45–60秒',color:'#6eafd3'},
 {id:'incubation',n:5,title:'新发明试飞场',region:'卫星加速孵化中心',star:'孵化之星',reward:'庆典星光装置',rewardNote:'第7关会场将出现星光舞台',goal:'驾驶已解锁机型，清理太空垃圾并抵达终点',controls:'方向键/WASD移动，或在航道内拖动；自动开火',hint:'选择一款机型。你负责移动，飞行器会自动清理和回收。',duration:'约75秒',color:'#eaa26c'},
 {id:'talent',n:6,title:'星仔的社区逐星跑',region:'卫星人才社区',star:'人才之星',reward:'社区庆典装饰',rewardNote:'第7关自动布置欢迎立牌与星星灯串',goal:'穿过公寓、林荫步道与运动场，抵达终点',controls:'左右换道，空格/↑跳跃，↓滑铲；支持触屏与单手手势',hint:'沿着步道跑起来！低栏跳过去，拱门滑过去，花坛记得绕开。',duration:'约60秒',color:'#ab93ce'},
 {id:'exchange',n:7,title:'小镇派对排排坐',region:'卫星交流中心',star:'交流之星',reward:'全镇庆典与纪念合影',rewardNote:'点亮七个区域，留下你和双IP的纪念画面',goal:'安排4位来宾，让两位朋友相邻、讲解员靠展示台',controls:'选择来宾后点击座位，也可拖动；已就座的来宾可调换',hint:'小林和小周想坐在一起，讲解员希望靠近展示台。',duration:'约45–60秒',color:'#d4b76b'}
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
