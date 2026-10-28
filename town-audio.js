import {AUDIO_KEY,readAudioPreferences,normalizeAudio,MusicPlayback} from './audio-core.js?art=40a';

const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/></svg>';
let storage;try{storage=localStorage;}catch{}
let prefs=readAudioPreferences(storage),context,musicGain,sfxGain,activated=false,lastEffect=0,speechTimer,voiceId=0;
const ducks=new Set(),lastSounds=new Map();
const media=document.createElement('audio');media.id='town-music';media.preload='none';media.loop=true;
media.src=new URL('./assets/audio/zhuxing-qingkong.mp3',import.meta.url).href;
const playback=new MusicPlayback(media,render);playback.enabled=prefs.music;playback.visible=!document.hidden;
let panel,trigger;

function ramp(param,value,seconds=.25){if(!context)return;param.cancelScheduledValues(context.currentTime);param.setTargetAtTime(value,context.currentTime,Math.max(.015,seconds/3));}
function gains(){if(!context)return;ramp(musicGain.gain,prefs.musicVolume*(ducks.size ? .24 : 1),.7);ramp(sfxGain.gain,prefs.sfxVolume,.1);}
function ensureContext(){
 if(context)return;
 const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
 context=new Context();musicGain=context.createGain();sfxGain=context.createGain();
 musicGain.gain.value=0;sfxGain.gain.value=prefs.sfxVolume;
 const limiter=context.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=6;limiter.ratio.value=5;
 context.createMediaElementSource(media).connect(musicGain);musicGain.connect(limiter);sfxGain.connect(limiter);limiter.connect(context.destination);gains();
}
function unlock(){
 activated=true;try{ensureContext();context?.resume().catch(()=>{});}catch{}
 if(!context)media.volume=prefs.musicVolume;
 playback.update({unlocked:true,visible:!document.hidden});render();
}
function save(){try{storage?.setItem(AUDIO_KEY,JSON.stringify(prefs));}catch{}}
function setPreferences(changes){prefs=normalizeAudio({...prefs,...changes});save();gains();if(!context)media.volume=prefs.musicVolume;playback.update({enabled:prefs.music});render();}
function duck(reason,on){if(on)ducks.add(reason);else ducks.delete(reason);gains();}
function effect(name='tap'){
 if(!activated||!prefs.sfx||document.hidden||!context||context.state!=='running')return;
 const now=performance.now(),limit={tap:75,collect:110,hit:450,success:900,discover:400,greet:450,particle:450,jump:150,slide:150,tick:300,go:400}[name]||100;
 if(now-(lastSounds.get(name)||-10000)<limit)return;lastSounds.set(name,now);lastEffect=now;
 const notes={tap:[[700,0,.085,.14]],collect:[[880,0,.12,.19],[1320,.07,.18,.11]],hit:[[190,0,.16,.15],[145,.06,.12,.08]],success:[[523,0,.24,.16],[659,.12,.24,.16],[784,.24,.24,.16],[1047,.38,.55,.13]],discover:[[523,0,.15,.15],[784,.09,.2,.12],[1047,.18,.3,.08]],greet:[[659,0,.12,.15],[880,.1,.23,.12]],particle:[[392,0,.25,.1],[587,.1,.3,.09],[1175,.24,.35,.065]],jump:[[380,0,.15,.16]],slide:[[320,0,.16,.12]],tick:[[660,0,.11,.14]],go:[[784,0,.16,.16],[1047,.08,.25,.14]]}[name]||[[700,0,.09,.12]];
 for(const [freq,delay,duration,level]of notes){const start=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();o.type=name==='hit'?'triangle':'sine';o.frequency.setValueAtTime(freq,start);if(name==='jump'||name==='slide')o.frequency.exponentialRampToValueAtTime(freq*(name==='jump'?2:.4),start+duration);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(level,start+.008);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g).connect(sfxGain);o.start(start);o.stop(start+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
}
function speak(text){
 if(!('speechSynthesis'in window))return;
 const currentVoice=++voiceId;speechSynthesis.cancel();clearTimeout(speechTimer);duck('voice',true);
 const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=1.05;
 const done=()=>{if(currentVoice!==voiceId)return;clearTimeout(speechTimer);duck('voice',false);};u.onend=done;u.onerror=done;
 speechTimer=setTimeout(done,Math.max(12000,text.length*450));speechSynthesis.speak(u);
}
function stopSpeech(){voiceId++;window.speechSynthesis?.cancel();clearTimeout(speechTimer);duck('voice',false);}
function checkpoint(){try{sessionStorage.setItem('town-music-position',JSON.stringify({seconds:media.currentTime,date:Date.now()}));}catch{}}
media.addEventListener('loadedmetadata',()=>{try{const p=JSON.parse(sessionStorage.getItem('town-music-position'));if(p&&Number.isFinite(p.seconds)&&p.seconds>=0&&Date.now()-p.date<1800000)media.currentTime=p.seconds%media.duration;}catch{}});
media.addEventListener('error',()=>{playback.status='error';render();});
document.addEventListener('visibilitychange',()=>{checkpoint();playback.update({visible:!document.hidden});if(document.hidden){stopSpeech();context?.suspend().catch(()=>{});}else if(activated)context?.resume().catch(()=>{});});
addEventListener('pagehide',()=>{checkpoint();playback.update({visible:false});stopSpeech();context?.suspend().catch(()=>{});});
addEventListener('pageshow',e=>{if(e.persisted){playback.update({visible:!document.hidden});if(activated&&!document.hidden)context?.resume().catch(()=>{});}});
addEventListener('storage',e=>{if(e.key===AUDIO_KEY){prefs=readAudioPreferences(storage);gains();playback.update({enabled:prefs.music});render();}});
document.addEventListener('pointerdown',e=>{if(e.isTrusted&&(!activated||playback.status==='blocked'))unlock();},{capture:true,passive:true});
document.addEventListener('keydown',e=>{if(e.isTrusted&&!e.repeat&&['Enter','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&(!activated||playback.status==='blocked'))unlock();},{capture:true});
document.addEventListener('click',e=>{
 const target=e.target.closest('button,a,summary');if(!target||target.disabled||target.closest('#town-audio-panel')||target===trigger||performance.now()-lastEffect<60)return;
 const named={'growth-replay':'particle','particle-burst':'particle','particle-return':'particle','intro-open':'discover'};
 effect(target.dataset.sound||named[target.id]||'tap');
});

function render(){
 if(!panel||!trigger)return;
 const playing=playback.status==='playing'&&!media.paused;
 trigger.dataset.playing=String(playing);trigger.title=playing?'正在播放 · 逐星晴空':'声音设置';
 trigger.querySelector('span').textContent=playing?'音乐中':'声音';
 for(const key of ['music','sfx']){const b=panel.querySelector('[data-audio-toggle="'+key+'"]');b.setAttribute('aria-checked',String(prefs[key]));b.textContent=prefs[key]?'开':'关';const slider=panel.querySelector('[data-audio-volume="'+key+'"]');slider.value=Math.round(prefs[key+'Volume']*100);panel.querySelector('[data-volume-label="'+key+'"]').textContent=slider.value+'%';}
 const labels={waiting:'点击页面后播放',playing:'正在播放 · 循环播放',loading:'音乐加载中',off:'背景音乐已关闭',background:'已暂停 · 返回页面继续',blocked:'点按下方按钮播放',error:'音乐未载入 · 点按重试'};
 panel.querySelector('.town-audio-status').textContent=labels[playback.status]||labels.waiting;
 const retry=panel.querySelector('[data-audio-retry]');retry.hidden=!['waiting','blocked','error'].includes(playback.status)||!prefs.music;
}
function mount(){
 document.body.append(media);
 trigger=document.querySelector('#audio-toggle');
 if(!trigger){trigger=document.createElement('button');const parent=document.querySelector('.home-header .header-tools,.game-header .header-tools,.quest-header nav,.top-actions,.explore-header');if(parent)parent.append(trigger);else{trigger.classList.add('town-audio-floating');document.body.append(trigger);}}
 trigger.classList.add('town-audio-trigger');trigger.removeAttribute('aria-pressed');trigger.setAttribute('aria-label','音乐与音效设置');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','town-audio-panel');trigger.setAttribute('aria-haspopup','dialog');trigger.innerHTML=icon+'<span>声音</span>';
 panel=document.createElement('section');panel.id='town-audio-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','town-audio-title');
 panel.innerHTML='<div class="town-audio-heading"><div><small>SOUND OF STAR TOWN</small><h2 id="town-audio-title">听见小镇的星光</h2></div><button class="town-audio-close" aria-label="关闭声音设置">×</button></div><div class="town-audio-track"><div class="town-audio-disc">'+icon+'</div><div><strong>逐星晴空</strong><span>Suno 原创生成 · 轻快纯音乐</span></div></div><p class="town-audio-status" role="status"></p>'+['music','sfx'].map(key=>'<div class="town-audio-control"><div><label id="town-'+key+'-label" for="town-'+key+'-volume">'+(key==='music'?'背景音乐':'交互音效')+'</label><button role="switch" aria-labelledby="town-'+key+'-label" data-audio-toggle="'+key+'" aria-checked="false">关</button></div><div><input id="town-'+key+'-volume" type="range" min="0" max="100" step="1" data-audio-volume="'+key+'" aria-label="'+(key==='music'?'音乐':'音效')+'音量"><output data-volume-label="'+key+'"></output></div></div>').join('')+'<div class="town-audio-actions"><button data-audio-retry>播放音乐</button><button data-audio-test>试听星光音效 <span>✦</span></button></div><p class="town-audio-note">设置自动记住 · 切到后台自动暂停</p>';
 document.body.append(panel);
 function close(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');}
 trigger.addEventListener('click',()=>{unlock();panel.hidden=!panel.hidden;trigger.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)panel.querySelector('.town-audio-close').focus();});
 panel.querySelector('.town-audio-close').onclick=()=>{close();trigger.focus();};
 panel.querySelectorAll('[data-audio-toggle]').forEach(b=>b.onclick=()=>{unlock();const key=b.dataset.audioToggle;setPreferences({[key]:!prefs[key]});if(key==='sfx'&&prefs.sfx)effect('collect');});
 panel.querySelectorAll('[data-audio-volume]').forEach(slider=>slider.oninput=()=>{const value=Number(slider.value)/100;unlock();setPreferences({[slider.dataset.audioVolume+'Volume']:value});});
 panel.querySelector('[data-audio-test]').onclick=()=>{unlock();if(!prefs.sfx)setPreferences({sfx:true});effect('collect');};
 panel.querySelector('[data-audio-retry]').onclick=()=>{if(playback.status==='error')media.load();unlock();};
 document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!trigger.contains(e.target))close();});
 document.addEventListener('keydown',e=>{if(panel.hidden)return;if(e.key==='Escape'){e.stopImmediatePropagation();close();trigger.focus();}else if(e.key==='Tab'){const items=[...panel.querySelectorAll('button,input')].filter(x=>!x.hidden);if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}}else if(panel.contains(e.target))e.stopPropagation();},{capture:true});
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
export const townAudio={effect,duck,speak,stopSpeech};
