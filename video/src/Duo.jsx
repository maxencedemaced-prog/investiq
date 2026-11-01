// Style « Duo » (Reel 1080 × 1920) : fond clair, scène 3D isométrique avec deux personnages comparés ({A} fait le bon choix, {B} non).
// Accroche manuscrite + gros chiffre en haut, scène au centre, sous-titres de la voix dessous, « Tu es plutôt A ou B ? » en bas.
// Données : src/data.json (beats + minutage des mots + dossier + duo : prénoms et apparence), écrit par render-job.mjs.
// Le dessin reprend la maquette validée (pubs-images/maquette-reels-3d-duo.png) : coordonnées dans un repère 360 × 342, agrandi en SVG.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { loadFont as loadHand } from '@remotion/google-fonts/Caveat';
import data from './data.json';

const { fontFamily } = loadFont('normal', { weights: ['500', '700', '800', '900'], subsets: ['latin', 'latin-ext'] });
const { fontFamily: hand } = loadHand('normal', { weights: ['700'], subsets: ['latin', 'latin-ext'] });
const FPS = 30;
const INK = '#0f1e3c', DIM = '#4b5b78', GREEN = '#16a34a', RED = '#e5383b', BLUE = '#2563eb';
const COL = { g: GREEN, r: RED, b: BLUE, dim: '#94a3b8', w: INK };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const ease = Easing.out(Easing.cubic);
const io = (f, a, b, x, y, e = ease) => interpolate(f, [a, b], [x, y], { ...clamp, easing: e });
const D = data.dossier || {};
const DUO = data.duo || { A: { name: 'Léa', long: true, hair: '#6b3f22' }, B: { name: 'Tom', hair: '#2b2b2b', skin: '#e0ac86' } };

// Même minutage que Dossier.jsx
const beats = (data.beats || []).map((b, i, all) => {
  const from = Math.round(b.start * FPS), last = i === all.length - 1;
  const to = last ? Math.round((b.end + (data.jingle ? 3 : 1.6)) * FPS) : Math.round(b.end * FPS);
  return { ...b, i, from, dur: Math.max(12, to - from) };
});
export const duoFrames = beats.length ? beats[beats.length - 1].from + beats[beats.length - 1].dur : 60;
const JINGLE_AT = beats.length ? Math.round(beats[beats.length - 1].end * FPS) - 4 : 0;
const eur = n => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' €';

// ── Dessin isométrique (chaînes SVG, comme la maquette) ──
const C = Math.cos(Math.PI / 6), S = Math.sin(Math.PI / 6);
const sh = (hex, k) => { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = n >> 8 & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k))); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); };
const P = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
function prism(x, y, a, b, h, col) {
  if (h <= 0.5) return '';
  const F = [x, y], R = [x + a * C, y - a * S], L = [x - b * C, y - b * S], B = [x + a * C - b * C, y - a * S - b * S], up = p => [p[0], p[1] - h];
  return `<polygon points="${P([F, L, up(L), up(F)])}" fill="${col}"/><polygon points="${P([F, R, up(R), up(F)])}" fill="${sh(col, .78)}"/><polygon points="${P([up(F), up(R), up(B), up(L)])}" fill="${sh(col, 1.25)}"/>`;
}
function coins(x, y, n, r) { let s = ''; for (let i = 0; i < n; i++) { const yy = y - i * 7; s += `<rect x="${x - r}" y="${yy - 4}" width="${2 * r}" height="7" fill="#d99a1c"/><ellipse cx="${x}" cy="${yy + 3}" rx="${r}" ry="${r * .45}" fill="#c4860f"/><ellipse cx="${x}" cy="${yy - 4}" rx="${r}" ry="${r * .45}" fill="#f6c443" stroke="#d99a1c"/>`; } return s; }
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const pill = (x, y, t, bg = INK, fg = '#fff', o = 1, extra = '') => { const w = String(t).length * 7.2 + 18; return `<g opacity="${o}"><rect x="${x - w / 2}" y="${y - 12}" width="${w}" height="24" rx="12" fill="${bg}"${extra}/><text x="${x}" y="${y + 4.5}" text-anchor="middle" font-family="${fontFamily}" font-weight="800" font-size="12" fill="${fg}">${esc(t)}</text></g>`; };
const slab = () => prism(180, 330, 150, 150, 16, '#1f2b46');
function person(x, y, o, pop = 1, bob = 0) {
  const skin = o.skin || '#f1c7a1', hair = o.hair || '#3b2a20', top = o.top || GREEN;
  const yy = y - bob;
  const mouth = o.mood === 'sad' ? `<path d="M${x - 5} ${yy - 74} q5 -4 10 0" stroke="#5b3b2a" stroke-width="2" fill="none"/>`
    : o.mood === 'neutral' ? `<path d="M${x - 4} ${yy - 75} h8" stroke="#5b3b2a" stroke-width="2"/>`
    : `<path d="M${x - 5} ${yy - 76} q5 5 10 0" stroke="#5b3b2a" stroke-width="2" fill="none"/>`;
  const hairBack = o.long ? `<path d="M${x - 15} ${yy - 86} q-2 22 4 30 h22 q6 -8 4 -30 z" fill="${hair}"/>` : '';
  const label = o.tag ? o.name + ' · ' + o.tag : o.name;
  return `<g transform="translate(${x} ${y}) scale(${pop}) translate(${-x} ${-y})">` +
    `<ellipse cx="${x}" cy="${y + 2}" rx="16" ry="5" fill="rgba(15,30,60,.18)"/>` +
    `<rect x="${x - 9}" y="${yy - 28}" width="7" height="28" rx="3" fill="#334155"/><rect x="${x + 2}" y="${yy - 28}" width="7" height="28" rx="3" fill="#334155"/>` +
    hairBack + `<rect x="${x - 14}" y="${yy - 58}" width="28" height="32" rx="10" fill="${top}"/>` +
    `<circle cx="${x}" cy="${yy - 80}" r="14" fill="${skin}"/>` +
    `<path d="M${x - 14} ${yy - 82} q2 -16 14 -16 q12 0 14 16 q-6 -6 -14 -6 q-8 0 -14 6 z" fill="${hair}"/>` +
    `<circle cx="${x - 5}" cy="${yy - 81}" r="1.8" fill="#1f2937"/><circle cx="${x + 5}" cy="${yy - 81}" r="1.8" fill="#1f2937"/>` + mouth +
    `</g>` + pill(x, y + 20, label, '#ffffff', INK, Math.min(1, pop), ' stroke="#cbd5e1"');
}
const AX = 92, AY = 300, BX = 262, BY = 284;

// ── Scènes : b.scene = intro | columns | safes | reserve (personnages sur la dalle) ; rule et end à part ──
function sceneSvg(b, f, f0) {
  const p = io(f, 4, Math.max(10, b.dur * 0.6), 0, 1), first = b.i === 0;
  const enter = first ? io(f, 0, 14, 0, 1, Easing.out(Easing.back(1.4))) : 1;
  const popA = first ? io(f, 6, 18, 0, 1, Easing.out(Easing.back(1.8))) : 1, popB = first ? io(f, 12, 24, 0, 1, Easing.out(Easing.back(1.8))) : 1;
  const bobA = Math.max(0, Math.sin(f0 / 7)) * 1.6, bobB = Math.max(0, Math.sin(f0 / 7 + 2)) * 1.6;
  const colB = COL[b.colorB] || BLUE;
  let props = '';
  if (b.scene === 'columns') {
    const a = b.leftValue || 1, c = b.rightValue || 1, max = Math.max(a, c), hA = 150 * a / max * p, hB = 150 * c / max * p;
    props = prism(150, 262, 46, 46, hA, '#22c55e') + prism(232, 228, 46, 46, hB, colB === RED ? '#ef4444' : '#3b82f6') +
      pill(130, 262 - hA - 30, '≈ ' + eur(a * p), GREEN, '#fff', io(f, 4, 10, 0, 1)) + pill(250, 228 - hB - 26, '≈ ' + eur(c * p), colB, '#fff', io(f, 4, 10, 0, 1));
  } else if (b.scene === 'safes') {
    const nA = 3 + Math.round(p * 2), nB = b.leak ? Math.max(1, 4 - Math.floor(f / 20)) : 4;
    props = prism(140, 262, 50, 50, 96, '#2f3f63') + prism(236, 232, 50, 50, 96, '#2f3f63') + coins(140, 150, nA, 13) + coins(236, 120, nB, 12);
    if (b.leak) {
      props += `<path d="M255 168 q14 30 14 70" fill="none" stroke="${RED}" stroke-width="3" stroke-dasharray="6 5" stroke-dashoffset="${-f}"/>` + coins(268, 262, Math.min(4, 1 + Math.floor(f / 20)), 12);
      for (let k = 0; k < 3; k++) { const t = ((f + k * 13) % 40) / 40; props += `<ellipse cx="${258 + t * 10}" cy="${172 + t * 80}" rx="6" ry="3" fill="#f6c443" stroke="#d99a1c" opacity="${1 - t}"/>`; }
    }
    props += pill(140, 112, b.pillA || '', GREEN, '#fff', b.pillA ? io(f, 2, 8, 0, 1) : 0) + pill(236, 82, b.pillB || '', RED, '#fff', b.pillB ? io(f, 6, 12, 0, 1) : 0);
  } else if (b.scene === 'reserve') {
    const n = b.stage ? 10 : Math.round(io(f, 4, 30, 0, 10)), drop = b.stage ? io(f, 4, 16, -120, 0, Easing.out(Easing.bounce)) : -400;
    props = coins(140, 262, n, 22) + (drop > -300 ? `<g transform="translate(0 ${drop})">${prism(236, 232, 44, 44, 14, RED)}</g>` : '') +
      pill(118, 172, b.pillA || '', GREEN, '#fff', b.pillA ? io(f, 8, 14, 0, 1) : 0) + pill(232, 128, b.pillB || '', RED, '#fff', b.pillB ? io(f, 12, 18, 0, 1) : 0);
  } else {
    // intro : une petite pile identique devant chacun, et une étiquette au-dessus de la tête
    props = coins(140, 262, Math.round(io(f, 10, 30, 0, 4)), 14) + coins(220, 250, Math.round(io(f, 14, 34, 0, 4)), 14) +
      pill(AX, AY - 118, b.pillA || '', GREEN, '#fff', b.pillA ? io(f, 16, 22, 0, 1) : 0) + pill(BX, BY - 118, b.pillB || '', colB, '#fff', b.pillB ? io(f, 20, 26, 0, 1) : 0);
  }
  const A = { ...DUO.A, top: GREEN, tag: DUO.tagA, mood: b.moodA || 'happy' }, B = { ...DUO.B, top: colB, tag: DUO.tagB, mood: b.moodB || 'neutral' };
  return `<g transform="translate(0 ${(1 - enter) * 60}) " opacity="${Math.min(1, enter * 1.5)}"><g transform="translate(-40,-70) scale(1.22)">` +
    slab() + props + person(AX, AY, A, popA, bobA) + person(BX, BY, B, popB, bobB) + '</g></g>';
}

const Rule = ({ b }) => {
  const f = useCurrentFrame(), d = b.dur, rows = b.rows || [];
  let k = 0; const n = rows.reduce((s, r) => s + r.length, 0);
  const part = (t, at, col, size) => <span key={at} style={{ display: 'inline-block', margin: '0 16px', opacity: io(f, at, at + 8, 0, 1), transform: `translateY(${io(f, at, at + 10, 40, 0)}px)`, color: col, fontSize: size }}>{t}</span>;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', fontFamily, fontWeight: 900, lineHeight: 1.1, letterSpacing: -2 }}>
      {rows.map((r, ri) => <div key={ri} style={{ marginTop: ri ? 24 : 0 }}>{r.map(([t, c, s]) => part(t, d * (0.06 + 0.5 * (k++ / Math.max(1, n - 1))), COL[c] || INK, s || 150))}</div>)}
      {b.caption && <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 0, color: DIM, marginTop: 40, padding: '0 90px', opacity: io(f, d * 0.6, d * 0.7, 0, 1) }}>{b.caption}</div>}
    </div>
  );
};

const End = ({ b }) => {
  const f = useCurrentFrame(), o = io(f, 0, 12, 0, 1);
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: 560, textAlign: 'center', opacity: o, fontFamily }}>
      <div style={{ fontFamily: hand, fontSize: 96, fontWeight: 700, color: INK, lineHeight: 1.05 }}>Tu es plutôt<br /><span style={{ color: GREEN }}>{DUO.A.name}</span> ou <span style={{ color: BLUE }}>{DUO.B.name}</span> ?</div>
      <Img src={staticFile('logo.svg')} style={{ width: 150, height: 150, borderRadius: 36, marginTop: 60, boxShadow: '0 20px 50px rgba(15,30,60,.25)' }} />
      <div style={{ fontSize: 64, fontWeight: 900, color: INK, marginTop: 24 }}>Kapitaro</div>
      <div style={{ display: 'inline-block', marginTop: 40, background: GREEN, color: '#fff', fontSize: 46, fontWeight: 900, padding: '26px 46px', borderRadius: 26, transform: `scale(${io(f, 8, 18, 0.85, 1, Easing.out(Easing.back(2)))})`, boxShadow: '0 16px 40px rgba(22,163,74,.35)' }}>{b.cta || 'Simule le tien · kapitaro.fr'}</div>
      <div style={{ fontSize: 28, color: DIM, marginTop: 44, lineHeight: 1.45 }}>{b.note || 'Exemple pédagogique avec un rendement hypothétique.'}<br />Les rendements ne sont pas garantis. Investir comporte un risque de perte en capital.</div>
    </div>
  );
};

// ── Texte du haut (accroche manuscrite, gros chiffre, phrase) ──
const Head = ({ b }) => {
  const f = useCurrentFrame(), t = (a) => ({ opacity: io(f, a, a + 8, 0, 1), transform: `translateY(${io(f, a, a + 10, 24, 0)}px)` });
  const big = String(b.big || '');
  return <>
    {b.kick && <div style={{ position: 'absolute', top: 200, left: 50, right: 50, textAlign: 'center', fontFamily: hand, fontSize: 80, fontWeight: 700, color: INK, lineHeight: 1.05, ...t(0) }}>{b.kick}</div>}
    {big && <div style={{ position: 'absolute', top: 390, left: 0, right: 0, textAlign: 'center', fontFamily, fontWeight: 900, fontSize: big.length > 9 ? 130 : 170, letterSpacing: -5, lineHeight: 1, color: COL[b.bigColor] || GREEN, ...t(6) }}>{big}</div>}
    {b.sub && <div style={{ position: 'absolute', top: 575, left: 60, right: 60, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 48, color: INK, lineHeight: 1.2, ...t(10) }}>{b.sub}</div>}
  </>;
};

// ── Sous-titres de la voix : morceaux de 5 mots, le mot dit en vert ──
const Subs = ({ b }) => {
  const f = useCurrentFrame(), t = f / FPS, words = (b.words || []).filter(w => w.w);
  if (!words.length) return null;
  const chunks = []; for (let i = 0; i < words.length; i += 5) chunks.push(words.slice(i, i + 5));
  let chunk = chunks[0]; for (const ch of chunks) if (ch[0].t <= t + 0.05) chunk = ch;
  return (
    <div style={{ position: 'absolute', left: 80, right: 80, top: b.visual === 'end' ? 1560 : 1470, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 46, lineHeight: 1.3 }}>
      {chunk.map((w, i) => <span key={i} style={{ color: w.t <= t + 0.02 ? (w.t + (w.d || 0.3) >= t ? GREEN : INK) : 'rgba(15,30,60,.3)' }}>{w.w} </span>)}
    </div>
  );
};

const Scene = ({ b }) => {
  const f = useCurrentFrame(), last = b.i === beats.length - 1;
  const o = Math.min(b.i === 0 ? 1 : io(f, 0, 6, 0, 1), last ? 1 : io(f, b.dur - 5, b.dur, 1, 0, Easing.in(Easing.cubic)));
  const iso = b.visual !== 'end' && b.scene !== 'rule';
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {b.visual !== 'end' && <Head b={b} />}
      {iso && <svg width="936" height="889" viewBox="0 0 360 342" style={{ position: 'absolute', left: 72, top: 600, overflow: 'visible' }} dangerouslySetInnerHTML={{ __html: sceneSvg(b, f, b.from + f) }} />}
      {b.scene === 'rule' && <Rule b={b} />}
      {b.visual === 'end' && <End b={b} />}
      <Subs b={b} />
    </AbsoluteFill>
  );
};

export const Duo = () => {
  const f = useCurrentFrame(), lastFrom = beats.length ? beats[beats.length - 1].from : 1e9;
  return (
    <AbsoluteFill style={{ fontFamily, background: 'linear-gradient(180deg,#f4f7fc,#e2eaf6)' }}>
      <div style={{ position: 'absolute', top: 120, left: 60, fontSize: 30, fontWeight: 800, letterSpacing: 4, color: DIM }}><span style={{ color: GREEN }}>●</span> DÉCODÉ · {D.num || ''}</div>
      {beats.map(b => <Sequence key={b.i} from={b.from} durationInFrames={b.dur}><Scene b={b} /></Sequence>)}
      {f < lastFrom && <div style={{ position: 'absolute', top: 1640, left: 0, right: 0, textAlign: 'center', fontSize: 44, fontWeight: 900, color: INK }}>Tu es plutôt {DUO.A.name} ou {DUO.B.name} ? · <span style={{ color: GREEN }}>kapitaro</span>.fr</div>}
      {(data.segments || []).map((s, k) => <Sequence key={'v' + k} from={Math.round(s.start * FPS)}><Audio src={staticFile(s.file)} /></Sequence>)}
      {data.musicFile && <Audio src={staticFile(data.musicFile)} volume={fr => interpolate(fr, [0, 15, duoFrames - 40, duoFrames], [0, 0.08, 0.08, 0], clamp)} />}
      {data.jingle && beats.length > 0 && <Sequence from={JINGLE_AT}><Audio src={staticFile('jingle.mp3')} volume={0.5} /></Sequence>}
    </AbsoluteFill>
  );
};
