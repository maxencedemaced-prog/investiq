// Pub « scènes réelles » (Reel 1080 × 1920) : accroche, démonstration de l'appli, clôture, puis carte de fin.
// Les photos sont dans public/pub/ (scènes réalistes, capture de l'appli déjà incrustée dans les téléphones).
// Données : src/data.json (scenes = [{ img, kicker, title, sub, dur }], end = { tagline, cta, note }), écrit par render-job.mjs.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import data from './data.json';

const { fontFamily } = loadFont('normal', { weights: ['500', '600', '700', '800', '900'], subsets: ['latin', 'latin-ext'] });
const FPS = 30;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const ease = Easing.out(Easing.cubic);
const GREEN = '#34d399';

const scenes = (data.scenes || []).map(s => ({ ...s, frames: Math.max(30, Math.round((s.dur || 3) * FPS)) }));
let acc = 0;
scenes.forEach(s => { s.from = acc; acc += s.frames; });
const END = Math.round(((data.end || {}).dur || 3.2) * FPS);
export const pubFrames = Math.max(1, acc) + END;

// *mot* = mis en vert
const Rich = ({ text }) => String(text || '').split('*').map((p, i) => (i % 2 ? <span key={i} style={{ color: GREEN }}>{p}</span> : <React.Fragment key={i}>{p}</React.Fragment>));

const Scene = ({ s, i, last }) => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, 8], [0, 1], clamp), last ? 1 : interpolate(f, [s.frames - 6, s.frames], [1, 0], clamp));
  // Mouvement lent de caméra, sens alterné d'une scène à l'autre
  const z = interpolate(f, [0, s.frames], i % 2 ? [1.12, 1.03] : [1.03, 1.12], clamp);
  const x = interpolate(f, [0, s.frames], i % 2 ? [-14, 14] : [14, -14], clamp);
  const t = interpolate(f, [5, 20], [0, 1], { ...clamp, easing: ease });
  const top = s.pos === 'top';
  return (
    <AbsoluteFill style={{ opacity: o, background: '#060b18' }}>
      <Img src={staticFile(s.img)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z}) translateX(${x}px)` }} />
      <AbsoluteFill style={{ background: top
        ? 'linear-gradient(180deg, rgba(6,11,24,.86) 0%, rgba(6,11,24,.55) 22%, rgba(6,11,24,0) 42%, rgba(6,11,24,0) 80%, rgba(6,11,24,.6) 100%)'
        : 'linear-gradient(180deg, rgba(6,11,24,.5) 0%, rgba(6,11,24,0) 22%, rgba(6,11,24,0) 48%, rgba(6,11,24,.72) 72%, rgba(6,11,24,.92) 100%)' }} />
      <div style={{ position: 'absolute', left: 70, right: 70, ...(top ? { top: 210 } : { bottom: 330 }), opacity: t, transform: `translateY(${(1 - t) * 34}px)`, textAlign: 'center' }}>
        {s.kicker && <div style={{ color: GREEN, fontSize: 30, fontWeight: 800, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 18 }}>{s.kicker}</div>}
        <div style={{ color: '#fff', fontSize: 78, fontWeight: 900, lineHeight: 1.08, letterSpacing: -2, textShadow: '0 6px 30px rgba(0,0,0,.55)' }}><Rich text={s.title} /></div>
        {s.sub && <div style={{ color: 'rgba(255,255,255,.86)', fontSize: 38, fontWeight: 600, lineHeight: 1.3, marginTop: 20, textShadow: '0 4px 20px rgba(0,0,0,.6)' }}>{s.sub}</div>}
      </div>
    </AbsoluteFill>
  );
};

const EndCard = () => {
  const f = useCurrentFrame(), e = data.end || {};
  const a = d => interpolate(f, [d, d + 12], [0, 1], { ...clamp, easing: ease });
  const up = d => ({ opacity: a(d), transform: `translateY(${(1 - a(d)) * 26}px)` });
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(900px 700px at 80% 12%, rgba(16,185,129,.28), transparent 70%), linear-gradient(160deg,#0b1220,#07101c)', alignItems: 'center', justifyContent: 'center', fontFamily }}>
      <Img src={staticFile('logo.svg')} style={{ width: 190, height: 190, borderRadius: 44, ...up(0) }} />
      <div style={{ color: '#fff', fontSize: 92, fontWeight: 900, letterSpacing: -2, marginTop: 30, ...up(4) }}>Kapitaro</div>
      <div style={{ color: '#fff', fontSize: 58, fontWeight: 800, lineHeight: 1.15, textAlign: 'center', marginTop: 46, padding: '0 80px', ...up(9) }}><Rich text={e.tagline || 'Ton épargne, *enfin claire.*'} /></div>
      <div style={{ marginTop: 60, background: '#16a34a', color: '#fff', fontSize: 44, fontWeight: 800, padding: '26px 60px', borderRadius: 26, boxShadow: '0 18px 50px rgba(22,163,74,.45)', ...up(15) }}>{e.cta || 'Essaie gratuitement'}</div>
      <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 40, fontWeight: 700, marginTop: 30, ...up(19) }}>sur <span style={{ color: GREEN }}>kapitaro.fr</span></div>
      <div style={{ position: 'absolute', bottom: 150, left: 90, right: 90, textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: 24, fontWeight: 500, lineHeight: 1.4, opacity: a(22) }}>{e.note || 'Outil pédagogique, pas un conseil en investissement. Investir comporte un risque de perte en capital.'}</div>
    </AbsoluteFill>
  );
};

export const Pub = () => (
  <AbsoluteFill style={{ background: '#060b18', fontFamily }}>
    {scenes.map((s, i) => <Sequence key={i} from={s.from} durationInFrames={s.frames}><Scene s={s} i={i} last={i === scenes.length - 1} /></Sequence>)}
    <Sequence from={acc} durationInFrames={END}><EndCard /></Sequence>
    {data.musicFile && <Audio src={staticFile(data.musicFile)} volume={fr => interpolate(fr, [0, 15, pubFrames - 30, pubFrames], [0, 0.4, 0.4, 0], clamp)} />}
  </AbsoluteFill>
);
