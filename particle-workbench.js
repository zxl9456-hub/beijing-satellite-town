import * as THREE from 'three';
import { ParticleMotion, handGesture, STEP } from './particle-motion.js';
import {ParticlePicking} from './particle-picking.js';
import { HandTracker } from './hand-tracker.js';
import { MotionRecorder, createMotionPackage, readMotionPackage, sha256 } from './motion-recording.js';
const $ = s => document.querySelector(s);
export function createParticleWorkbench({ canvas, stage, camera, controls, home, span, region, meta, resources, getView, applyView, onChange, prepare, updateGeometry }) {
  const motion = new ParticleMotion(home, span), recorder = new MotionRecorder();
  let mode = 'touch', pointer = null, hands = [], handTime = 0, previousHands = new Map(), action = {}, accumulator = 0, lastPackage = null, lastRecording = null, playback = null, exporting = false, pendingSave = false, importBusy = false, cameraOn = false, disposed = false, url = null;
  const cameraPreview=$('#camera-preview');const placeCamera=()=>{(innerWidth<=700?$('#hand-group'):stage).append(cameraPreview);};placeCamera();addEventListener('resize',placeCamera);
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), v = new THREE.Vector3(), direction = new THREE.Vector3();
  const samplePicking=new ParticlePicking(home),projection=new THREE.Matrix4();
  function badge(){ $('#motion-panel-toggle').textContent=recorder.active?'● 录制中 · 工作台':cameraOn?'● 手势已开启':'✦ 粒子工作台';}
  function message(text) { $('#motion-status').textContent = text; }
  function available() { return !playback && !exporting && !importBusy && getView().mode === 'particles' && getView().growth === 1 && !getView().paused; }
  function worldAt(x, y) {
    camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);const anchor=samplePicking.pick(x,y,projection.elements,stage.clientWidth,stage.clientHeight);if(anchor)return new THREE.Vector3(...anchor);
    ndc.set(x * 2 - 1, 1 - y * 2);raycaster.setFromCamera(ndc,camera);
    camera.getWorldDirection(direction); plane.setFromNormalAndCoplanarPoint(direction, controls.target); return raycaster.ray.intersectPlane(plane, v)?.clone() ?? controls.target.clone();
  }
  function force(x, y, radius, kind, previous, dt) {
    const p = worldAt(x, y), drag = previous ? p.clone().sub(previous).multiplyScalar(1 / Math.max(dt, .024)) : new THREE.Vector3();
    drag.clampLength(0, span * .6); camera.getWorldDirection(direction).negate();
    return { p: p.toArray(), drag: drag.toArray(), normal: direction.toArray(), radius: Math.min(span*.18,Math.max(span*.045,camera.position.distanceTo(p)*Math.tan(camera.fov*Math.PI/360)*2*radius)), kind };
  }
  function setMode(next) { mode = next; pointer = null; controls.mouseButtons.LEFT = mode === 'orbit' ? THREE.MOUSE.ROTATE : null; controls.mouseButtons.RIGHT = mode === 'orbit' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE; controls.touches.ONE = mode === 'orbit' ? THREE.TOUCH.ROTATE : null; document.querySelectorAll('[data-interaction]').forEach(b => { const active = b.dataset.interaction === mode; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); }); $('#touch-help').textContent = mode === 'touch' ? '按住拨动粒子 · 右键旋转 · 滚轮缩放' : '拖动浏览视角 · 点击建筑查看介绍'; }
  setMode(mode);
  const pointerStart = e => {
    if (e.button !== 0 || !available() || mode !== 'touch') return;
    if (pointer && pointer.id !== e.pointerId) { pointer = null; return; }
    const r = canvas.getBoundingClientRect(); pointer = { id: e.pointerId, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, px: e.clientX, py: e.clientY, dragging: false, last: null, time: performance.now() }; canvas.setPointerCapture(e.pointerId);
  };
  const pointerMove = e => { if (pointer?.id !== e.pointerId) return; const r = canvas.getBoundingClientRect(); pointer.x = (e.clientX - r.left) / r.width; pointer.y = (e.clientY - r.top) / r.height; if (Math.hypot(e.clientX - pointer.px, e.clientY - pointer.py) > 6) pointer.dragging = true; };
  const pointerEnd = e => { if (pointer?.id === e.pointerId) pointer = null; };
  canvas.addEventListener('pointerdown', pointerStart); canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerup', pointerEnd); canvas.addEventListener('pointercancel', pointerEnd);
  const tracker = new HandTracker($('#hand-video'), (result, timestamp) => {
    if (disposed) return; hands = result.slice(0, 2); handTime = performance.now();
    const kinds = hands.map((h, i) => handGesture(h.landmarks, previousHands.get(h.label || i)?.kind)).filter(Boolean);
    if (tracker.ready) $('#hand-state').textContent = kinds.length ? `${kinds.length}只手 · ${kinds.map(k => k.kind === 'attract' ? '捏合吸引' : '手掌拨散').join(' / ')}` : '识别已就绪 · 请将手伸入画面';
  }, (state, text) => {
    cameraOn=['starting','loading','ready'].includes(state);badge();$('#hand-state').textContent = text; $('#hand-toggle').textContent = ['starting','loading','ready'].includes(state) ? '关闭手势' : state === 'error' ? '重试手势识别' : '开启手势识别'; $('#hand-toggle').setAttribute('aria-pressed', String(['starting','loading','ready'].includes(state))); $('#camera-preview').classList.toggle('hidden', !['starting','loading','ready'].includes(state));
    if (state === 'off' || state === 'error') { hands = []; previousHands.clear(); }
  });
  function stopCamera() { tracker.stop(); hands = []; previousHands.clear(); }
  $('#hand-toggle').addEventListener('click', () => { if (tracker.active || tracker.starting) stopCamera(); else if (!playback) { prepare(); setMode('touch'); $('#motion-panel').classList.remove('hidden'); tracker.start(); } });
  $('#camera-close').addEventListener('click', stopCamera);
  $('#motion-panel-toggle').addEventListener('click', () => { const hidden = $('#motion-panel').classList.toggle('hidden'); $('#motion-panel-toggle').setAttribute('aria-expanded', String(!hidden)); });
  $('#motion-panel-close').addEventListener('click', () => { $('#motion-panel').classList.add('hidden'); $('#motion-panel-toggle').setAttribute('aria-expanded', 'false'); $('#motion-panel-toggle').focus(); });
  document.querySelectorAll('[data-interaction]').forEach(b => b.addEventListener('click', () => { if (!playback) setMode(b.dataset.interaction); }));
  $('#particle-burst').addEventListener('click', () => { if (!playback) { prepare(); action.burst = true; message('星尘散开 · 松手后凝聚为完整建筑'); } });
  $('#particle-return').addEventListener('click', () => { if (!playback) { prepare(); action.return = true; pointer = null; message('正在凝聚 · 返回原建筑的每一个采样位置'); } });
  function currentInput(now) {
    const forces = [];
    if (available() && pointer && (pointer.dragging || now - pointer.time > 250)) { const f = force(pointer.x, pointer.y, innerWidth < 700 ? .060 : .075, 'push', pointer.last, STEP); pointer.last = new THREE.Vector3(...f.p); forces.push(f); }
    if (available() && tracker.ready && now - handTime < 220) {
      for (const [i, h] of hands.entries()) {
        const key = h.label || String(i), prev = previousHands.get(key), g = handGesture(h.landmarks, prev?.kind); if (!g) continue;if(prev){g.x=prev.x+(g.x-prev.x)*.42;g.y=prev.y+(g.y-prev.y)*.42;}
        const f = force(g.x, g.y, g.kind === 'attract' ? .065 : Math.max(.065, g.radius), g.kind, prev?.point, STEP); previousHands.set(key, { kind: g.kind, point: new THREE.Vector3(...f.p),x:g.x,y:g.y }); if (forces.length < 2) forces.push(f);
        let dot = document.getElementById('hand-dot-' + i); dot.classList.remove('hidden'); dot.style.left = g.x * 100 + '%'; dot.style.top = g.y * 100 + '%'; dot.classList.toggle('pinch', g.kind === 'attract'); dot.textContent = g.kind === 'attract' ? '捏合' : '拨散';
      }
    } else { previousHands.clear(); document.querySelectorAll('.hand-dot').forEach(d => d.classList.add('hidden')); }
    document.querySelectorAll('.hand-dot').forEach((d, i) => { if (i >= hands.length) d.classList.add('hidden'); });
    const input = { forces, ...action }; action = {}; return input;
  }
  async function startRecording() {
    if (recorder.active || exporting || importBusy || playback) return;
    prepare(); recorder.start(motion.snapshot(), { region: region.id, title: region.title, count: home.length / 3, span, initialView: getView(), coordinates: 'Three.js RH Y-up, metres, region centered XZ', cameraVideoIncluded: false });
    $('#record-play').disabled=true;$('#record-import').disabled=true;$('#growth-replay').disabled=true;$('#record-start').textContent = '■ 停止并保存'; $('#record-start').classList.add('recording'); $('#motion-panel').classList.remove('hidden'); message('录制中 00:00 / 01:30 · 手势与鼠标动作');badge();if(innerWidth<=700){$('#motion-panel').classList.add('hidden');$('#motion-panel-toggle').setAttribute('aria-expanded','false');}
  }
  async function finishRecording(reason = '') {
    if (!recorder.steps || exporting || !recorder.active && !$('#record-start').classList.contains('recording')) return;
    exporting = true; lastRecording = pendingSave ? lastRecording : recorder.finish(motion.snapshot());pendingSave=false; $('#record-start').disabled = true; $('#record-start').textContent = '正在打包动作'; message((reason ? reason + ' · ' : '') + '正在保存坐标与速度');
    try {
      lastPackage = await createMotionPackage(lastRecording, await resources()); if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(lastPackage);
      const link = $('#record-download'); link.href = url; link.download = `${region.title}-${new Date().toISOString().replace(/[:.]/g, '-')}.townrec.zip`; link.classList.remove('hidden');link.textContent='下载动作数据 ↓'; $('#record-play').disabled = false;
      // Retain a recovery download in browser storage; no data leaves this device.
      try { await remember(lastPackage, link.download); } catch { /* Download remains available if browser storage is full or disabled. */ }
      link.click(); message(`已保存 ${(lastRecording.steps.length * STEP).toFixed(1)}秒动作 · 可下载或回放`);
    } catch (e) { pendingSave=true;message('打包未完成：' + e.message + '。点击重试保存动作。'); }
    finally { exporting = false; $('#record-start').disabled = false; $('#record-import').disabled=false;$('#growth-replay').disabled=false;$('#record-start').classList.remove('recording'); $('#record-start').textContent = pendingSave?'重试保存动作':'● 开始动作录制';badge(); }
  }
  $('#record-start').addEventListener('click', () => {if(pendingSave){$('#record-start').classList.add('recording');finishRecording();}else recorder.active ? finishRecording() : startRecording();});
  function lockReplay(locked) { controls.enabled = !locked; document.querySelectorAll('.stage-actions button,.view-tools button,[data-interaction],#particle-burst,#particle-return,#hand-toggle,#record-start,#record-import').forEach(b => b.disabled = locked); $('#replay-stop').classList.toggle('hidden', !locked); $('#record-play').disabled = locked || !lastRecording; }
  function play(recording) {
    if (!recording.steps.length) { message('此记录没有运动步骤'); return; }
    stopCamera(); pointer = null; action = {}; motion.restore(recording.initial); updateGeometry(motion.positions); applyView(recording.metadata.initialView); playback = { recording, index: 0 }; accumulator = 0; lockReplay(true); message('动作回放 · 0%');
  }
  $('#record-play').addEventListener('click', () => { if (lastRecording && !recorder.active) play(lastRecording); });
  function stopPlayback(text = '回放已结束') { playback = null; lockReplay(false); message(text); onChange(motion); }
  $('#replay-stop').addEventListener('click', () => stopPlayback('已退出回放 · 可以继续拨动粒子'));
  $('#record-import').addEventListener('click', () => $('#record-file').click());
  $('#record-file').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file || recorder.active || playback || exporting) return;
    importBusy = true; message('正在校验动作包');
    try {
      const parsed = await readMotionPackage(file), r = parsed.recording;
      if (r.metadata.count !== home.length/3)throw new Error('此记录的粒子数量不匹配');if (r.metadata.region !== region.id) throw new Error(`此记录属于${r.metadata.title}，请进入相应区域再导入`);
      const current = await resources(); for (const path of ['source.points','source.glb.gz','particle-motion.js','region.json']) if (await sha256(current.get(path)) !== await sha256(parsed.entries.get(path))) throw new Error('建筑资源或模拟规则已变化，不能混用此记录');
      lastRecording = r; lastPackage = file;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);const link=$('#record-download');link.href=url;link.download=file.name;link.textContent='下载导入动作 ↓';link.classList.remove('hidden'); $('#record-play').disabled = false; play(r);
    } catch (error) { message('无法回放：' + error.message); } finally { importBusy = false; }
  });
  async function db() { return new Promise((resolve, reject) => { const req = indexedDB.open('star-town-motion', 1); req.onupgradeneeded = () => req.result.createObjectStore('latest'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
  async function remember(blob, name) { const database = await db(); return new Promise((resolve, reject) => { const tx = database.transaction('latest', 'readwrite'); tx.objectStore('latest').put({ blob, name, region: region.id }, 'recording'); tx.oncomplete = () => { database.close(); resolve(); }; tx.onerror = () => { database.close(); reject(tx.error); }; }); }
  (async () => { try { const database = await db(); const value = await new Promise((resolve, reject) => { const req = database.transaction('latest').objectStore('latest').get('recording'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); database.close(); if (disposed || value?.region !== region.id || lastPackage) return; url = URL.createObjectURL(value.blob); $('#record-download').href = url; $('#record-download').download = value.name; $('#record-download').classList.remove('hidden'); $('#record-download').textContent = '下载上次动作'; } catch { /* Storage is optional. */ } })();
  const visibility = () => { pointer = null; if (document.hidden) { stopCamera(); if (recorder.active) finishRecording('切换页面，已停止录制'); } accumulator = 0; };
  document.addEventListener('visibilitychange', visibility);
  const beforeUnload = e => { if (recorder.active || exporting) { e.preventDefault(); e.returnValue = ''; } }; addEventListener('beforeunload', beforeUnload);
  const navigation = async e => { const link = e.target.closest('a[href]');if(link&&exporting&&!link.hasAttribute('download')){e.preventDefault();return;} if (link && recorder.active && !link.hasAttribute('download')) { e.preventDefault(); await finishRecording('离开区域'); location.href = link.href; } }; document.addEventListener('click', navigation);
  return {
    motion,
    tick(dt, now) {
      tracker.tick(now); accumulator = Math.min(accumulator + dt, STEP * 4);
      while (accumulator >= STEP) {
        accumulator -= STEP; let input;
        if (playback) {
          const s = playback.recording.steps[playback.index++]; input = s.input; motion.step(input); applyView(s.view); updateGeometry(motion.positions); onChange(motion);
          if (playback.index >= playback.recording.steps.length) {
            const expected = playback.recording.final; let error = 0; for (let i = 0; i < home.length; i++) error = Math.max(error, Math.abs(motion.positions[i] - expected.positions[i]), Math.abs(motion.velocities[i] - expected.velocities[i]));
            stopPlayback(error < 1e-5 ? '回放完成 · 坐标与速度校验通过' : '回放完成 · 此设备存在浮点差异'); break;
          } else if (playback.index % 15 === 0) message(`动作回放 · ${Math.round(playback.index / playback.recording.steps.length * 100)}%`);
        } else {
          input = currentInput(now); if (getView().paused) { accumulator = 0; break; }
          if (motion.step(input)) updateGeometry(motion.positions); onChange(motion);
          if (recorder.active) {
            const active = recorder.capture(input, getView()); if (!active) finishRecording('达到90秒上限');
            else if (recorder.steps.length % 30 === 0) { const seconds = Math.floor(recorder.steps.length * STEP); message(`录制中 ${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')} / 01:30 · ${motion.moving}粒子运动`); }
          }
        }
      }
    },
    isPlaying: () => !!playback,isRecording:()=>recorder.active,closeCamera:()=>{if(tracker.active||tracker.starting)stopCamera();},
    reset() { if (recorder.active || playback) return false; motion.reset(); pointer = null; hands = []; action = {}; accumulator = 0; updateGeometry(motion.positions); return true; },
    setMaterial(material) { if (material) setMode('orbit'); else setMode('touch'); },
    dispose() { disposed = true;removeEventListener('resize',placeCamera); stopCamera(); if (url) URL.revokeObjectURL(url); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('click', navigation); removeEventListener('beforeunload', beforeUnload); canvas.removeEventListener('pointerdown', pointerStart); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerEnd); canvas.removeEventListener('pointercancel', pointerEnd); }
  };
}
