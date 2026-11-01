// Style « Duo » (Reel 1080 × 1920) : deux personnages comparés ({A} fait le bon choix, {B} non), montage rapide.
// Chaque scène (phrase de la voix) est découpée en plans de ~2 s (b.shots) : un fond qui change à chaque plan (clair, nuit, orange…),
// un gros titre condensé qui s'écrit mot à mot, une petite phrase manuscrite, et un visuel qui se construit (pièces, colonnes, fiche, compteur…).
// Un plan démarre quand la voix prononce son mot déclencheur (shot.at ; « =mot » pour un mot exact), sinon au début de la scène.
// Données : src/data.json (beats + minutage des mots + dossier + duo : prénoms et apparence), écrit par render-job.mjs.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { loadFont as loadHand } from '@remotion/google-fonts/Caveat';
import { loadFont as loadHead } from '@remotion/google-fonts/Anton';
import data from './data.json';

const { fontFamily } = loadFont('normal', { weights: ['500', '700', '800', '900'], subsets: ['latin', 'latin-ext'] });
const { fontFamily: hand } = loadHand('normal', { weights: ['700'], subsets: ['latin', 'latin-ext'] });
const { fontFamily: head } = loadHead('normal', { weights: ['400'], subsets: ['latin', 'latin-ext'] });
const FPS = 30;
const INK = '#0f1e3c', GREEN = '#16a34a', RED = '#e5383b', BLUE = '#2563eb', ORANGE = '#ff6b35', GOLD = '#f6c443';
// Fonds : couleur, texte, couleur d'accent (mots entre *…*)
const BG = {
  light: ['linear-gradient(180deg,#f4f7fc,#e4ebf6)', INK, BLUE],
  dark: ['linear-gradient(180deg,#121a2e,#0b1120)', '#ffffff', ORANGE],
  orange: ['linear-gradient(180deg,#ff7a45,#ff6430)', '#ffffff', INK],
  green: ['linear-gradient(180deg,#1fb85a,#139447)', '#ffffff', INK],
  blue: ['linear-gradient(180deg,#3672f5,#1f56d6)', '#ffffff', GOLD],
};
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const ease = Easing.out(Easing.cubic);
const io = (f, a, b, x, y, e = ease) => interpolate(f, [a, b], [x, y], { ...clamp, easing: e });
const D = data.dossier || {};
const DUO = data.duo || { A: { name: 'Léa', long: true, hair: '#6b3f22' }, B: { name: 'Tom', hair: '#2b2b2b', skin: '#e0ac86' } };
const eur = n => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' €';
const norm = w => String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Même minutage que Dossier.jsx
const beats = (data.beats || []).map((b, i, all) => {
  const from = Math.round(b.start * FPS), last = i === all.length - 1;
  const to = last ? Math.round((b.end + (data.jingle ? 3 : 1.6)) * FPS) : Math.round(b.end * FPS);
  return { ...b, i, from, dur: Math.max(12, to - from) };
});
export const duoFrames = beats.length ? beats[beats.length - 1].from + beats[beats.length - 1].dur : 60;
const JINGLE_AT = beats.length ? Math.round(beats[beats.length - 1].end * FPS) - 4 : 0;

// Début de chaque plan dans la scène (en images), d'après le mot déclencheur
function shotTimes(b) {
  const shots = b.shots && b.shots.length ? b.shots : [{ v: b.visual === 'end' ? 'end' : 'duo' }];
  const words = (b.words || []).filter(w => w.w);
  let from = 0;
  const starts = shots.map((s, k) => {
    if (!k || !s.at) return k ? null : 0;
    const exact = s.at[0] === '=', key = norm(exact ? s.at.slice(1) : s.at);
    const j = words.findIndex((w, i) => i >= from && (exact ? norm(w.w) === key : norm(w.w).includes(key)));
    if (j < 0) return null;
    from = j + 1; return Math.max(0, Math.round(words[j].t * FPS) - 2);
  });
  // Plans sans mot trouvé : répartis entre leurs voisins
  for (let k = 1; k < starts.length; k++) if (starts[k] == null) {
    let n = k; while (n < starts.length && starts[n] == null) n++;
    const a = starts[k - 1], z = n < starts.length ? starts[n] : b.dur;
    for (let m = k; m < n; m++) starts[m] = Math.round(a + (z - a) * (m - k + 1) / (n - k + 1));
  }
  return shots.map((s, k) => ({ s, from: starts[k], dur: Math.max(8, (k + 1 < shots.length ? starts[k + 1] : b.dur) - starts[k]) }));
}

// ── Dessin (chaînes SVG, repère 360 × 640 = écran / 3) ──
const C = Math.cos(Math.PI / 6), S = Math.sin(Math.PI / 6);
const sh = (hex, k) => { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = n >> 8 & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k))); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); };
const P = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
function prism(x, y, a, b, h, col) {
  if (h <= 0.5) return '';
  const F = [x, y], R = [x + a * C, y - a * S], L = [x - b * C, y - b * S], B = [x + a * C - b * C, y - a * S - b * S], up = p => [p[0], p[1] - h];
  return `<polygon points="${P([F, L, up(L), up(F)])}" fill="${col}"/><polygon points="${P([F, R, up(R), up(F)])}" fill="${sh(col, .78)}"/><polygon points="${P([up(F), up(R), up(B), up(L)])}" fill="${sh(col, 1.25)}"/>`;
}
function coins(x, y, n, r) { let s = ''; for (let i = 0; i < n; i++) { const yy = y - i * r * 0.5; s += `<rect x="${x - r}" y="${yy - r * .3}" width="${2 * r}" height="${r * .5}" fill="#d99a1c"/><ellipse cx="${x}" cy="${yy + r * .2}" rx="${r}" ry="${r * .45}" fill="#c4860f"/><ellipse cx="${x}" cy="${yy - r * .3}" rx="${r}" ry="${r * .45}" fill="${GOLD}" stroke="#d99a1c"/>`; } return s; }
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const pill = (x, y, t, bg = INK, fg = '#fff', o = 1, fs = 12, extra = '') => { if (!t) return ''; const w = String(t).length * fs * .62 + fs * 1.6, h = fs * 2; return `<g opacity="${o}"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${bg}"${extra}/><text x="${x}" y="${y + fs * .38}" text-anchor="middle" font-family="${fontFamily}" font-weight="800" font-size="${fs}" fill="${fg}">${esc(t)}</text></g>`; };
const shadow = (x, y, rx, dark) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * .3}" fill="${dark ? 'rgba(0,0,0,.35)' : 'rgba(15,30,60,.16)'}"/>`;
// Personnage (pieds en x,y, taille k) : o = { hair, long, skin, top, mood }, pose = { arm (0 bas → 1 levés), wave, shake, drop, jump }
function person(x, y, o, k = 1, pose = {}, f = 0) {
  const skin = o.skin || '#f1c7a1', hair = o.hair || '#3b2a20', top = o.top || GREEN;
  const jy = pose.jump ? Math.abs(Math.sin(f / 4)) * 8 : 0, hx = pose.shake ? Math.sin(f / 2.2) * 2.2 : 0;
  const mouth = o.mood === 'sad' ? `<path d="M-5 -74 q5 -4 10 0" stroke="#5b3b2a" stroke-width="2" fill="none"/>`
    : o.mood === 'neutral' ? `<path d="M-4 -75 h8" stroke="#5b3b2a" stroke-width="2"/>`
    : o.mood === 'wow' ? `<ellipse cx="0" cy="-75" rx="3" ry="4" fill="#5b3b2a"/>`
    : `<path d="M-5 -76 q5 5 10 0" stroke="#5b3b2a" stroke-width="2" fill="none"/>`;
  const up = Math.max(0, Math.min(1, pose.arm || 0)), wave = pose.wave ? Math.sin(f / 3) * 25 : 0;
  const arm = (side, ang) => `<rect x="-3" y="0" width="6" height="22" rx="3" fill="${top}" transform="translate(${side * 13} -54) rotate(${side * -(12 + 150 * up) + (side > 0 ? -wave : 0)})"/><circle cx="0" cy="0" r="0"/>`;
  const drop = pose.drop ? `<path d="M15 -96 q4 7 0 10 q-4 -3 0 -10 z" fill="#60a5fa" opacity="${0.5 + 0.5 * Math.sin(f / 5)}"/>` : '';
  return `<g transform="translate(${x} ${y - jy}) scale(${k})">` + shadow(0, 2 + jy / k, 16, false) +
    `<rect x="-9" y="-28" width="7" height="28" rx="3" fill="#334155"/><rect x="2" y="-28" width="7" height="28" rx="3" fill="#334155"/>` +
    arm(-1) + arm(1) +
    `<g transform="translate(${hx} 0)">` + (o.long ? `<path d="M-15 -86 q-2 22 4 30 h22 q6 -8 4 -30 z" fill="${hair}"/>` : '') + `</g>` +
    `<rect x="-14" y="-58" width="28" height="32" rx="10" fill="${top}"/>` +
    `<g transform="translate(${hx} 0)"><circle cx="0" cy="-80" r="14" fill="${skin}"/>` +
    `<path d="M-14 -82 q2 -16 14 -16 q12 0 14 16 q-6 -6 -14 -6 q-8 0 -14 6 z" fill="${hair}"/>` +
    `<circle cx="-5" cy="-81" r="1.8" fill="#1f2937"/><circle cx="5" cy="-81" r="1.8" fill="#1f2937"/>` + mouth + drop + `</g></g>`;
}
const who = (s, b) => s.who === 'B' ? { ...DUO.B, top: s.top || BLUE, mood: s.mood || 'neutral' } : { ...DUO.A, top: s.top || GREEN, mood: s.mood || 'happy' };
const nameOf = s => (s.who === 'B' ? DUO.B : DUO.A).name;
// Fiche profil (comme une carte d'identité) qui glisse depuis la gauche
function card(x, y, s, f, dark) {
  const p = who(s), dx = io(f, 0, 9, -260, 0, Easing.out(Easing.back(1.3)));
  const av = `<g transform="translate(${x + 30} ${y + 72}) scale(.56)">${person(0, 0, { ...p, top: p.top }, 1).replace(/<ellipse[^>]*rgba[^>]*\/>/, '')}</g>`;
  return `<g transform="translate(${dx} 0)"><rect x="${x}" y="${y}" width="220" height="62" rx="14" fill="#fff" stroke="#dbe3ef" style="filter:drop-shadow(0 6px 10px rgba(15,30,60,.15))"/>` +
    `<clipPath id="cl${y}"><rect x="${x}" y="${y}" width="60" height="62" rx="14"/></clipPath><g clip-path="url(#cl${y})">${av}</g>` +
    `<text x="${x + 66}" y="${y + 18}" font-family="${fontFamily}" font-size="8" font-weight="700" fill="#94a3b8" letter-spacing="1">PROFIL</text>` +
    `<text x="${x + 66}" y="${y + 36}" font-family="${head}" font-size="19" fill="${INK}">${esc(nameOf(s).toUpperCase())}</text>` +
    `<text x="${x + 66}" y="${y + 52}" font-family="${fontFamily}" font-size="10" font-weight="800" fill="${BLUE}">${esc(s.sub || '')}</text></g>`;
}
// Montant qui défile (pastille blanche « libellé + valeur »)
function counter(x, y, label, v, f, at = 8, len = 26, col = INK) {
  const val = v * io(f, at, at + len, 0, 1, Easing.out(Easing.quad));
  const txt = eur(val), w = txt.length * 13 + (label ? label.length * 6 + 26 : 24);
  return `<g opacity="${io(f, at - 4, at, 0, 1)}"><rect x="${x - w / 2}" y="${y - 20}" width="${w}" height="40" rx="12" fill="#fff" stroke="#dbe3ef"/>` +
    (label ? `<text x="${x - w / 2 + 14}" y="${y + 4}" font-family="${fontFamily}" font-size="9" font-weight="800" fill="#94a3b8">${esc(label)}</text>` : '') +
    `<text x="${x + w / 2 - 14}" y="${y + 9}" text-anchor="end" font-family="${head}" font-size="24" fill="${col}">${txt}</text></g>`;
}
// Pluie de pièces (éclat de joie)
function burst(x, y, f, at) {
  const t = f - at; if (t < 0) return ''; let s = '';
  for (let k = 0; k < 14; k++) { const a = -Math.PI / 2 + (k - 6.5) * 0.2, v = 5 + (k * 37 % 5), px = x + Math.cos(a) * v * t, py = y + Math.sin(a) * v * t + 0.35 * t * t; s += `<ellipse cx="${px}" cy="${py}" rx="7" ry="3.5" fill="${GOLD}" stroke="#d99a1c" opacity="${io(t, 22, 34, 1, 0)}" transform="rotate(${t * 12 + k * 30} ${px} ${py})"/>`; }
  return s;
}

const V = {
  // Les deux personnages en gros plan, qui saluent, étiquettes au-dessus
  duo: (s, f, dark) => {
    const pa = io(f, 0, 10, 0, 1, Easing.out(Easing.back(1.8))), pb = io(f, 4, 14, 0, 1, Easing.out(Easing.back(1.8)));
    const A = { ...DUO.A, top: GREEN, mood: s.moodA || 'happy' }, B = { ...DUO.B, top: s.topB || BLUE, mood: s.moodB || 'happy' };
    return person(115, 540, A, 2.1 * pa, { wave: s.wave !== false && f < 40, arm: s.wave !== false && f < 40 ? 0.9 : (s.armA || 0), jump: s.jumpA }, f) +
      person(250, 540, B, 2.1 * pb, { wave: s.wave !== false && f > 8 && f < 48, arm: s.wave !== false && f > 8 && f < 48 ? 0.9 : 0, shake: s.shakeB, drop: s.dropB }, f + 9) +
      pill(115, 580, DUO.A.name, '#fff', INK, pa, 15) + pill(250, 580, DUO.B.name, '#fff', INK, pb, 15) +
      pill(115, 300, s.pillA, GREEN, '#fff', io(f, 12, 18, 0, 1), 14) + pill(250, 300, s.pillB, s.topB || BLUE, '#fff', io(f, 16, 22, 0, 1), 14);
  },
  // Fiche du personnage + pile de pièces qui monte + montant qui défile
  coins: (s, f, dark) => {
    const n = Math.round(io(f, 6, 30, 0, s.n ?? 8)), p = who(s), done = f > 34;
    return card(70, 205, s, f, dark) + (s.value != null ? counter(180, 300, s.label || '', s.value, f, 8, 26, s.who === 'B' ? (s.col === 'r' ? RED : BLUE) : GREEN) : pill(180, 300, s.pill, s.who === 'B' ? (s.top || BLUE) : GREEN, '#fff', io(f, 8, 14, 0, 1), 15)) +
      shadow(150, 540, 60, dark) + coins(150, 528, n, 46) + (s.n === 0 ? pill(150, 500, 'VIDE', '#94a3b8', '#fff', io(f, 8, 12, 0, 1), 14) : '') +
      person(282, 560, p, 1.7, { jump: done && p.mood === 'happy', arm: done && p.mood === 'happy' ? 1 : 0, shake: done && p.mood === 'sad', drop: p.mood === 'sad' }, f) +
      (done && p.mood === 'happy' ? burst(150, 528 - n * 23, f, 34) : '');
  },
  // Deux colonnes 3D qui montent, montants au-dessus, personnages au pied
  columns: (s, f, dark) => {
    const p = io(f, 4, 34, 0, 1, Easing.inOut(Easing.cubic)), a = s.left || 1, c = s.right || 1, max = Math.max(a, c), hA = 190 * a / max * p, hB = 190 * c / max * p;
    const colB = s.colB === 'r' ? '#ef4444' : '#3b82f6';
    return `<g transform="translate(0 6)">` + prism(180, 600, 150, 150, 16, dark ? '#24304d' : '#1f2b46') + prism(130, 520, 56, 56, hA, '#22c55e') + prism(240, 480, 56, 56, hB, colB) +
      pill(118, 520 - hA - 36, '≈ ' + eur(a * p), GREEN, '#fff', io(f, 4, 8, 0, 1), 14) + pill(252, 480 - hB - 34, '≈ ' + eur(c * p), s.colB === 'r' ? RED : BLUE, '#fff', io(f, 4, 8, 0, 1), 14) +
      person(52, 575, { ...DUO.A, top: GREEN, mood: 'happy' }, 1.1, { arm: f > 36 ? 1 : 0, jump: f > 36 }, f) + person(318, 560, { ...DUO.B, top: s.colB === 'r' ? RED : BLUE, mood: f > 36 ? 'sad' : 'neutral' }, 1.1, { shake: f > 36 && f < 60 }, f) + `</g>` +
      (f > 36 ? burst(130, 520 - hA - 30, f, 36) : '');
  },
  // Compteur à aiguille (rendement, frais…)
  gauge: (s, f, dark) => {
    let t = ''; const cx = 180, cy = 470, R = 120, N = 26;
    for (let k = 0; k < N; k++) { const a = Math.PI + Math.PI * k / (N - 1), c = k < N * .45 ? '#22c55e' : k < N * .7 ? '#facc15' : k < N * .85 ? '#fb923c' : RED;
      t += `<line x1="${cx + Math.cos(a) * (R - 18)}" y1="${cy + Math.sin(a) * (R - 18)}" x2="${cx + Math.cos(a) * R}" y2="${cy + Math.sin(a) * R}" stroke="${c}" stroke-width="7" stroke-linecap="round" opacity="${io(f, k * .6, k * .6 + 4, 0, 1)}"/>`; }
    const target = Math.min(1, (s.value || 0) / (s.max || 10)), wob = Math.sin(f / 2) * 0.02 * io(f, 30, 40, 1, 0);
    const a = Math.PI + Math.PI * (io(f, 8, 30, 0, target, Easing.out(Easing.back(1.6))) + wob);
    return t + `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * (R - 30)}" y2="${cy + Math.sin(a) * (R - 30)}" stroke="${dark ? '#fff' : INK}" stroke-width="6" stroke-linecap="round"/>` +
      `<circle cx="${cx}" cy="${cy}" r="12" fill="${ORANGE}" stroke="${dark ? '#fff' : INK}" stroke-width="3"/>` +
      `<text x="${cx}" y="${cy + 46}" text-anchor="middle" font-family="${head}" font-size="34" fill="${dark ? '#fff' : INK}">${esc(s.text || '')}</text>` +
      `<text x="${cx}" y="${cy + 70}" text-anchor="middle" font-family="${fontFamily}" font-size="11" font-weight="800" letter-spacing="1.5" fill="${dark ? '#94a3b8' : '#64748b'}">${esc(s.label || '')}</text>`;
  },
  // Coffre qui perd des pièces, montant qui baisse
  leak: (s, f, dark) => {
    let drops = '';
    for (let k = 0; k < 5; k++) { const t = ((f + k * 9) % 36) / 36; drops += `<ellipse cx="${236 + t * 26}" cy="${420 + t * 140}" rx="10" ry="5" fill="${GOLD}" stroke="#d99a1c" opacity="${f > 6 ? 1 - t * .7 : 0}" transform="rotate(${t * 200} ${236 + t * 26} ${420 + t * 140})"/>`; }
    const v = s.from != null ? s.from - (s.from - s.to) * io(f, 8, 40, 0, 1) : null;
    return shadow(180, 560, 110, dark) + prism(180, 560, 92, 92, 170, '#2f3f63') + `<circle cx="140" cy="455" r="20" fill="#cbd5e1" stroke="#64748b" stroke-width="4"/><line x1="140" y1="440" x2="140" y2="470" stroke="#64748b" stroke-width="4" transform="rotate(${f * 4} 140 455)"/>` +
      coins(160, 360, 4, 24) + `<path d="M232 410 q14 4 20 20" stroke="${RED}" stroke-width="4" fill="none" stroke-dasharray="7 6" stroke-dashoffset="${-f}"/>` + drops +
      coins(272, 590, Math.min(5, 1 + Math.floor(f / 10)), 22) + pill(272, 250, s.pill, RED, '#fff', io(f, 4, 10, 0, 1), 15) +
      (v != null ? `<text x="180" y="300" text-anchor="middle" font-family="${head}" font-size="44" fill="${dark ? '#fff' : INK}">${eur(v)}</text>` : '');
  },
  // Bloc rouge (crédit) qui tombe à côté du personnage et se fissure
  block: (s, f, dark) => {
    const y = io(f, 4, 16, -170, 0, Easing.in(Easing.quad)), hit = f >= 16, sq = hit ? io(f, 16, 22, 0.85, 1, Easing.out(Easing.back(3))) : 1;
    let dust = ''; if (hit) for (let k = 0; k < 8; k++) { const t = f - 16, dx = (k - 3.5) * 9 * (1 + t / 8); dust += `<circle cx="${210 + dx}" cy="${560 - t * .6}" r="${4 + t * .3}" fill="${dark ? '#64748b' : '#cbd5e1'}" opacity="${io(t, 0, 18, .8, 0)}"/>`; }
    const crack = hit ? `<path d="M200 470 l12 22 l-8 14 l14 18 M228 456 l-6 18 l10 12" stroke="#7f1d1d" stroke-width="3" fill="none" opacity="${io(f, 17, 20, 0, 1)}"/>` : '';
    return shadow(210, 568, 80, dark) + `<g opacity="${io(f, 4, 8, 0, 1)}" transform="translate(0 ${y}) translate(210 560) scale(1 ${sq}) translate(-210 -560)">${prism(210, 568, 70, 70, 70, RED)}${crack}</g>` + dust +
      pill(210, 400 + y, s.pill, RED, '#fff', io(f, 14, 18, 0, 1), 16) +
      person(80, 590, { ...DUO.B, top: s.top || BLUE, mood: hit ? 'sad' : 'wow' }, 1.8, { shake: hit && f < 50, drop: hit }, f);
  },
  // Sablier qui se retourne et s'écoule (le temps)
  hourglass: (s, f, dark) => {
    const r = io(f, 0, 12, 180, 0, Easing.out(Easing.back(1.4))), p = io(f, 10, Math.max(40, s.len || 60), 0, 1), col = dark ? '#e2e8f0' : INK;
    const top = 1 - p, sand = GOLD;
    return `<g transform="rotate(${r} 180 430)">` +
      `<rect x="100" y="282" width="160" height="16" rx="8" fill="${col}"/><rect x="100" y="562" width="160" height="16" rx="8" fill="${col}"/>` +
      `<path d="M118 298 L242 298 L188 430 L242 562 L118 562 L172 430 Z" fill="${dark ? 'rgba(255,255,255,.08)' : 'rgba(15,30,60,.06)'}" stroke="${col}" stroke-width="5"/>` +
      `<path d="M${180 - 54 * top} ${430 - 120 * top} L${180 + 54 * top} ${430 - 120 * top} L180 430 Z" fill="${sand}"/>` +
      // Sable du bas : rempli depuis le fond, découpé à la forme du verre pour ne pas déborder
      `<clipPath id="hg-glass"><path d="M118 298 L242 298 L188 430 L242 562 L118 562 L172 430 Z"/></clipPath>` +
      `<g clip-path="url(#hg-glass)"><path d="M100 562 L260 562 L260 ${562 - 80 * p} Q180 ${562 - 104 * p} 100 ${562 - 80 * p} Z" fill="${sand}" opacity="${p > 0.02 ? 1 : 0}"/></g>` +
      (p > 0 && p < 1 ? `<line x1="180" y1="430" x2="180" y2="${562 - 96 * p}" stroke="${sand}" stroke-width="4" stroke-dasharray="6 4" stroke-dashoffset="${-f * 2}"/>` : '') + `</g>` +
      (s.text ? `<text x="180" y="625" text-anchor="middle" font-family="${head}" font-size="30" fill="${col}">${esc(s.text)}</text>` : '');
  },
  // Voiture en panne : fumée, triangle, petites secousses
  car: (s, f, dark) => {
    const jx = Math.sin(f / 1.5) * (f % 30 < 10 ? 2 : 0);
    let smoke = ''; for (let k = 0; k < 6; k++) { const t = ((f + k * 8) % 48) / 48; smoke += `<circle cx="${236 + Math.sin(t * 6 + k) * 10}" cy="${420 - t * 150}" r="${10 + t * 26}" fill="${dark ? '#94a3b8' : '#64748b'}" opacity="${(1 - t) * .55}"/>`; }
    return shadow(180, 545, 120, dark) + `<g transform="translate(${jx} 0)">` + prism(200, 540, 130, 64, 46, RED) + prism(200 + 30 * C, 494 - 30 * S, 62, 56, 34, '#fca5a5') +
      `<ellipse cx="${200 + 24 * C}" cy="${540 - 24 * S}" rx="11" ry="17" fill="#1f2937" transform="rotate(-30 ${200 + 24 * C} ${540 - 24 * S})"/><ellipse cx="${200 + 104 * C}" cy="${540 - 104 * S}" rx="11" ry="17" fill="#1f2937" transform="rotate(-30 ${200 + 104 * C} ${540 - 104 * S})"/>` +
      `<ellipse cx="${200 - 32 * C}" cy="${540 - 32 * S}" rx="10" ry="16" fill="#111827" transform="rotate(30 ${200 - 32 * C} ${540 - 32 * S})"/></g>` + smoke +
      `<g opacity="${io(f, 10, 14, 0, 1)}" transform="translate(70 380) scale(${io(f, 10, 18, .4, 1, Easing.out(Easing.back(2.5)))})"><path d="M0 -34 L32 22 L-32 22 Z" fill="${GOLD}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><text x="0" y="16" text-anchor="middle" font-family="${head}" font-size="34" fill="${INK}">!</text></g>`;
  },
  // Cases de mois qui se remplissent (épargne de précaution)
  months: (s, f, dark) => {
    let t = ''; const n = s.n || 6;
    for (let k = 0; k < n; k++) { const x = 70 + (k % 3) * 80, y = 300 + Math.floor(k / 3) * 110, at = 6 + k * 6, on = f >= at, ok = k >= (s.min || 3) - 1;
      t += `<g opacity="${io(f, at - 3, at, 0, 1)}" transform="translate(${x + 30} ${y + 40}) scale(${io(f, at - 3, at + 5, .5, 1, Easing.out(Easing.back(2.5)))}) translate(${-x - 30} ${-y - 40})">` +
        `<rect x="${x}" y="${y}" width="60" height="80" rx="12" fill="${on ? (ok ? '#22c55e' : '#86efac') : 'transparent'}" stroke="${dark ? '#334155' : '#cbd5e1'}" stroke-width="3"/>` +
        `<rect x="${x}" y="${y}" width="60" height="18" rx="6" fill="${dark ? '#334155' : INK}"/>` +
        `<text x="${x + 30}" y="${y + 60}" text-anchor="middle" font-family="${head}" font-size="28" fill="#fff">${k + 1}</text></g>`; }
    return t + `<text x="180" y="560" text-anchor="middle" font-family="${fontFamily}" font-size="13" font-weight="800" fill="${dark ? '#cbd5e1' : '#475569'}">${esc(s.label || '')}</text>`;
  },
  // Gros chiffre (HTML, voir Big) : ici seulement les pièces qui jaillissent
  big: (s, f) => burst(180, 470, f, 14) + burst(180, 470, f, 22),
};

// Gros chiffre au centre : la partie numérique défile, puis tremble légèrement
const Big = ({ s, f, fg }) => {
  const m = String(s.text || '').match(/^(.*?)(\d[\d\s  ]*)(.*)$/), n = m ? parseInt(m[2].replace(/\D/g, ''), 10) : null;
  const k = io(f, 2, 20, 0, 1, Easing.out(Easing.quad));
  const txt = m && s.count !== false ? m[1] + Math.round(n * k).toLocaleString('fr-FR').replace(/\s/g, ' ') + m[3] : s.text;
  const shake = f > 20 && f < 30 ? Math.sin(f * 2.5) * 6 : 0;
  return <div style={{ position: 'absolute', left: 0, right: 0, top: 1150, textAlign: 'center', fontFamily: head, fontSize: String(s.text).length <= 3 ? 440 : String(s.text).length > 9 ? 190 : 260, lineHeight: 1, color: s.col === 'r' ? RED : s.col === 'g' ? GREEN : fg,
    transform: `translateX(${shake}px) scale(${io(f, 0, 8, 0.4, 1, Easing.out(Easing.back(2)))})`, textShadow: '0 10px 30px rgba(0,0,0,.18)' }}>{txt}</div>;
};

// Titre : petite phrase manuscrite + gros titre condensé qui s'écrit mot à mot (*mot* = couleur d'accent)
const Title = ({ s, f, fg, acc }) => {
  const words = String(s.head || '').split(/\s+/).filter(Boolean);
  return <>
    {s.intro && <div style={{ position: 'absolute', top: 170, left: 72, right: 72, fontFamily: hand, fontSize: 64, fontWeight: 700, color: fg, opacity: io(f, 0, 5, 0, 1) * 0.9 }}>{s.intro}</div>}
    <div style={{ position: 'absolute', top: s.intro ? 245 : 200, left: 72, right: 60, fontFamily: head, fontSize: words.join(' ').length > 16 ? 112 : 136, lineHeight: 1.02, color: fg, textTransform: 'uppercase' }}>
      {words.map((w, i) => { const at = 2 + i * 3, accent = /^\*.*\*[.,!?…]*$/.test(w) || /^\*/.test(w) || /\*$/.test(w);
        return <span key={i} style={{ display: 'inline-block', marginRight: 26, color: accent ? acc : fg, opacity: io(f, at, at + 3, 0, 1), transform: `translateY(${io(f, at, at + 5, 40, 0)}px)` }}>{w.replace(/\*/g, '')}</span>; })}
    </div>
  </>;
};

const Shot = ({ s }) => {
  const f = useCurrentFrame(), [bg, fg, acc] = BG[s.bg] || BG.light, dark = s.bg && s.bg !== 'light';
  const tr = { transform: `scale(${io(f, 0, 7, 1.14, 1)})`, filter: `blur(${io(f, 0, 6, 14, 0)}px)` };
  const svg = V[s.v] ? V[s.v](s, f, dark) : '';
  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill style={tr}>
        {svg && <svg width="1080" height="1920" viewBox="0 0 360 640" style={{ position: 'absolute', inset: 0, overflow: 'visible' }} dangerouslySetInnerHTML={{ __html: svg }} />}
        {s.v === 'big' && <Big s={s} f={f} fg={fg} />}
        <Title s={s} f={f} fg={fg} acc={acc} />
        {s.note && <div style={{ position: 'absolute', left: 72, right: 72, top: 1740, fontFamily, fontSize: 26, fontWeight: 600, color: fg, opacity: 0.6 }}>{s.note}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const End = ({ b }) => {
  const f = useCurrentFrame();
  const svg = person(330, 1270, { ...DUO.A, top: GREEN, mood: 'happy' }, 5, { arm: 1, jump: true }, f) + person(750, 1270, { ...DUO.B, top: BLUE, mood: 'neutral' }, 5, {}, f);
  return (
    <AbsoluteFill style={{ background: BG.light[0], fontFamily }}>
      <div style={{ position: 'absolute', top: 200, left: 60, right: 60, textAlign: 'center', fontFamily: head, fontSize: (DUO.A.name + DUO.B.name).length > 9 ? 104 : 130, lineHeight: 1.02, color: INK, transform: `scale(${io(f, 0, 8, 0.6, 1, Easing.out(Easing.back(2)))})` }}>
        TU ES PLUTÔT<br /><span style={{ color: GREEN }}>{DUO.A.name.toUpperCase()}</span> OU <span style={{ color: BLUE }}>{DUO.B.name.toUpperCase()}</span> ?
      </div>
      <svg width="1080" height="1920" style={{ position: 'absolute', inset: 0, overflow: 'visible' }} dangerouslySetInnerHTML={{ __html: svg }} />
      <div style={{ position: 'absolute', top: 1340, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 22, background: GREEN, color: '#fff', fontSize: 50, fontWeight: 900, padding: '26px 44px', borderRadius: 28, transform: `scale(${io(f, 10, 20, 0.7, 1, Easing.out(Easing.back(2.5)))})`, boxShadow: '0 16px 40px rgba(22,163,74,.35)' }}>
          <Img src={staticFile('logo.svg')} style={{ width: 64, height: 64, borderRadius: 16 }} />{b.cta || 'Simule le tien · kapitaro.fr'}
        </div>
        <div style={{ fontSize: 27, color: '#4b5b78', margin: '44px 80px 0', lineHeight: 1.45 }}>{b.note || 'Exemple pédagogique avec un rendement hypothétique.'} Les rendements ne sont pas garantis. Investir comporte un risque de perte en capital.</div>
      </div>
    </AbsoluteFill>
  );
};

const Scene = ({ b }) => b.visual === 'end' ? <End b={b} /> :
  <>{shotTimes(b).map((x, k) => <Sequence key={k} from={x.from} durationInFrames={x.dur}><Shot s={x.s} /></Sequence>)}</>;

export const Duo = () => (
  <AbsoluteFill style={{ fontFamily, background: BG.light[0] }}>
    {beats.map(b => <Sequence key={b.i} from={b.from} durationInFrames={b.dur}><Scene b={b} /></Sequence>)}
    {(data.segments || []).map((s, k) => <Sequence key={'v' + k} from={Math.round(s.start * FPS)}><Audio src={staticFile(s.file)} /></Sequence>)}
    {data.musicFile && <Audio src={staticFile(data.musicFile)} volume={fr => interpolate(fr, [0, 15, duoFrames - 40, duoFrames], [0, 0.1, 0.1, 0], clamp)} />}
    {data.jingle && beats.length > 0 && <Sequence from={JINGLE_AT}><Audio src={staticFile('jingle.mp3')} volume={0.5} /></Sequence>}
  </AbsoluteFill>
);
