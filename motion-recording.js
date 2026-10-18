import { ENGINE_VERSION, STEP } from './particle-motion.js';
const encoder = new TextEncoder(), decoder = new TextDecoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { for (let b = 0; b < 8; b++) n = (n >>> 1) ^ ((n & 1) ? 0xedb88320 : 0); return n >>> 0; });
const asBytes = x => typeof x === 'string' ? encoder.encode(x) : x instanceof Uint8Array ? x : new Uint8Array(x.buffer ?? x, x.byteOffset ?? 0, x.byteLength);
const crc32 = bytes => { let c = 0xffffffff; for (const b of bytes) c = (c >>> 8) ^ crcTable[(c ^ b) & 255]; return (c ^ 0xffffffff) >>> 0; };
export async function sha256(data) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', asBytes(data)))].map(b => b.toString(16).padStart(2, '0')).join(''); }
function storedZip(entries) {
  const chunks = [], directory = []; let offset = 0, centralSize = 0;
  for (const [path, data] of entries) {
    const name = encoder.encode(path), body = asBytes(data), crc = crc32(body), header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true); view.setUint16(12, 33, true);
    view.setUint32(14, crc, true); view.setUint32(18, body.length, true); view.setUint32(22, body.length, true); view.setUint16(26, name.length, true); header.set(name, 30);
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(14, 33, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, body.length, true); cv.setUint32(24, body.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
    chunks.push(header, body); directory.push(central); offset += header.length + body.length; centralSize += central.length;
  }
  const end = new Uint8Array(22), ev = new DataView(end.buffer); ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true); ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  return new Blob([...chunks, ...directory, end], { type: 'application/zip' });
}
function snapshotBytes(s) { const out = new Float32Array(s.positions.length * 2 + s.ages.length); out.set(s.positions); out.set(s.velocities, s.positions.length); out.set(s.ages, s.positions.length * 2); return out; }
function snapshotRead(data, count, time) { if (data.byteLength !== count * 28) throw new Error('粒子快照长度不正确'); const f = new Float32Array(data.slice().buffer); if (f.some(x => !Number.isFinite(x) || Math.abs(x) > 1e5)) throw new Error('快照包含无效数值'); return { positions: f.slice(0, count * 3), velocities: f.slice(count * 3, count * 6), ages: f.slice(count * 6), time }; }
function validView(v) { return !!v && [v.camera,v.target].every(a=>Array.isArray(a)&&a.length===3&&a.every(x=>Number.isFinite(x)&&Math.abs(x)<1e5)) && Number.isFinite(v.clock) && v.clock>=0 && v.clock<1e9 && Number.isFinite(v.growth) && v.growth>=0 && v.growth<=1 && Number.isFinite(v.cohesion) && v.cohesion>=0 && v.cohesion<=1 && Number.isFinite(v.fov) && v.fov>1 && v.fov<179 && ['particles','material'].includes(v.mode) && (v.pulse===undefined || Number.isFinite(v.pulse)&&v.pulse>=0&&v.pulse<=1);  }
export class MotionRecorder {
  start(initial, metadata) { this.initial = initial; this.metadata = { ...metadata, engine: ENGINE_VERSION, createdAt: new Date().toISOString(), cameraVideoIncluded: false }; this.steps = []; this.active = true; }
  capture(input, view) { if (!this.active) return false; this.steps.push({ input: structuredClone(input), view: structuredClone(view) }); if (this.steps.length >= 5400) this.active = false; return this.active; }
  finish(final) { this.active = false; return { schema: 'satellite-town-motion', version: 1, metadata: this.metadata, initialTime: this.initial.time, finalTime: final.time, stepSeconds: STEP, steps: this.steps, initial: this.initial, final }; }
}
export async function createMotionPackage(recording, resources) {
  const { initial, final, ...log } = recording;
  const entries = new Map(resources); entries.set('initial.f32', snapshotBytes(initial)); entries.set('final.f32', snapshotBytes(final)); entries.set('motion.json', JSON.stringify(log));
  entries.set('README.txt', '北京卫星小镇 · 粒子动作数据\n\n不含摄像头视频或音频，不上传服务器。请在相应区域页面选择“导入动作回放”。\n保存原建筑表面采样、局部GLB、固定60Hz模拟规则、每步手势/鼠标作用力、相机、渲染状态与起止坐标/速度/触碰年龄。\ninitial.f32 / final.f32：Float32LE，依次为 count×XYZ坐标、count×XYZ速度、count×触碰年龄(秒)。Three.js右手Y-up；Blender坐标转换为(x,-z,y)。\n时间由motion.json给出。回放从初始快照按steps逐步运行，最终校验原始坐标和速度。凝聚后启用完整GLB材质，不以粒子轮廓替代建筑。\nmanifest.json记录包内文件的SHA-256与字节数。跨引擎版本不直接混播。记录不等同于已经烘焙的Blender动画。\n');
  const files = await Promise.all([...entries].map(async ([path, data]) => ({ path, bytes: asBytes(data).byteLength, sha256: await sha256(data) })));
  entries.set('manifest.json', JSON.stringify({ schema: 'satellite-town-motion-package', version: 1, engine: ENGINE_VERSION, files }, null, 2));
  return storedZip(entries);
}
export async function readMotionPackage(file) {
  if (file.size > 50 * 1024 * 1024) throw new Error('数据包超过50MB');
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer), entries = new Map(); let offset = 0;
  while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    if (entries.size >= 16 || offset + 30 > bytes.length) throw new Error('数据包结构无效');
    const flags = view.getUint16(offset + 6, true), method = view.getUint16(offset + 8, true), crc = view.getUint32(offset + 14, true), size = view.getUint32(offset + 18, true), raw = view.getUint32(offset + 22, true), nl = view.getUint16(offset + 26, true), el = view.getUint16(offset + 28, true);
    if (method !== 0 || flags & 8 || raw !== size || size > 35 * 1024 * 1024 || offset + 30 + nl + el + size > bytes.length) throw new Error('请导入本网站导出的原始动作ZIP');
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nl));
    if (entries.has(name) || name.includes('..') || name.startsWith('/')) throw new Error('数据包文件名无效');
    const body = bytes.slice(offset + 30 + nl + el, offset + 30 + nl + el + size); if (crc32(body) !== crc) throw new Error('文件校验失败'); entries.set(name, body); offset += 30 + nl + el + size;
  }
  if (!entries.has('manifest.json') || !entries.has('motion.json')) throw new Error('未找到粒子动作记录');
  const manifest = JSON.parse(decoder.decode(entries.get('manifest.json')));
  if (manifest.schema !== 'satellite-town-motion-package' || manifest.version !== 1 || manifest.engine !== ENGINE_VERSION || !Array.isArray(manifest.files) || manifest.files.length !== entries.size - 1) throw new Error('动作格式或引擎版本不匹配');
  const listed = new Set(); for (const f of manifest.files) { const data = entries.get(f.path); if (listed.has(f.path) || !data || f.bytes !== data.length || await sha256(data) !== f.sha256) throw new Error('动作数据完整性校验失败'); listed.add(f.path); }
  for (const path of ['initial.f32','final.f32','source.points','source.glb.gz','region.json','particle-motion.js']) if (!listed.has(path)) throw new Error('动作包缺少建筑资源');
  const recording = JSON.parse(decoder.decode(entries.get('motion.json'))), count = recording.metadata?.count;
  if (recording.schema !== 'satellite-town-motion' || recording.version !== 1 || recording.metadata?.engine !== ENGINE_VERSION || !Number.isInteger(count) || count < 1 || count > 80000 || recording.stepSeconds !== STEP || !Array.isArray(recording.steps) || recording.steps.length > 5400 || !Number.isFinite(recording.initialTime) || !Number.isFinite(recording.finalTime)) throw new Error('动作记录无效');
  if (!validView(recording.metadata.initialView) || recording.initialTime<0 || recording.finalTime<recording.initialTime || recording.metadata.cameraVideoIncluded!==false) throw new Error('动作起始状态无效');
  for (const s of recording.steps) {
    if (!s.input || !Array.isArray(s.input.forces) || s.input.forces.length > 2 || !validView(s.view) || ['burst','return'].some(k=>s.input[k]!==undefined&&typeof s.input[k]!=='boolean')) throw new Error('动作步骤无效');
    for (const f of s.input.forces) if (!['push','attract'].includes(f.kind) || !Number.isFinite(f.radius) || f.radius <= 0 || f.radius > 500 || [f.p, f.drag, f.normal].some(a => !Array.isArray(a) || a.length !== 3 || a.some(x => !Number.isFinite(x) || Math.abs(x) > 1e5))) throw new Error('作用力数据无效');
  }
  recording.initial = snapshotRead(entries.get('initial.f32'), count, recording.initialTime); recording.final = snapshotRead(entries.get('final.f32'), count, recording.finalTime);
  return { recording, entries };
}
