// Pub « scènes réelles » (Reel 1080 × 1920) : accroche, démonstration de l'appli, clôture, puis carte de fin.
// Les photos sont dans public/pub/ (scènes réalistes, capture de l'appli déjà incrustée dans les téléphones).
// Données : src/data.json (scenes = [{ img, kicker, title, sub, pos, chips, dur, words }], end, segments = voix), écrit par render-job.mjs.
// Animations : transitions variées entre les scènes, texte qui apparaît mot par mot au rythme de la voix,
// étiquettes qui surgissent, barre de progression façon « story », bouton de fin qui bat.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import data from './data.json';

const { fontFamily } = loadFont('normal', { weights: ['500', '600', '700', '800', '900'], subsets: ['latin', 'latin-ext'] });
const FPS = 30, OVER = 10;   // OVER : la scène reste dessous pendant que la suivante arrive
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const ease = Easing.out(Easing.cubic);
const GREEN = '#34d399';
const pop = (f, delay = 0, cfg = {}) => spring({ frame: f - delay, fps: FPS, config: { damping: 13, stiffness: 170, mass: 0.7, ...cfg } });

const scenes = (data.scenes || []).map(s => ({ ...s, frames: Math.max(36, Math.round((s.dur || 3) * FPS)) }));
let acc = 0;
scenes.forEach(s => { s.from = acc; acc += s.frames; });
const endData = data.end || {};
const END = Math.round((endData.dur || 3.4) * FPS);
export const pubFrames = Math.max(1, acc) + END;
const hasVoice = (data.segments || []).length > 0;

// Titre découpé en mots ; *…* = en vert. Chaque mot arrive à son tour, calé sur la durée de la phrase dite.
const titleWords = text => {
  const out = []; let green = false;
  String(text || '').split('*').forEach(part => { part.split(/\s+/).filter(Boolean).forEach(w => out.push({ w, green })); green = !green; });
  return out;
};
const spokenFrames = s => {
  const w = s.words && s.words.length ? s.words[s.words.length - 1] : null;
  return w ? Math.round((w.t + w.d) * FPS) : Math.round(s.frames * 0.55);
};

const Title = ({ s, size = 80 }) => {
  const f = useCurrentFrame(), words = titleWords(s.title), span = Math.max(8, spokenFrames(s) * 0.8);
  return (
    <div style={{ color: '#fff', fontSize: size, fontWeight: 900, lineHeight: 1.1, letterSpacing: -2, textShadow: '0 6px 30px rgba(0,0,0,.6)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 20px' }}>
      {words.map((x, i) => {
        const p = pop(f, 6 + (i / Math.max(1, words.length)) * span);
        return <span key={i} style={{ display: 'inline-block', color: x.green ? GREEN : '#fff', opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})` }}>{x.w}</span>;
      })}
    </div>
  );
};

const CHIP_POS = [{ x: 80, y: 340, r: -5 }, { x: 610, y: 480, r: 4 }, { x: 130, y: 690, r: 3 }, { x: 590, y: 850, r: -4 }];
const Chips = ({ list }) => {
  const f = useCurrentFrame();
  return (list || []).map((c, i) => {
    const p = pop(f, 10 + i * 7), pos = CHIP_POS[i % CHIP_POS.length], bob = Math.sin((f + i * 20) / 14) * 8;
    return (
      <div key={i} style={{ position: 'absolute', left: pos.x, top: pos.y + bob, transform: `rotate(${pos.r}deg) scale(${p})`, opacity: Math.min(1, p * 1.5), background: 'rgba(255,255,255,.96)', color: '#0b1220', fontSize: 40, fontWeight: 800, padding: '18px 30px', borderRadius: 60, boxShadow: '0 16px 44px rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 18, height: 18, borderRadius: 9, background: '#16a34a' }} />{c}
      </div>
    );
  });
};

// Entrée de scène : zoom, glissement latéral ou montée, à tour de rôle
const enter = (f, i) => {
  const t = interpolate(f, [0, OVER], [0, 1], { ...clamp, easing: ease });
  if (i === 0) return { opacity: interpolate(f, [0, 8], [0, 1], clamp) };
  if (i % 3 === 1) return { transform: `translateX(${(1 - t) * 100}%)` };
  if (i % 3 === 2) return { transform: `translateY(${(1 - t) * 100}%)` };
  return { opacity: t, transform: `scale(${1.35 - 0.35 * t})` };
};

const Scene = ({ s, i }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, s.frames + OVER], i % 2 ? [1.16, 1.04] : [1.04, 1.16], clamp);
  const x = interpolate(f, [0, s.frames + OVER], i % 2 ? [-18, 18] : [18, -18], clamp);
  const top = s.pos === 'top';
  const k = pop(f, 3);
  return (
    <AbsoluteFill style={{ background: '#060b18', overflow: 'hidden', ...enter(f, i) }}>
      <Img src={staticFile(s.img)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z}) translateX(${x}px)` }} />
      <AbsoluteFill style={{ background: top
        ? 'linear-gradient(180deg, rgba(6,11,24,.9) 0%, rgba(6,11,24,.6) 22%, rgba(6,11,24,0) 42%, rgba(6,11,24,0) 80%, rgba(6,11,24,.6) 100%)'
        : 'linear-gradient(180deg, rgba(6,11,24,.55) 0%, rgba(6,11,24,0) 22%, rgba(6,11,24,0) 48%, rgba(6,11,24,.74) 72%, rgba(6,11,24,.94) 100%)' }} />
      <Chips list={s.chips} />
      <div style={{ position: 'absolute', left: 60, right: 60, ...(top ? { top: 190 } : { bottom: 330 }), textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {s.kicker && <div style={{ background: '#16a34a', color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', padding: '12px 26px', borderRadius: 40, marginBottom: 22, transform: `scale(${k})`, opacity: Math.min(1, k * 1.5), boxShadow: '0 10px 30px rgba(22,163,74,.45)' }}>{s.kicker}</div>}
        <Title s={s} />
        {s.sub && <div style={{ color: 'rgba(255,255,255,.88)', fontSize: 38, fontWeight: 600, lineHeight: 1.3, marginTop: 20, opacity: interpolate(f, [18, 30], [0, 1], clamp), textShadow: '0 4px 20px rgba(0,0,0,.6)' }}>{s.sub}</div>}
      </div>
      {/* Éclair bref au changement de plan */}
      {i > 0 && <AbsoluteFill style={{ background: '#fff', opacity: interpolate(f, [OVER - 2, OVER + 5], [0.28, 0], clamp) }} />}
    </AbsoluteFill>
  );
};

const EndCard = () => {
  const f = useCurrentFrame(), e = endData;
  const t = interpolate(f, [0, OVER], [0, 1], { ...clamp, easing: ease });
  const up = d => { const p = pop(f, d); return { opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 40}px) scale(${0.8 + 0.2 * p})` }; };
  const beat = 1 + Math.max(0, Math.sin((f - 30) / 5)) * 0.045;
  const sweep = interpolate((f - 34) % 50, [0, 22], [-120, 520], clamp);
  return (
    <AbsoluteFill style={{ transform: `scale(${1.25 - 0.25 * t})`, opacity: t, background: 'linear-gradient(160deg,#0b1220,#07101c)', alignItems: 'center', justifyContent: 'center', fontFamily, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 1100, height: 1100, left: 320 + Math.sin(f / 30) * 60, top: -380 + Math.cos(f / 36) * 50, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,.34), transparent 65%)' }} />
      <div style={{ position: 'absolute', width: 900, height: 900, left: -380 + Math.cos(f / 32) * 50, bottom: -300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,.22), transparent 65%)' }} />
      <Img src={staticFile('logo.svg')} style={{ width: 200, height: 200, borderRadius: 46, boxShadow: '0 24px 70px rgba(0,0,0,.5)', ...up(4) }} />
      <div style={{ color: '#fff', fontSize: 96, fontWeight: 900, letterSpacing: -2, marginTop: 30, ...up(9) }}>Kapitaro</div>
      <div style={{ marginTop: 40, padding: '0 70px' }}><Title s={{ title: e.tagline || 'Ton épargne, *enfin claire.*', frames: END, words: null }} size={62} /></div>
      <div style={{ position: 'relative', overflow: 'hidden', marginTop: 64, background: '#16a34a', color: '#fff', fontSize: 46, fontWeight: 800, padding: '28px 64px', borderRadius: 28, boxShadow: '0 18px 54px rgba(22,163,74,.5)', ...up(22), transform: `scale(${pop(f, 22) * beat})` }}>
        {e.cta || 'Essaie gratuitement'}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: sweep, width: 90, background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.4), transparent)', transform: 'skewX(-18deg)' }} />
      </div>
      <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 42, fontWeight: 700, marginTop: 32, ...up(28) }}>sur <span style={{ color: GREEN }}>kapitaro.fr</span></div>
      <div style={{ position: 'absolute', bottom: 150, left: 90, right: 90, textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: 24, fontWeight: 500, lineHeight: 1.4, opacity: interpolate(f, [30, 42], [0, 1], clamp) }}>{e.note || 'Outil pédagogique, pas un conseil en investissement. Investir comporte un risque de perte en capital.'}</div>
    </AbsoluteFill>
  );
};

// Barre du haut façon « story » : un segment par scène, qui se remplit pendant qu'elle passe
const Bars = () => {
  const f = useCurrentFrame();
  const parts = scenes.map(s => ({ from: s.from, frames: s.frames })).concat([{ from: acc, frames: END }]);
  return (
    <div style={{ position: 'absolute', top: 44, left: 50, right: 50, display: 'flex', gap: 10 }}>
      {parts.map((p, i) => (
        <div key={i} style={{ flex: p.frames, height: 7, borderRadius: 4, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${interpolate(f, [p.from, p.from + p.frames], [0, 100], clamp)}%`, background: '#fff', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
};

export const Pub = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#060b18', fontFamily }}>
      {scenes.map((s, i) => <Sequence key={i} from={s.from} durationInFrames={s.frames + OVER}><Scene s={s} i={i} /></Sequence>)}
      <Sequence from={acc} durationInFrames={END}><EndCard /></Sequence>
      <Bars />
      {f < acc && (
        <div style={{ position: 'absolute', top: 78, left: 50, display: 'flex', alignItems: 'center', gap: 14, opacity: 0.95 }}>
          <Img src={staticFile('logo.svg')} style={{ width: 56, height: 56, borderRadius: 14 }} />
          <span style={{ color: '#fff', fontSize: 34, fontWeight: 800, textShadow: '0 2px 12px rgba(0,0,0,.6)' }}>Kapitaro</span>
        </div>
      )}
      {(data.segments || []).map((s, k) => <Sequence key={'v' + k} from={Math.round(s.start * FPS)}><Audio src={staticFile(s.file)} /></Sequence>)}
      {data.musicFile && <Audio src={staticFile(data.musicFile)} volume={fr => interpolate(fr, [0, 12, pubFrames - 30, pubFrames], [0, hasVoice ? 0.2 : 0.4, hasVoice ? 0.26 : 0.4, 0], clamp)} />}
    </AbsoluteFill>
  );
};
