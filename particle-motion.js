// Fixed-step, Float32 particle motion. The original mesh samples are immutable.
export const ENGINE_VERSION = 'town-motion-1';
export const STEP = 1 / 60;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export class ParticleMotion {
  constructor(home, span) {
    this.home = home.slice(); this.positions = home.slice(); this.velocities = new Float32Array(home.length);
    this.ages = new Float32Array(home.length / 3).fill(2); this.span = span;
    this.time = 0; this.moving = 0; this.maxOffset = 0;
  }
  reset() { this.positions.set(this.home); this.velocities.fill(0); this.ages.fill(2); this.time = 0; this.moving = 0; this.maxOffset = 0; }
  snapshot() { return { positions: this.positions.slice(), velocities: this.velocities.slice(), ages: this.ages.slice(), time: this.time }; }
  restore(s) { this.positions.set(s.positions); this.velocities.set(s.velocities); this.ages.set(s.ages); this.time = s.time; this.moving = this.ages.length; }
  step(input = {}) {
    this.time += STEP;
    const forces = input.forces || [], p = this.positions, v = this.velocities, h = this.home, ages = this.ages, span = this.span;
    if (!this.moving && !forces.length && !input.burst) return false;
    let moving = 0, maxOffset = 0;
    for (let i = 0, j = 0; i < ages.length; i++, j += 3) {
      let x = p[j], y = p[j + 1], z = p[j + 2], vx = v[j], vy = v[j + 1], vz = v[j + 2], touched = false;
      if (input.burst) {
        const seed = ((Math.imul(i + 17, 1664525) + 1013904223) >>> 0) / 4294967296;
        const angle = seed * 71, length = span * (.24 + seed * .19);
        vx += Math.cos(angle) * length; vy += (.25 + Math.sin(seed * 93) * .6) * length; vz += Math.sin(angle) * length;
        ages[i] = 0; touched = true;
      }
      for (const f of forces) {
        const dx = x - f.p[0], dy = y - f.p[1], dz = z - f.p[2], r2 = f.radius * f.radius;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= r2) continue;
        const falloff = (1 - d2 / r2) ** 2, s = STEP * falloff;
        if (f.kind === 'attract') { vx -= dx * 36 * s; vy -= dy * 36 * s; vz -= dz * 36 * s; }
        else {
          const d = Math.max(Math.sqrt(d2), span * .001), kick = span * 2.6;
          vx += (dx / d * kick + f.drag[0] * 14 + f.normal[0] * span * .24) * s;
          vy += (dy / d * kick + f.drag[1] * 14 + f.normal[1] * span * .24) * s;
          vz += (dz / d * kick + f.drag[2] * 14 + f.normal[2] * span * .24) * s;
        }
        ages[i] = 0; touched = true;
      }
      if (input.return) ages[i] = 2;
      ages[i] += STEP;
      if (!touched && ages[i] > .45 || input.return) {
        const k = input.return ? 70 : 48;
        vx += (h[j] - x) * k * STEP; vy += (h[j + 1] - y) * k * STEP; vz += (h[j + 2] - z) * k * STEP;
      }
      const damping = Math.exp(-(touched || ages[i] < .45 ? 2.8 : 10) * STEP);
      vx = clamp(vx * damping, -span * 1.5, span * 1.5); vy = clamp(vy * damping, -span * 1.5, span * 1.5); vz = clamp(vz * damping, -span * 1.5, span * 1.5);
      x += vx * STEP; y += vy * STEP; z += vz * STEP;
      const offset = Math.hypot(x - h[j], y - h[j + 1], z - h[j + 2]);
      if (!touched && ages[i] > .6 && offset < span * .00003 && Math.hypot(vx, vy, vz) < span * .00012) {
        // Snap to the actual original samples, not a bounding box or silhouette.
        x = h[j]; y = h[j + 1]; z = h[j + 2]; vx = vy = vz = 0;
      } else if (offset > 0 || touched) { moving++; maxOffset = Math.max(maxOffset, offset); }
      p[j] = x; p[j + 1] = y; p[j + 2] = z; v[j] = vx; v[j + 1] = vy; v[j + 2] = vz;
    }
    this.moving = moving; this.maxOffset = maxOffset; return true;
  }
}

// Normalize gestures against palm size, with hysteresis and mirrored x.
export function handGesture(landmarks, previous = 'push') {
  if (!Array.isArray(landmarks) || landmarks.length !== 21 || landmarks.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const palm = Math.max(.015, dist(landmarks[0], landmarks[9]));
  const ratio = dist(landmarks[4], landmarks[8]) / palm;
  const pinch = ratio < (previous === 'attract' ? .48 : .32);
  const indices = pinch ? [4, 8] : [0, 5, 9, 13, 17];
  const x = indices.reduce((s, i) => s + landmarks[i].x, 0) / indices.length;
  const y = indices.reduce((s, i) => s + landmarks[i].y, 0) / indices.length;
  return { x: clamp(1 - x, 0, 1), y: clamp(y, 0, 1), radius: clamp(palm * 1.15, .04, .14), kind: pinch ? 'attract' : 'push' };
}
