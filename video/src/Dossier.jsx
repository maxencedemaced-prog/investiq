// Style « Dossier décodé » (Reel 1080 × 1920) : interface d'enquête façon fiche technique, sol en grille 3D,
// objet central animé en vert, chapitres en haut, mots-clés en très gros au rythme de la voix.
// Données : src/data.json (beats + minutage des mots + dossier : numéro, titre, chapitres), écrit par render-job.mjs.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import data from './data.json';

const { fontFamily } = loadFont('normal', { weights: ['500', '700', '800', '900'], subsets: ['latin', 'latin-ext'] });
const { fontFamily: mono } = loadMono('normal', { weights: ['500', '700'], subsets: ['latin', 'latin-ext'] });
const FPS = 30;
const G = '#22e08a', G2 = '#4ade80', RED = '#ff5a5f', INK = '#04080d', DIM = 'rgba(226,232,240,.55)';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const ease = Easing.out(Easing.cubic);
const io = (f, a, b, x, y, e = ease) => interpolate(f, [a, b], [x, y], { ...clamp, easing: e });
const D = data.dossier || {};
const CHAPTERS = D.chapters || ['LE PIÈGE', 'LE MÉCANISME', 'LA RÈGLE'];

// Même minutage que Reel.jsx
const beats = (data.beats || []).map((b, i, all) => {
  const from = Math.round(b.start * FPS), last = i === all.length - 1;
  const to = last ? Math.round((b.end + (data.jingle ? 3 : 1.6)) * FPS) : Math.round(b.end * FPS);
  return { ...b, i, from, dur: Math.max(12, to - from) };
});
export const dossierFrames = beats.length ? beats[beats.length - 1].from + beats[beats.length - 1].dur : 60;
const beatAt = f => Math.max(0, beats.findIndex(b => f >= b.from && f < b.from + b.dur));
const JINGLE_AT = beats.length ? Math.round(beats[beats.length - 1].end * FPS) - 4 : 0;
const eur = n => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' €';

// ── Décor : noir, halo vert, sol en grille qui avance vers la caméra ──
const Floor = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: -400, right: -400, top: 300, height: 1300, background: 'radial-gradient(ellipse at 50% 45%, rgba(34,224,138,.22), transparent 60%)' }} />
      <div style={{ position: 'absolute', left: '-60%', right: '-60%', bottom: -260, height: 1100, transform: 'perspective(900px) rotateX(70deg)', transformOrigin: 'bottom',
        backgroundImage: 'linear-gradient(rgba(74,222,128,.28) 2px, transparent 2px), linear-gradient(90deg, rgba(74,222,128,.28) 2px, transparent 2px)',
        backgroundSize: '120px 120px', backgroundPosition: `0 ${(f * 2.2) % 120}px`,
        maskImage: 'linear-gradient(to top, black 15%, transparent 90%)', WebkitMaskImage: 'linear-gradient(to top, black 15%, transparent 90%)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.75) 100%)' }} />
    </AbsoluteFill>
  );
};

// ── Interface : dossier, compteur, chapitres ──
const Hud = () => {
  const f = useCurrentFrame(), b = beats[beatAt(f)] || {};
  const ch = Math.min(CHAPTERS.length - 1, b.chapter || 0);
  const blink = Math.floor(f / 15) % 2 === 0;
  return (
    <div style={{ position: 'absolute', top: 110, left: 70, right: 70, fontFamily: mono, color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 26, letterSpacing: 3, color: DIM }}><span style={{ color: G, opacity: blink ? 1 : 0.3 }}>●</span> DOSSIER {D.num || '001'}</div>
          <div style={{ fontFamily, fontSize: 46, fontWeight: 900, letterSpacing: 1, marginTop: 10, color: '#fff' }}>{D.title || ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 60, fontWeight: 700, color: b.hudColor === 'green' ? G : RED, lineHeight: 1 }}>{b.hud || ''}</div>
          <div style={{ fontSize: 22, letterSpacing: 2, color: DIM, marginTop: 10 }}>{b.hudLabel || ''}</div>
        </div>
      </div>
      <div style={{ marginTop: 26, borderTop: '2px solid rgba(255,255,255,.14)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 22, letterSpacing: 2 }}>
        <div style={{ display: 'flex', gap: 30 }}>
          {CHAPTERS.map((c, k) => <span key={k} style={{ color: k === ch ? '#fff' : 'rgba(226,232,240,.3)', fontWeight: k === ch ? 700 : 500 }}>{String(k + 1).padStart(2, '0')} {c}</span>)}
        </div>
        <span style={{ color: G, fontStyle: 'italic' }}>SYSTÈME DÉCODÉ</span>
      </div>
    </div>
  );
};

// ── Mots-clés : groupes de 1 à 2 mots, très gros, au moment où ils sont dits ──
const Keywords = ({ b }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const words = (b.words || []).filter(w => w.w);
  if (!words.length || b.visual === 'end') return null;
  const groups = []; let cur = null;
  for (const w of words) {
    const txt = w.w.replace(/[«»"]/g, '');
    if (!cur || cur.n >= 2 || (cur.text + ' ' + txt).length > 14) { cur = { text: txt, t: w.t, n: 1 }; groups.push(cur); }
    else { cur.text += ' ' + txt; cur.n++; }
  }
  let g = null; for (const x of groups) if (x.t <= t + 0.05) g = x;
  if (!g) return null;
  const age = (t - g.t) * FPS, s = io(age, 0, 6, 0.86, 1), o = io(age, 0, 4, 0, 1);
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: 1290, textAlign: 'center', fontFamily, fontWeight: 900, fontSize: 104, letterSpacing: 1, color: '#fff', textTransform: 'uppercase', lineHeight: 1,
      transform: `scale(${s})`, opacity: o, textShadow: '0 6px 30px rgba(0,0,0,.8), 0 0 40px rgba(34,224,138,.25)' }}>{g.text}</div>
  );
};

// ── Pièce de monnaie « 3D » (ellipses empilées) ──
const Coin = ({ x, y, w = 150, glow = 1 }) => (
  <div style={{ position: 'absolute', left: x - w / 2, top: y, width: w, height: w * 0.34 }}>
    <div style={{ position: 'absolute', left: 0, top: w * 0.07, width: w, height: w * 0.3, borderRadius: '50%', background: 'linear-gradient(180deg,#0d3b26,#062016)' }} />
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: w * 0.3, borderRadius: '50%', background: 'radial-gradient(ellipse at 40% 35%, #b9ffd9, #22e08a 45%, #0f7a4b 100%)', boxShadow: `0 0 ${30 * glow}px rgba(34,224,138,.55)`, border: '2px solid rgba(255,255,255,.25)' }} />
  </div>
);
const Stack = ({ x, base, n, w }) => <>{Array.from({ length: n }).map((_, k) => <Coin key={k} x={x} y={base - k * w * 0.13} w={w} glow={k === n - 1 ? 1.4 : 0.6} />)}</>;

const Label = ({ x, y, top, sub, color = '#fff', align = 'center', size = 40 }) => (
  <div style={{ position: 'absolute', left: x - 240, width: 480, top: y, textAlign: align, fontFamily: mono }}>
    <div style={{ fontSize: size, fontWeight: 700, color }}>{top}</div>
    {sub && <div style={{ fontSize: 22, letterSpacing: 2, color: DIM, marginTop: 6 }}>{sub}</div>}
  </div>
);

// ── Visuels par scène ──
const Title = ({ b }) => {
  const f = useCurrentFrame(), r = f * 1.2;
  return <>
    <div style={{ position: 'absolute', left: 540 - 230, top: 560, width: 460, height: 460, borderRadius: '50%', border: '3px solid rgba(34,224,138,.5)', transform: `rotate(${r}deg)`, boxShadow: '0 0 80px rgba(34,224,138,.25) inset' }} />
    <div style={{ position: 'absolute', left: 540 - 170, top: 620, width: 340, height: 340, borderRadius: '50%', border: '2px dashed rgba(74,222,128,.45)', transform: `rotate(${-r * 1.6}deg)` }} />
    <Stack x={540} base={830} n={Math.min(7, 1 + Math.floor(f / 6))} w={190} />
  </>;
};
const Compare = ({ b }) => {
  const f = useCurrentFrame(), p = io(f, 6, b.dur - 10, 0, 1);
  return <>
    <Stack x={330} base={1040} n={1 + Math.round(p * 9)} w={160} />
    <Stack x={750} base={1040} n={1 + Math.round(p * 6)} w={160} />
    <Label x={330} y={1110} top={b.left || 'LÉA'} sub={b.leftSub || 'DÈS 25 ANS'} />
    <Label x={750} y={1110} top={b.right || 'TOM'} sub={b.rightSub || 'DÈS 35 ANS'} />
  </>;
};
const Snowball = ({ b }) => {
  const f = useCurrentFrame(), p = io(f, 0, b.dur, 0, 1, Easing.in(Easing.quad)), size = 120 + p * 330, rot = f * 6;
  return <>
    {Array.from({ length: 6 }).map((_, k) => <div key={k} style={{ position: 'absolute', left: 140 + k * 70 * (0.5 + p), top: 1010 - k * 2, width: 26, height: 10, borderRadius: 6, background: 'rgba(74,222,128,.25)' }} />)}
    <div style={{ position: 'absolute', left: 540 - size / 2 + p * 60, top: 1050 - size, width: size, height: size, borderRadius: '50%', transform: `rotate(${rot}deg)`,
      background: 'radial-gradient(circle at 35% 30%, #d9ffe9, #22e08a 40%, #0a5c37 85%)', boxShadow: '0 0 90px rgba(34,224,138,.45)' }}>
      <div style={{ position: 'absolute', inset: '18%', borderRadius: '50%', border: '4px dashed rgba(4,8,13,.35)' }} />
    </div>
    <Label x={540} y={1100} top={'+ ' + Math.round(p * 100) + ' %'} sub="LES GAINS RAPPORTENT DES GAINS" color={G} size={52} />
  </>;
};
const Curve = ({ b }) => {
  const f = useCurrentFrame(), p = io(f, 4, b.dur - 6, 0, 1, Easing.inOut(Easing.cubic));
  const W = 860, H = 520, pts = [], lin = [];
  for (let k = 0; k <= 60; k++) { const x = k / 60; pts.push([x * W, H - (Math.pow(1.07, x * 40) - 1) / (Math.pow(1.07, 40) - 1) * H]); lin.push([x * W, H - x * H * 0.19]); }
  const d = a => a.map((q, k) => (k ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
  const len = 1400;
  return (
    <svg width={W + 40} height={H + 80} style={{ position: 'absolute', left: 110, top: 560, overflow: 'visible' }}>
      <path d={d(lin)} fill="none" stroke="rgba(226,232,240,.45)" strokeWidth="5" strokeDasharray="14 12" style={{ strokeDashoffset: 0, opacity: io(f, 0, 10, 0, 1) }} />
      <path d={d(pts)} fill="none" stroke={G} strokeWidth="10" strokeLinecap="round" style={{ strokeDasharray: len, strokeDashoffset: len * (1 - p), filter: 'drop-shadow(0 0 18px rgba(34,224,138,.7))' }} />
      <text x={W - 10} y={H - H * 0.19 + 50} fill="rgba(226,232,240,.6)" fontFamily={mono} fontSize="26" textAnchor="end">CE QUE TU VERSES</text>
      <text x={W - 10} y={30} fill={G} fontFamily={mono} fontSize="28" fontWeight="700" textAnchor="end" opacity={io(f, b.dur * 0.6, b.dur * 0.8, 0, 1)}>CE QUE ÇA DEVIENT</text>
    </svg>
  );
};
const Result = ({ b }) => {
  const f = useCurrentFrame(), p = io(f, 4, b.dur * 0.7, 0, 1);
  const a = b.leftValue || 262000, c = b.rightValue || 122000, max = Math.max(a, c), H = 520;
  const bar = (x, v, col, name, sub) => <>
    <div style={{ position: 'absolute', left: x - 110, top: 1050 - H * (v / max) * p, width: 220, height: H * (v / max) * p, borderRadius: '18px 18px 0 0', background: `linear-gradient(180deg, ${col}, rgba(4,8,13,.2))`, boxShadow: `0 0 50px ${col}55` }} />
    <Label x={x} y={1050 - H * (v / max) * p - 80} top={eur(v * p)} color={col} size={44} />
    <Label x={x} y={1080} top={name} sub={sub} />
  </>;
  return <>{bar(330, a, G, b.left || 'LÉA', b.leftSub || '48 000 € VERSÉS')}{bar(750, c, '#94a3b8', b.right || 'TOM', b.rightSub || '36 000 € VERSÉS')}</>;
};
const Rule = ({ b }) => {
  const f = useCurrentFrame();
  const part = (txt, at, col = '#fff', size = 170) => <span style={{ display: 'inline-block', margin: '0 18px', opacity: io(f, at, at + 8, 0, 1), transform: `translateY(${io(f, at, at + 10, 40, 0)}px)`, color: col, fontSize: size }}>{txt}</span>;
  const d = b.dur;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontFamily: mono, fontWeight: 700, lineHeight: 1.1 }}>
      <div>{part('72', d * 0.1, G)}{part('÷', d * 0.3, DIM, 120)}{part(b.rate || '6 %', d * 0.45)}</div>
      <div style={{ marginTop: 30 }}>{part('=', d * 0.6, DIM, 120)}{part(b.years || '12 ANS', d * 0.7, G, 150)}</div>
      <div style={{ fontSize: 30, letterSpacing: 3, color: DIM, marginTop: 40, opacity: io(f, d * 0.75, d * 0.85, 0, 1) }}>POUR DOUBLER TON CAPITAL (ESTIMATION)</div>
    </div>
  );
};
const End = ({ b }) => {
  const f = useCurrentFrame(), o = io(f, 0, 12, 0, 1);
  return (
    <div style={{ position: 'absolute', left: 80, right: 80, top: 560, textAlign: 'center', opacity: o, fontFamily }}>
      <Img src={staticFile('logo.svg')} style={{ width: 170, height: 170, borderRadius: 40, boxShadow: '0 0 0 3px rgba(34,224,138,.5), 0 0 90px rgba(34,224,138,.45)' }} />
      <div style={{ fontSize: 76, fontWeight: 900, color: '#fff', marginTop: 40 }}>Kapitaro</div>
      <div style={{ fontFamily: mono, fontSize: 28, letterSpacing: 4, color: G, marginTop: 14 }}>DOSSIER {D.num || ''} · DÉCODÉ</div>
      <div style={{ display: 'inline-block', marginTop: 60, background: G, color: '#03140b', fontSize: 46, fontWeight: 900, padding: '26px 46px', borderRadius: 26, boxShadow: '0 16px 50px rgba(34,224,138,.4)' }}>Calcule le tien · kapitaro.fr</div>
      <div style={{ fontSize: 26, color: DIM, marginTop: 50, lineHeight: 1.45 }}>Exemple pédagogique avec un rendement hypothétique.<br />Les rendements ne sont pas garantis. Investir comporte un risque de perte en capital.</div>
    </div>
  );
};
const VISUALS = { title: Title, compare: Compare, snowball: Snowball, curve: Curve, result: Result, rule: Rule, end: End };

const Scene = ({ b }) => {
  const f = useCurrentFrame(), last = b.i === beats.length - 1;
  const o = Math.min(b.i === 0 ? 1 : io(f, 0, 7, 0, 1), last ? 1 : io(f, b.dur - 6, b.dur, 1, 0, Easing.in(Easing.cubic)));
  const V = VISUALS[b.visual] || Title;
  return <AbsoluteFill style={{ opacity: o }}><V b={b} /><Keywords b={b} /></AbsoluteFill>;
};

export const Dossier = () => (
  <AbsoluteFill style={{ fontFamily, background: INK }}>
    <Floor />
    {beats.map(b => <Sequence key={b.i} from={b.from} durationInFrames={b.dur}><Scene b={b} /></Sequence>)}
    <Hud />
    {(data.segments || []).map((s, k) => <Sequence key={'v' + k} from={Math.round(s.start * FPS)}><Audio src={staticFile(s.file)} /></Sequence>)}
    {data.musicFile && <Audio src={staticFile(data.musicFile)} volume={fr => interpolate(fr, [0, 15, dossierFrames - 40, dossierFrames], [0, 0.08, 0.08, 0], clamp)} />}
    {data.jingle && beats.length > 0 && <Sequence from={JINGLE_AT}><Audio src={staticFile('jingle.mp3')} volume={0.5} /></Sequence>}
  </AbsoluteFill>
);
