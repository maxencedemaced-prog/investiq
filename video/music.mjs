// Musique d'ambiance générée par le code (aucun droit d'auteur) : accords, basse, arpège, batterie légère. Usage : node music.mjs <secondes> <bpm>
import fs from "fs";
const SR = 44100, DUR = +process.argv[2] || 60, BPM = +(process.argv[3] || 104), BEAT = 60 / BPM;
const N = Math.ceil(DUR * SR), L = new Float32Array(N), R = new Float32Array(N);
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// C – G – Am – F (2 mesures chacun)
const chords = [[48, 55, 60, 64, 67], [43, 50, 55, 59, 62], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60]];
const bar = BEAT * 4;
function add(buf, i, v) { if (i >= 0 && i < N) buf[i] += v; }
// Nappe (pad) : dents de scie légèrement désaccordées, filtrées
for (let c = 0; c * bar * 2 < DUR; c++) {
  const ch = chords[c % 4], t0 = c * bar * 2, len = bar * 2;
  ch.forEach((m, k) => {
    let lp = 0; const f = hz(m + 12), det = [0.997, 1.003];
    for (let s = 0; s < len * SR; s++) {
      const t = s / SR, env = Math.min(1, t / 0.4) * Math.min(1, (len - t) / 0.4);
      let x = 0; det.forEach(d => { x += 2 * ((t * f * d) % 1) - 1; });
      lp += 0.06 * (x - lp);
      const i = Math.floor((t0 + t) * SR), v = lp * env * 0.035;
      add(L, i, v * (k % 2 ? 0.7 : 1)); add(R, i, v * (k % 2 ? 1 : 0.7));
    }
  });
  // Basse
  for (let b = 0; b < 8; b++) {
    const f = hz(ch[0] - 12), t0b = t0 + b * BEAT;
    for (let s = 0; s < BEAT * 0.9 * SR; s++) { const t = s / SR, v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3) * 0.18; add(L, Math.floor((t0b + t) * SR), v); add(R, Math.floor((t0b + t) * SR), v); }
  }
  // Arpège pluck en croches
  for (let a = 0; a < 16; a++) {
    const m = ch[[2, 3, 4, 3][a % 4]] + 12, f = hz(m), ta = t0 + a * BEAT / 2;
    for (let s = 0; s < 0.35 * SR; s++) { const t = s / SR, v = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * Math.exp(-t * 9) * 0.07; const i = Math.floor((ta + t) * SR); add(L, i, v * (a % 2 ? 0.6 : 1)); add(R, i, v * (a % 2 ? 1 : 0.6)); }
  }
}
// Batterie : kick sur les temps, charleston sur les contretemps, clap sur 2 et 4 (après l'intro de 2 mesures)
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
for (let b = 0; b * BEAT < DUR; b++) {
  const tb = b * BEAT, intro = tb < bar * 2;
  if (!intro || b % 2 === 0) for (let s = 0; s < 0.3 * SR; s++) { const t = s / SR, f = 50 + 90 * Math.exp(-t * 30), v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9) * 0.32; add(L, Math.floor((tb + t) * SR), v); add(R, Math.floor((tb + t) * SR), v); }
  if (!intro) {
    const th = tb + BEAT / 2; for (let s = 0; s < 0.05 * SR; s++) { const t = s / SR, v = rnd() * Math.exp(-t * 80) * 0.05; add(L, Math.floor((th + t) * SR), v * 0.8); add(R, Math.floor((th + t) * SR), v); }
    if (b % 2 === 1) for (let s = 0; s < 0.15 * SR; s++) { const t = s / SR, v = rnd() * Math.exp(-t * 25) * 0.08; add(L, Math.floor((tb + t) * SR), v); add(R, Math.floor((tb + t) * SR), v); }
  }
}
// Fondu de fin + normalisation douce
let peak = 0; for (let i = 0; i < N; i++) { const t = i / SR, g = Math.min(1, (DUR - t) / 2.5); L[i] *= g; R[i] *= g; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const buf = Buffer.alloc(44 + N * 4), gain = 0.9 / peak;
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.max(-32767, Math.min(32767, L[i] * gain * 32767)), 44 + i * 4); buf.writeInt16LE(Math.max(-32767, Math.min(32767, R[i] * gain * 32767)), 46 + i * 4); }
fs.writeFileSync("public/music.wav", buf);
console.log("music.wav", DUR + "s");
