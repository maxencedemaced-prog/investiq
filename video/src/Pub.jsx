// Pub « scènes réelles » (Reel 1080 × 1920) : accroche, démonstration de l'appli, clôture, puis carte de fin.
// Les photos sont dans public/pub/ (scènes réalistes, capture de l'appli déjà incrustée dans les téléphones).
// Données : src/data.json (scenes = [{ img, kicker, title, sub, pos, chips, dur, words }], end, segments = voix), écrit par render-job.mjs.
// Animations : transitions variées entre les scènes, texte qui apparaît mot par mot au rythme de la voix,
// étiquettes qui surgissent, barre de progression façon « story », bouton de fin qui bat.
import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
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
scenes.forEach((s, i) => { s.from = acc; acc += s.frames; s.phoneIn = !(i > 0 && scenes[i - 1].layout === 'phone' && scenes[i - 1].screen); });   // phoneIn : le téléphone entre (pas de téléphone juste avant)
const endData = data.end || {};
const END = Math.round((endData.dur || 3.4) * FPS);
export const pubFrames = Math.max(1, acc) + END;
const hasVoice = (data.segments || []).length > 0;
// Mode « doux » : fondus enchaînés, téléphone qui reste en place d'un écran à l'autre (seul l'écran change), pas d'éclair
const SOFT = !!data.soft, FADE = 16, BARS = data.bars !== false;
// Fond « neutre » : dégradé graphite avec des halos qui bougent lentement (continu d'une scène à l'autre)
const NEUTRAL = data.bg === 'neutral';
// Mode « énergie » : fonds de couleur vive qui changent à chaque plan, coupes rapides (glissé + flou de vitesse),
// zooms caméra sur le téléphone, secousse à l'arrivée, mots surlignés en jaune
const ENERGY = data.energy === 'high';
const PALETTE = [['#16a34a', '#22c55e'], ['#2563eb', '#38bdf8'], ['#7c3aed', '#c084fc'], ['#f97316', '#fbbf24'], ['#db2777', '#f472b6'], ['#0891b2', '#2dd4bf'], ['#16a34a', '#a3e635']];
const FlashBg = ({ i, f }) => {
  const [a, b] = PALETTE[i % PALETTE.length];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${150 + i * 25}deg, ${a} 0%, ${b} 100%)`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: '48%', width: 3200, height: 3200, marginLeft: -1600, marginTop: -1600, background: 'repeating-conic-gradient(rgba(255,255,255,.13) 0deg 9deg, transparent 9deg 22deg)', transform: `rotate(${f * 0.45 * (i % 2 ? -1 : 1)}deg)` }} />
      <div style={{ position: 'absolute', width: 1200, height: 1200, left: -200 + Math.sin(f / 18) * 120, top: 500 + Math.cos(f / 22) * 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.35), transparent 60%)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 45%, rgba(0,0,0,.28) 100%)' }} />
    </AbsoluteFill>
  );
};
const NeutralBg = ({ G }) => (
  <AbsoluteFill style={{ background: 'linear-gradient(165deg,#111827 0%,#0b1220 55%,#0a0f1a 100%)', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', width: 1300, height: 1300, left: -300 + Math.sin(G / 70) * 220, top: 120 + Math.cos(G / 90) * 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,.22), transparent 62%)' }} />
    <div style={{ position: 'absolute', width: 1100, height: 1100, left: 300 + Math.cos(G / 60) * 240, top: 900 + Math.sin(G / 80) * 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,.18), transparent 62%)' }} />
    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1.5px, transparent 1.5px)', backgroundSize: '44px 44px', transform: `translateY(${(G * 0.6) % 44}px)` }} />
  </AbsoluteFill>
);
// Grand mot derrière le téléphone, qui glisse doucement
const BackWord = ({ s, f }) => (
  <div style={{ position: 'absolute', top: 820, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
    <div style={{ fontSize: s.back.length > 9 ? 170 : 230, fontWeight: 900, letterSpacing: -6, color: ENERGY ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.07)', WebkitTextStroke: ENERGY ? '0' : '2px rgba(52,211,153,.35)', whiteSpace: 'nowrap', transform: `translateX(${interpolate(f, [0, s.frames + FADE], ENERGY ? [260, -260] : [60, -60], clamp)}px)` }}>{s.back}</div>
  </div>
);

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
        if (ENERGY) return <span key={i} style={{ display: 'inline-block', color: x.green ? '#0b1220' : '#fff', background: x.green ? '#fde047' : 'transparent', padding: x.green ? '0 14px' : 0, borderRadius: 12, textShadow: x.green ? 'none' : '0 6px 0 rgba(0,0,0,.28)', opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 70}px) scale(${0.4 + 0.6 * p}) rotate(${x.green ? -2 : 0}deg)` }}>{x.w}</span>;
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
  if (ENERGY) {
    if (i === 0) return { transform: `scale(${1.3 - 0.3 * t})` };
    const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][i % 4];
    return { transform: `translate(${d[0] * (1 - t) * 105}%, ${d[1] * (1 - t) * 105}%) skew(${d[0] * (1 - t) * -14}deg, ${d[1] * (1 - t) * -8}deg) scale(${1.15 - 0.15 * t})`, filter: `blur(${(1 - t) * 14}px)` };
  }
  if (SOFT) return { opacity: i === 0 ? interpolate(f, [0, 8], [0, 1], clamp) : interpolate(f, [0, FADE], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) }) };
  if (i === 0) return { opacity: interpolate(f, [0, 8], [0, 1], clamp) };
  if (i % 3 === 1) return { transform: `translateX(${(1 - t) * 100}%)` };
  if (i % 3 === 2) return { transform: `translateY(${(1 - t) * 100}%)` };
  return { opacity: t, transform: `scale(${1.35 - 0.35 * t})` };
};

// Enregistrement réel de l'appli (tutoriel du Studio), lu dans le téléphone
const Screen = ({ s, style }) => <OffthreadVideo src={staticFile(`screen-${s.screen}.mp4`)} muted startFrom={Math.round((s.screenFrom || 0) * FPS)} playbackRate={s.screenRate || 1} style={{ objectFit: 'cover', objectPosition: 'top', background: '#fff', ...style }} />;

// Grand téléphone en 3D qui arrive, pivote et flotte, avec l'appli qui tourne dedans
const Phone = ({ s }) => {
  const f = useCurrentFrame(), G = s.from + f;   // G : image globale, pour que le téléphone soit au même endroit d'une scène à l'autre
  const p = SOFT && !s.phoneIn ? 1 : pop(f, 4, { damping: 15, stiffness: 110 });
  const ry = SOFT ? -4 + Math.sin(G / 50) * (NEUTRAL ? 16 : 9) : interpolate(f, [0, s.frames + OVER], [20, -10], clamp);
  const rx = SOFT ? 4 + Math.sin(G / 70) * (NEUTRAL ? 5 : 2) : interpolate(f, [0, s.frames + OVER], [8, 2], clamp);
  const bobF = SOFT ? G : f;
  const W = 600, H = Math.round(W * 1558 / 720);
  if (ENERGY) {
    const F = s.frames, q = pop(f, 0, { damping: 11, stiffness: 190, mass: 0.6 });
    const dir = s.from % 2 ? 1 : -1;
    const cam = interpolate(f, [0, F * 0.38, F * 0.55, F * 0.85, F + OVER], [1, 1, 1.32, 1.32, 1.12], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    const camY = interpolate(f, [0, F * 0.38, F * 0.55, F * 0.85, F + OVER], [0, 0, 260, 260, 80], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    const shake = f < 8 ? Math.sin(f * 2.6) * 14 * (1 - f / 8) : 0;
    const ryE = dir * interpolate(f, [0, F + OVER], [24, -12], clamp), rxE = interpolate(f, [0, F + OVER], [12, 3], clamp);
    return (
      <div style={{ position: 'absolute', left: (1080 - W) / 2 - 16, top: 520, perspective: 1600, transform: `translate(${shake}px, ${camY}px) scale(${cam})`, transformOrigin: '50% 30%' }}>
        <div style={{ width: W + 32, height: H + 32, borderRadius: 84, background: '#0a0a0c', padding: 16, boxShadow: '0 70px 120px rgba(0,0,0,.45), 0 0 0 4px rgba(255,255,255,.35)', transform: `translateY(${(1 - q) * 700}px) rotateY(${ryE}deg) rotateX(${rxE}deg) rotateZ(${dir * (1 - q) * 18}deg) scale(${0.75 + 0.25 * q})` }}>
          <div style={{ width: W, height: H, borderRadius: 70, overflow: 'hidden', background: '#fff' }}><Screen s={s} style={{ width: W, height: H }} /></div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', left: (1080 - W) / 2 - 16, top: 500, perspective: 1900 }}>
      <div style={{ width: W + 32, height: H + 32, borderRadius: 84, background: '#0a0a0c', padding: 16, boxShadow: '0 60px 120px rgba(0,0,0,.65), 0 0 0 3px rgba(255,255,255,.14), 0 0 90px rgba(52,211,153,.28)', transform: `translateY(${(1 - p) * 900 + Math.sin(bobF / 16) * 10}px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${0.9 + 0.1 * p})` }}>
        <div style={{ width: W, height: H, borderRadius: 70, overflow: 'hidden', background: '#fff' }}><Screen s={s} style={{ width: W, height: H }} /></div>
      </div>
    </div>
  );
};

const Scene = ({ s, i }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, s.frames + OVER], i % 2 ? [1.16, 1.04] : [1.04, 1.16], clamp);
  const x = interpolate(f, [0, s.frames + OVER], i % 2 ? [-18, 18] : [18, -18], clamp);
  const top = s.pos === 'top';
  const k = pop(f, 3);
  const phone = s.layout === 'phone' && s.screen, textOnly = s.layout === 'text';
  return (
    <AbsoluteFill style={{ background: '#060b18', overflow: 'hidden', ...enter(f, i) }}>
      {ENERGY ? <><FlashBg i={i} f={f} />{s.back && phone && <BackWord s={s} f={f} />}</> : NEUTRAL ? <><NeutralBg G={s.from + f} />{s.back && phone && <BackWord s={s} f={f} />}</> : s.video
        ? <OffthreadVideo src={staticFile(s.video)} muted playbackRate={s.videoRate || 1} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.04 + f * 0.0006})` }} />
        : <div style={{ position: 'absolute', inset: 0, transform: `scale(${z}) translateX(${x}px)`, filter: phone ? 'blur(26px) brightness(.5) saturate(1.2)' : 'none' }}>
            <Img src={staticFile(s.img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {!phone && s.screen && s.rect && <Screen s={s} style={{ position: 'absolute', left: s.rect[0], top: s.rect[1], width: s.rect[2], height: s.rect[3], borderRadius: s.rect[4] }} />}
          </div>}
      {phone && <Phone s={s} />}
      <AbsoluteFill style={{ opacity: phone || NEUTRAL || ENERGY ? 0 : 1, background: top
        ? 'linear-gradient(180deg, rgba(6,11,24,.9) 0%, rgba(6,11,24,.6) 22%, rgba(6,11,24,0) 42%, rgba(6,11,24,0) 80%, rgba(6,11,24,.6) 100%)'
        : 'linear-gradient(180deg, rgba(6,11,24,.55) 0%, rgba(6,11,24,0) 22%, rgba(6,11,24,0) 48%, rgba(6,11,24,.74) 72%, rgba(6,11,24,.94) 100%)' }} />
      <Chips list={s.chips} />
      <div style={{ position: 'absolute', left: 60, right: 60, ...(textOnly ? { top: 1010 } : top ? { top: 190 } : { bottom: 330 }), textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {s.kicker && <div style={{ background: ENERGY ? '#0b1220' : '#16a34a', color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', padding: '12px 26px', borderRadius: 40, marginBottom: 22, transform: `scale(${k})`, opacity: Math.min(1, k * 1.5), boxShadow: '0 10px 30px rgba(22,163,74,.45)' }}>{s.kicker}</div>}
        <Title s={s} size={textOnly ? 96 : 80} />
        {s.sub && <div style={{ color: 'rgba(255,255,255,.88)', fontSize: 38, fontWeight: 600, lineHeight: 1.3, marginTop: 20, opacity: interpolate(f, [18, 30], [0, 1], clamp), textShadow: '0 4px 20px rgba(0,0,0,.6)' }}>{s.sub}</div>}
      </div>
      {/* Éclair bref au changement de plan */}
      {i > 0 && !SOFT && <AbsoluteFill style={{ background: '#fff', opacity: interpolate(f, [OVER - 2, OVER + 5], [0.28, 0], clamp) }} />}
    </AbsoluteFill>
  );
};

// Badges des magasins d'applications (fin de pub quand les applis sont sorties : end.stores = true)
const AppleIcon = () => <svg width="54" height="64" viewBox="0 0 384 512"><path fill="#fff" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>;
const PlayIcon = () => <svg width="56" height="62" viewBox="0 0 28 31"><path fill="#34d399" d="M1 1l15 14.5L1 30c-.6-.3-1-.9-1-1.7V2.7C0 1.9.4 1.3 1 1z"/><path fill="#fbbf24" d="M21 10.5l-5 5 5 5 5.6-3.2c1.6-.9 1.6-2.8 0-3.7z"/><path fill="#ef4444" d="M16 15.5L1 30c.5.3 1.2.3 1.9-.1L21 20.5z"/><path fill="#3b82f6" d="M16 15.5L21 10.5 2.9 1.1C2.2.7 1.5.7 1 1z"/></svg>;
const StoreBadge = ({ icon, small, big, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: '#000', border: '3px solid rgba(255,255,255,.55)', borderRadius: 26, padding: '18px 34px 18px 28px', boxShadow: '0 16px 44px rgba(0,0,0,.45)', ...style }}>
    {icon}
    <div style={{ display: 'flex', flexDirection: 'column', color: '#fff', lineHeight: 1.05 }}>
      <span style={{ fontSize: 24, fontWeight: 600 }}>{small}</span>
      <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -0.5 }}>{big}</span>
    </div>
  </div>
);

const EndCard = () => {
  const f = useCurrentFrame(), e = endData;
  const t = interpolate(f, [0, SOFT ? FADE : OVER], [0, 1], { ...clamp, easing: ease });
  const up = d => { const p = pop(f, d); return { opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 40}px) scale(${0.8 + 0.2 * p})` }; };
  const beat = 1 + Math.max(0, Math.sin((f - 30) / 5)) * 0.045;
  const sweep = interpolate((f - 34) % 50, [0, 22], [-120, 520], clamp);
  return (
    <AbsoluteFill style={{ transform: `scale(${SOFT ? 1.06 - 0.06 * t : 1.25 - 0.25 * t})`, opacity: t, background: ENERGY ? 'linear-gradient(160deg,#16a34a,#065f46)' : 'linear-gradient(160deg,#0b1220,#07101c)', alignItems: 'center', justifyContent: 'center', fontFamily, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 1100, height: 1100, left: 320 + Math.sin(f / 30) * 60, top: -380 + Math.cos(f / 36) * 50, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,.34), transparent 65%)' }} />
      <div style={{ position: 'absolute', width: 900, height: 900, left: -380 + Math.cos(f / 32) * 50, bottom: -300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,.22), transparent 65%)' }} />
      <Img src={staticFile('logo.svg')} style={{ width: 200, height: 200, borderRadius: 46, boxShadow: '0 24px 70px rgba(0,0,0,.5)', ...up(4) }} />
      <div style={{ color: '#fff', fontSize: 96, fontWeight: 900, letterSpacing: -2, marginTop: 30, ...up(9) }}>Kapitaro</div>
      <div style={{ marginTop: 40, padding: '0 70px' }}><Title s={{ title: e.tagline || 'Ton épargne, *enfin claire.*', frames: END, words: null }} size={62} /></div>
      {e.stores ? (
        <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
          <div style={{ color: '#fff', fontSize: 46, fontWeight: 800, ...up(20) }}>{e.cta || 'Télécharge l’appli gratuite'}</div>
          <StoreBadge icon={<AppleIcon />} small="Télécharger dans l’" big="App Store" style={up(24)} />
          <StoreBadge icon={<PlayIcon />} small="DISPONIBLE SUR" big="Google Play" style={up(29)} />
        </div>
      ) : (<>
      <div style={{ position: 'relative', overflow: 'hidden', marginTop: 64, background: ENERGY ? '#0b1220' : '#16a34a', color: '#fff', fontSize: 46, fontWeight: 800, padding: '28px 64px', borderRadius: 28, boxShadow: '0 18px 54px rgba(22,163,74,.5)', ...up(22), transform: `scale(${pop(f, 22) * beat})` }}>
        {e.cta || 'Essaie gratuitement'}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: sweep, width: 90, background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.4), transparent)', transform: 'skewX(-18deg)' }} />
      </div>
      <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 42, fontWeight: 700, marginTop: 32, ...up(28) }}>sur <span style={{ color: GREEN }}>kapitaro.fr</span></div>
      </>)}
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
      {scenes.map((s, i) => <Sequence key={i} from={s.from} durationInFrames={s.frames + (SOFT ? FADE : OVER)}><Scene s={s} i={i} /></Sequence>)}
      <Sequence from={acc} durationInFrames={END}><EndCard /></Sequence>
      {BARS && <Bars />}
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
