export const AUDIO_KEY='satellite-town-audio-v1';
export const DEFAULT_AUDIO=Object.freeze({music:true,sfx:true,musicVolume:.42,sfxVolume:.48});
export function normalizeAudio(value={}){
 const p={...DEFAULT_AUDIO};
 for(const key of ['music','sfx'])if(typeof value?.[key]==='boolean')p[key]=value[key];
 for(const key of ['musicVolume','sfxVolume'])if(typeof value?.[key]==='number'&&Number.isFinite(value[key]))p[key]=Math.max(0,Math.min(1,value[key]));
 return p;
}
export function readAudioPreferences(storage){
 try{const raw=storage.getItem(AUDIO_KEY);if(raw)return normalizeAudio(JSON.parse(raw));const p={...DEFAULT_AUDIO};const legacy=storage.getItem('town-game-sound');if(legacy==='off')p.sfx=false;return p;}catch{return {...DEFAULT_AUDIO};}
}
// A late play() resolution must never restart music after mute or backgrounding.
export class MusicPlayback{
 constructor(media,notify=()=>{}){this.media=media;this.notify=notify;this.enabled=true;this.visible=true;this.unlocked=false;this.status='waiting';this.pending=null;}
 get wanted(){return this.enabled&&this.visible&&this.unlocked;}
 update(changes={}){Object.assign(this,changes);return this.sync();}
 sync(){
  if(!this.wanted){this.media.pause();this.status=!this.enabled?'off':!this.visible?'background':'waiting';this.notify();return Promise.resolve();}
  if(this.pending)return this.pending;
  if(!this.media.paused){this.status='playing';this.notify();return Promise.resolve();}
  this.status='loading';this.notify();
  try{this.pending=Promise.resolve(this.media.play()).then(()=>{
   if(!this.wanted){this.media.pause();this.status=!this.enabled?'off':!this.visible?'background':'waiting';}else this.status='playing';
  },error=>{if(this.wanted)this.status=error?.name==='NotAllowedError'?'blocked':'error';}).finally(()=>{this.pending=null;this.notify();});}catch{this.status='error';this.notify();return Promise.resolve();}
  return this.pending;
 }
}
