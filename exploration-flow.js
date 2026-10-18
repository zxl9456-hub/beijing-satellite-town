// A separate, short-lived camera bookmark never modifies challenge progress.
export function readExplorationView(storage,id,now=Date.now()){
 try{const s=JSON.parse(storage.getItem('town.exploration-view.'+id));if(!s||s.version!==1||s.region!==id||!Number.isFinite(s.savedAt)||!['whole','facade','roof','entry'].includes(s.focusMode)||!Number.isFinite(s.selectedId)||(s.aspect!==undefined&&(!Number.isFinite(s.aspect)||s.aspect<=0))||now-s.savedAt>3600000||now<s.savedAt)return null;for(const v of [s.camera,s.target])if(!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isFinite(n)||Math.abs(n)>100000))return null;return s;}catch{return null;}
}
export function saveExplorationView(storage,id,view){try{storage.setItem('town.exploration-view.'+id,JSON.stringify({...view,version:1,region:id,savedAt:Date.now()}));return true;}catch{return false;}}
