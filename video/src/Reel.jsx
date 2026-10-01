// Vidéo animée Kapitaro (Reel 1080 × 1920) : style sobre « fintech », une scène par phrase de la voix.
// Les données (texte, minutage des mots, voix) viennent de src/data.json, écrit par render-job.mjs.
import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate, random, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import data from './data.json';

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin', 'latin-ext'] });
const FPS = 30;
const C = { bg: '#060b18', text: '#f4f7fb', muted: 'rgba(226,232,240,.62)', faint: 'rgba(226,232,240,.45)', green: '#34d399', green2: '#22d3ee', red: '#fb7185', line: 'rgba(255,255,255,.12)', glass: 'rgba(255,255,255,.055)' };
const GRAD = `linear-gradient(90deg, ${C.green}, ${C.green2})`;
const ease = Easing.out(Easing.cubic);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const io = (f, a, b, from, to, e = ease) => interpolate(f, [a, b], [from, to], { ...clamp, easing: e });
const ICONS = ['warning', 'bulb', 'shield', 'chart', 'rocket', 'bank', 'coin', 'money', 'calendar', 'phone', 'balance', 'sparkles', 'hourglass', 'house', 'down', 'search', 'lock', 'bars', 'globe'];
const GLOWS = ['#3b82f6', '#6366f1', '#10b981', '#0ea5e9', '#8b5cf6', '#14b8a6'];

// Minutage : chaque scène couvre [start, end[ en secondes (fin de la dernière + 1,2 s pour la conclusion)
const beats = data.beats.map((b, i) => {
  const from = Math.round(b.start * FPS), last = i === data.beats.length - 1;
  const to = last ? Math.round((b.end + (data.jingle ? 3 : 1.2)) * FPS) : Math.round(b.end * FPS);
  return { ...b, i, from, dur: Math.max(12, to - from) };
});
// Le jingle démarre juste après la dernière phrase de la voix
const JINGLE_AT = beats.length ? Math.round(beats[beats.length - 1].end * FPS) - 4 : 0;
export const totalFrames = beats.length ? beats[beats.length - 1].from + beats[beats.length - 1].dur : 60;
const beatAt = f => beats.findIndex(b => f >= b.from && f < b.from + b.dur);

const norm = w => String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const cueFrame = (b, text, fallback) => {
  const key = norm(String(text || '').split(/\s+/).find(w => norm(w).length > 3) || '');
  const w = key && (b.words || []).find(x => norm(x.w).includes(key) || key.includes(norm(x.w)) && norm(x.w).length > 3);
  return Math.round((w ? w.t : fallback) * FPS);
};
const eur = n => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' €';
// Même formule que les « faits vérifiés » du serveur (taux mensuel = taux annuel / 12), arrondi à la centaine
const fv = (monthly, years, ratePct) => { const i = ratePct / 100 / 12, n = years * 12; return monthly * ((Math.pow(1 + i, n) - 1) / i); };
const r100 = v => Math.round(v / 100) * 100;

// ── Fond continu : bleu nuit, deux lueurs dont la teinte change à chaque scène, grille discrète ──
const Background = () => {
  const f = useCurrentFrame(), i = Math.max(0, beatAt(f)), b = beats[i] || {};
  const g1 = b.v === 'warn' ? '#f43f5e' : GLOWS[i % GLOWS.length], g2 = GLOWS[(i + 3) % GLOWS.length];
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: -700 + Math.sin(f / 90) * 120, top: -650 + Math.cos(f / 110) * 80, width: 2100, height: 2100, borderRadius: '50%', background: `radial-gradient(circle, ${g1}55 0%, ${g1}22 35%, transparent 65%)` }} />
      <div style={{ position: 'absolute', right: -820 + Math.cos(f / 100) * 120, bottom: -700 + Math.sin(f / 80) * 100, width: 2100, height: 2100, borderRadius: '50%', background: `radial-gradient(circle, ${g2}40 0%, ${g2}18 35%, transparent 65%)` }} />
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`, backgroundSize: '90px 90px', opacity: 0.25,
        maskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 70%)' }} />
      {Array.from({ length: 16 }).map((_, k) => {
        const x = random('x' + k) * 1080, sp = 0.4 + random('s' + k) * 0.8, sz = 3 + random('z' + k) * 5;
        let y = (random('y' + k) * 2000 - f * sp) % 2000; if (y < 0) y += 2000;
        return <div key={k} style={{ position: 'absolute', left: x, top: y, width: sz, height: sz, borderRadius: '50%', background: '#fff', opacity: 0.1 + random('o' + k) * 0.2 }} />;
      })}
    </AbsoluteFill>
  );
};

// ── Texte révélé mot à mot ; *mot* = accent dégradé ; taille adaptée à la ligne la plus longue ──
const fitSize = (lines, max) => Math.min(max, Math.floor(950 / (Math.max(...lines.map(l => l.replace(/\*/g, '').length), 1) * 0.56)));
const Reveal = ({ lines, top, max = 120, weight = 700, delay = 2 }) => {
  const f = useCurrentFrame(); let n = 0;
  if (!lines || !lines.length) return null;
  const size = fitSize(lines, max);
  return <div style={{ position: 'absolute', top, left: 50, right: 50, textAlign: 'center' }}>
    {lines.map((l, li) => <div key={li} style={{ fontSize: size, fontWeight: weight, lineHeight: 1.1, letterSpacing: -size * 0.035, color: C.text, whiteSpace: 'nowrap' }}>
      {l.split(' ').map((w, wi, arr) => {
        const d = delay + (n++) * 2.5, p = io(f, d, d + 14, 0, 1);
        const hi = w.startsWith('*') || w.endsWith('*'), txt = w.replace(/\*/g, '').replace(/_/g, ' ');
        return <span key={wi} style={{ display: 'inline-block', marginRight: wi < arr.length - 1 ? size * 0.24 : 0, opacity: p, transform: `translateY(${(1 - p) * 28}px)`, filter: `blur(${(1 - p) * 10}px)`,
          ...(hi ? { backgroundImage: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : {}) }}>{txt}</span>;
      })}
    </div>)}
  </div>;
};
const Muted = ({ text, top, delay = 10, size = 40 }) => {
  const f = useCurrentFrame(), p = io(f, delay, delay + 14, 0, 1);
  if (!text) return null;
  return <div style={{ position: 'absolute', top, left: 80, right: 80, textAlign: 'center', color: C.muted, fontSize: size, fontWeight: 500, lineHeight: 1.3, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>{String(text).replace(/\*/g, '')}</div>;
};
const Glass = ({ top, left = 70, right = 70, children, delay = 0, style }) => {
  const f = useCurrentFrame(), p = io(f, delay, delay + 16, 0, 1);
  return <div style={{ position: 'absolute', top, left, right, borderRadius: 40, background: C.glass, border: `1.5px solid ${C.line}`,
    boxShadow: '0 40px 100px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.12)', opacity: p, transform: `translateY(${(1 - p) * 40}px) scale(${0.97 + p * 0.03})`, ...style }}>{children}</div>;
};
const Icon3D = ({ name, top, size = 230, delay = 0 }) => {
  const f = useCurrentFrame(), p = io(f, delay, delay + 18, 0, 1);
  if (!ICONS.includes(name)) return null;
  return <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
    <div style={{ position: 'absolute', top: -size * 0.1, width: size * 1.4, height: size * 1.4, borderRadius: '50%', background: `radial-gradient(circle, ${C.green}33 0%, transparent 65%)`, opacity: p }} />
    <Img src={staticFile(name + '.png')} style={{ width: size, height: size, opacity: p, transform: `translateY(${(1 - p) * 30 + Math.sin(f / 18) * 8}px) scale(${0.9 + p * 0.1})` }} />
  </div>;
};

// Texte court avec *mot* en couleur (étapes, listes, libellés)
const Accent = ({ text }) => <>{String(text || '').split(/(\*[^*]+\*)/).map((part, k) => part.startsWith('*') && part.endsWith('*') && part.length > 2
  ? <span key={k} style={{ backgroundImage: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{part.slice(1, -1)}</span>
  : <React.Fragment key={k}>{part.replace(/\*/g, '')}</React.Fragment>)}</>;

// Grand chiffre : défile jusqu'à sa valeur s'il est numérique
const BigNumber = ({ value, top }) => {
  const f = useCurrentFrame(), m = String(value).match(/\d[\d\s .,]*/);
  let txt = String(value);
  if (m) {
    const n = parseFloat(m[0].replace(/[\s ]/g, '').replace(',', '.'));
    if (Number.isFinite(n) && n >= 10) txt = txt.replace(m[0], Math.round(n * io(f, 2, 18, 0, 1)).toLocaleString('fr-FR').replace(/\s/g, ' ') + (/\s$/.test(m[0]) ? ' ' : ''));
  }
  const size = Math.min(250, Math.floor(950 / (String(value).length * 0.6)));
  const p = io(f, 2, 14, 0, 1);
  return <div style={{ position: 'absolute', top, left: 40, right: 40, textAlign: 'center', fontSize: size, fontWeight: 800, letterSpacing: -size * 0.04, lineHeight: 1,
    backgroundImage: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', opacity: p, filter: `blur(${(1 - p) * 10}px)`, whiteSpace: 'nowrap' }}>{txt}</div>;
};

// Graphique d'intérêts composés : 1 = première courbe, 2 = seconde courbe, 3 = écart
const Chart = ({ b, top }) => {
  const f = useCurrentFrame();
  const rates = (b.rates || [3, 7]).slice(0, 2), monthly = b.monthly || 50, years = b.years || 20;
  const series = rates.map(r => Array.from({ length: years + 1 }, (_, y) => (y ? fv(monthly, y, r) : 0)));
  const ends = rates.map(r => r100(fv(monthly, years, r)));
  const W = 860, H = 450, max = Math.max(...ends) * 1.05, X = y => (y / years) * W, Y = v => H - (v / max) * H;
  const path = s => s.map((v, y) => `${y ? 'L' : 'M'}${X(y).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const draw = k => { const at = cueFrame(b, b.cues?.[k] || '', 0.4); return io(f, at, at + 26, 0, 1, Easing.inOut(Easing.cubic)); };
  const step = b.step || 3;
  const p0 = step === 1 ? draw(0) : 1, p1 = step === 1 ? 0 : step === 2 ? draw(1) : 1, gap = step === 3 ? io(f, 6, 24, 0, 1) : 0;
  const labels = b.labels && b.labels.length === 2 ? b.labels : rates.map(r => `≈ ${String(r).replace('.', ',')} %/an`);
  return <Glass top={top} style={{ padding: '42px 40px 36px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 10px' }}>
      <div style={{ color: C.text, fontSize: 40, fontWeight: 700 }}>{monthly} €/mois · {years} ans</div>
      <div style={{ color: C.muted, fontSize: 28 }}>versé : {eur(monthly * 12 * years)}</div>
    </div>
    <svg width="100%" viewBox={`-20 -30 ${W + 40} ${H + 60}`} style={{ marginTop: 20, overflow: 'visible' }}>
      <defs>
        <linearGradient id="g1" x1="0" x2="1"><stop offset="0" stopColor={C.green} /><stop offset="1" stopColor={C.green2} /></linearGradient>
        <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.green} stopOpacity=".28" /><stop offset="1" stopColor={C.green} stopOpacity="0" /></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(t => <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} stroke={C.line} strokeWidth="2" />)}
      {p1 > 0 && <path d={`${path(series[1])} L${W} ${H} L0 ${H} Z`} fill="url(#a1)" opacity={p1} />}
      <path d={path(series[0])} stroke="rgba(148,163,184,.9)" strokeWidth="7" fill="none" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p0} />
      {p1 > 0 && <path d={path(series[1])} stroke="url(#g1)" strokeWidth="9" fill="none" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p1} />}
      {p0 > 0.98 && <circle cx={X(years)} cy={Y(series[0][years])} r="12" fill="#cbd5e1" />}
      {p1 > 0.98 && <circle cx={X(years)} cy={Y(series[1][years])} r="14" fill={C.green2} />}
      {gap > 0 && <line x1={X(years) - 36} x2={X(years) - 36} y1={Y(series[1][years])} y2={Y(series[1][years]) + (Y(series[0][years]) - Y(series[1][years])) * gap} stroke="#fff" strokeWidth="3" strokeDasharray="10 10" />}
    </svg>
    <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
      {[0, 1].map(k => { const p = k ? p1 : p0; return (
        <div key={k} style={{ flex: 1, padding: '22px 26px', borderRadius: 26, background: 'rgba(255,255,255,.05)', border: `1.5px solid ${C.line}`, opacity: 0.35 + 0.65 * Math.min(1, p * 1.4) }}>
          <div style={{ color: C.muted, fontSize: 28, fontWeight: 600 }}>{labels[k]}</div>
          <div style={{ color: k ? C.green : '#cbd5e1', fontSize: 58, fontWeight: 700, letterSpacing: -2 }}>≈ {eur(ends[k] * p)}</div>
        </div>); })}
    </div>
    <div style={{ color: C.faint, fontSize: 24, marginTop: 20, textAlign: 'center' }}>Rendements hypothétiques, non garantis. Hors frais et fiscalité.</div>
  </Glass>;
};

// Deux barres comparées (valeurs affichées fournies, longueurs proportionnelles aux montants)
const Compare = ({ b, top }) => {
  const f = useCurrentFrame(), rows = (b.rows || []).slice(0, 2), max = Math.max(1, ...rows.map(r => r.amount || 0));
  return <Glass top={top} style={{ padding: '44px 46px' }}>
    {rows.map((r, k) => {
      const at = cueFrame(b, r.label, 0.3 + k * 1.2), p = io(f, at, at + 22, 0, 1);
      return <div key={k} style={{ margin: k ? '34px 0 0' : 0, opacity: 0.3 + 0.7 * p }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20 }}>
          <span style={{ color: C.text, fontSize: 42, fontWeight: 600 }}><Accent text={r.label} /></span>
          <span style={{ color: k ? C.green : C.text, fontSize: 58, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.value}</span>
        </div>
        <div style={{ height: 40, borderRadius: 20, background: 'rgba(255,255,255,.08)', marginTop: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((r.amount || 0) / max) * 100 * p}%`, borderRadius: 20, background: k ? GRAD : 'rgba(203,213,225,.8)' }} />
        </div>
      </div>;
    })}
    {b.note && <div style={{ color: C.faint, fontSize: 26, marginTop: 26, textAlign: 'center' }}>{b.note}</div>}
  </Glass>;
};

// Étapes numérotées ou liste à cocher : chaque ligne arrive quand la voix l'aborde
const Items = ({ b, top, numbered }) => {
  const items = (b.items || []).slice(0, 4), gapY = items.length > 3 ? 175 : 205;
  return <>{items.map((s, k) => {
    const at = cueFrame(b, s, 0.3 + k * ((b.end - b.start) / (items.length + 1))) - 4;
    return <Glass key={k} top={top + k * gapY} delay={at} style={{ padding: '32px 40px', display: 'flex', alignItems: 'center', gap: 28 }}>
      <div style={{ flex: 'none', width: 80, height: 80, borderRadius: numbered ? '50%' : 24, background: k === items.length - 1 ? GRAD : 'rgba(255,255,255,.1)', color: k === items.length - 1 ? '#04120c' : C.text, fontSize: 40, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{numbered ? k + 1 : '✓'}</div>
      <div style={{ color: C.text, fontSize: s.length > 26 ? 44 : 52, fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.15 }}><Accent text={s} /></div>
    </Glass>;
  })}</>;
};

// Tableau des marchés (données réelles) et agenda économique
const Market = ({ b, top }) => {
  const f = useCurrentFrame();
  return <Glass top={top} style={{ padding: '30px 44px' }}>
    {(b.rows || []).slice(0, 6).map((r, k) => {
      const p = io(f, 6 + k * 4, 20 + k * 4, 0, 1), up = (r.change || 0) >= 0;
      return <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 0', borderTop: k ? `1.5px solid ${C.line}` : 'none', opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
        <div><div style={{ color: C.text, fontSize: 44, fontWeight: 700 }}>{r.label}</div>{r.value && <div style={{ color: C.muted, fontSize: 28 }}>{r.value}</div>}</div>
        {r.change != null && <div style={{ color: up ? C.green : C.red, fontSize: 48, fontWeight: 700 }}>{up ? '▲ +' : '▼ '}{String(r.change).replace('.', ',')} %</div>}
      </div>;
    })}
    {b.note && <div style={{ color: C.faint, fontSize: 24, marginTop: 10, textAlign: 'center' }}>{b.note}</div>}
  </Glass>;
};
const Agenda = ({ b, top }) => {
  const f = useCurrentFrame();
  return <Glass top={top} style={{ padding: '30px 44px' }}>
    {(b.rows || []).slice(0, 5).map((r, k) => {
      const p = io(f, 6 + k * 4, 20 + k * 4, 0, 1);
      return <div key={k} style={{ display: 'flex', gap: 28, alignItems: 'center', padding: '22px 0', borderTop: k ? `1.5px solid ${C.line}` : 'none', opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
        <div style={{ flex: 'none', width: 190, color: C.green, fontSize: 34, fontWeight: 700 }}>{r.when}</div>
        <div><div style={{ color: C.text, fontSize: 40, fontWeight: 700, lineHeight: 1.15 }}>{r.label}</div>{r.detail && <div style={{ color: C.muted, fontSize: 28 }}>{r.detail}</div>}</div>
      </div>;
    })}
  </Glass>;
};

const Cta = ({ b }) => {
  const f = useCurrentFrame(), p = io(f, 10, 26, 0, 1), glow = 0.35 + Math.sin(f / 10) * 0.15;
  return <>
    <Img src={staticFile('logo.svg')} style={{ position: 'absolute', top: 400, left: 470, width: 140, height: 140, borderRadius: 36, opacity: io(f, 0, 14, 0, 1) }} />
    <Reveal lines={b.lines && b.lines.length ? b.lines : ['Simule', 'ton *projet*']} top={620} max={140} delay={4} />
    <div style={{ position: 'absolute', top: 1000, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
      <div style={{ padding: '30px 70px', borderRadius: 999, background: GRAD, color: '#04120c', fontSize: 52, fontWeight: 800, boxShadow: `0 0 80px rgba(52,211,153,${glow})` }}>{b.button || 'Essayer gratuitement'}</div>
      <div style={{ color: C.muted, fontSize: 38, fontWeight: 500 }}>{b.site || 'kapitaro.fr · lien en bio'}</div>
      <div style={{ color: C.faint, fontSize: 24, marginTop: 30 }}>{b.legal || 'Contenu éducatif, pas un conseil en investissement.'}</div>
    </div>
  </>;
};

// Vidéo d'illustration (Pexels) en fond de scène, assombrie et légèrement zoomée pour garder le texte lisible
const Broll = ({ file }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill>
    <OffthreadVideo src={staticFile(file)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.08 - f * 0.0006})` }} />
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(6,11,24,.72) 0%, rgba(6,11,24,.5) 40%, rgba(6,11,24,.62) 70%, rgba(6,11,24,.92) 100%)' }} />
  </AbsoluteFill>;
};

// Sous-titres discrets : le mot prononcé passe en vert
const Captions = ({ b }) => {
  const t = useCurrentFrame() / FPS, words = b.words || [];
  const chunks = []; let cur = [];
  words.forEach((w, k) => { cur.push(w); const n = words[k + 1]; if (cur.length >= 4 || !n || n.t - (w.t + w.d) > 0.2) { chunks.push(cur); cur = []; } });
  const ch = chunks.find((c, k) => t < (chunks[k + 1] ? chunks[k + 1][0].t : 99));
  if (!ch || t < ch[0].t - 0.05) return null;
  const p = interpolate(t, [ch[0].t - 0.05, ch[0].t + 0.12], [0, 1], clamp);
  return <div style={{ position: 'absolute', top: 1500, left: 60, right: 60, textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
    {ch.map((w, k) => <span key={k} style={{ fontSize: 50, fontWeight: 600, marginRight: 14, color: t >= w.t ? (t < w.t + w.d + 0.1 ? C.green : C.text) : 'rgba(244,247,251,.45)' }}>{w.w}</span>)}
  </div>;
};

// ── Style « vidéo réelle » : plan filmé plein écran, texte en surimpression, coupes franches ──
const RealScene = ({ b }) => {
  const f = useCurrentFrame(), last = b.i === beats.length - 1;
  const o = Math.min(io(f, 0, 4, 0, 1), last ? 1 : io(f, b.dur - 3, b.dur, 1, 0));
  const lines = b.lines && b.lines.length ? b.lines : [];
  const size = lines.length ? fitSize(lines, 110) : 100;
  const p = io(f, 3, 16, 0, 1);
  return <AbsoluteFill style={{ opacity: o }}>
    {b.broll_file && <AbsoluteFill>
      <OffthreadVideo src={staticFile(b.broll_file)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.12 - f * 0.0009})` }} />
      <AbsoluteFill style={{ background: b.v === 'cta'
        ? 'rgba(6,11,24,.68)'
        : 'linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.05) 22%, rgba(0,0,0,.08) 45%, rgba(0,0,0,.55) 68%, rgba(0,0,0,.85) 100%)' }} />
    </AbsoluteFill>}
    {b.v === 'cta' ? <Cta b={b} /> : <>
      {b.v === 'number' && <div style={{ position: 'absolute', top: 820, left: 40, right: 40, textAlign: 'center', fontSize: Math.min(230, Math.floor(950 / (String(b.value).length * 0.6))), fontWeight: 800, color: '#fff', letterSpacing: -6, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, textShadow: '0 10px 40px rgba(0,0,0,.5)' }}>{b.value}</div>}
      {lines.length > 0 && <div style={{ position: 'absolute', top: b.v === 'number' ? 1090 : 1030, left: 50, right: 50, textAlign: 'center' }}>
        {lines.map((l, k) => { const q = io(f, 3 + k * 4, 16 + k * 4, 0, 1); return <div key={k} style={{ fontSize: b.v === 'number' ? Math.min(size, 64) : size, fontWeight: 800, lineHeight: 1.08, letterSpacing: -size * 0.03, color: '#fff', whiteSpace: 'nowrap', opacity: q, transform: `translateY(${(1 - q) * 24}px)`, textShadow: '0 6px 30px rgba(0,0,0,.55)' }}><Accent text={l} /></div>; })}
      </div>}
      {b.v === 'number' && b.sub && <div style={{ position: 'absolute', top: 1190, left: 80, right: 80, textAlign: 'center', color: 'rgba(255,255,255,.85)', fontSize: 40, fontWeight: 600, opacity: p, textShadow: '0 4px 20px rgba(0,0,0,.6)' }}>{String(b.sub).replace(/\*/g, '')}</div>}
    </>}
    <Captions b={b} />
  </AbsoluteFill>;
};

// ── Vidéos pub : nuage de mots (le problème) et écrans de l'appli animés (la solution) ──
const Words = ({ b }) => {
  const f = useCurrentFrame(), items = (b.items || []).slice(0, 8);
  const spots = [[90, 700], [560, 640], [300, 860], [700, 900], [120, 1060], [520, 1110], [260, 1280], [640, 1320]];
  return <>{items.map((w, k) => {
    const d = 4 + k * 4, p = io(f, d, d + 12, 0, 1, Easing.out(Easing.back(1.6)));
    const [x, y] = spots[k % spots.length], fy = Math.sin((f + k * 20) / 16) * 10;
    return <div key={k} style={{ position: 'absolute', left: x, top: y + fy, padding: '22px 38px', borderRadius: 999, background: k % 3 === 0 ? 'rgba(52,211,153,.14)' : C.glass,
      border: `1.5px solid ${k % 3 === 0 ? 'rgba(52,211,153,.45)' : C.line}`, color: C.text, fontSize: 50, fontWeight: 700, letterSpacing: -1, opacity: p, transform: `scale(${0.6 + p * 0.4}) rotate(${(k % 2 ? 1 : -1) * 3}deg)`,
      boxShadow: '0 20px 60px rgba(0,0,0,.35)', whiteSpace: 'nowrap' }}>{w}</div>;
  })}</>;
};

const Phone = ({ children }) => {
  const f = useCurrentFrame(), p = io(f, 0, 16, 0, 1);
  return <div style={{ position: 'absolute', top: 400, left: 215, width: 650, height: 1040, borderRadius: 78, background: '#0d1424', border: '12px solid #1c2638',
    boxShadow: '0 60px 140px rgba(0,0,0,.6), 0 0 0 2px rgba(255,255,255,.06), 0 0 120px rgba(52,211,153,.18)', overflow: 'hidden', opacity: p, transform: `translateY(${(1 - p) * 80}px) scale(${0.94 + p * 0.06})` }}>
    <div style={{ position: 'absolute', top: 18, left: '50%', marginLeft: -70, width: 140, height: 34, borderRadius: 20, background: '#05080f' }} />
    <div style={{ position: 'absolute', inset: 0, padding: '86px 38px 30px' }}>{children}</div>
  </div>;
};
const ScreenTitle = ({ text, badge }) => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
  <div style={{ color: C.text, fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>{text}</div>
  {badge && <div style={{ color: C.green, background: 'rgba(52,211,153,.14)', borderRadius: 999, padding: '8px 18px', fontSize: 22, fontWeight: 700 }}>{badge}</div>}
</div>;

const PortfolioScreen = () => {
  const f = useCurrentFrame();
  const rows = [['ETF Monde', 'PEA', 12400, C.green, 50], ['ETF S&P 500', 'Compte-titres', 7150, C.green2, 29], ['Actions France', 'PEA', 5310, '#a78bfa', 21]];
  const total = Math.round(24860 * io(f, 6, 30, 0, 1));
  return <>
    <ScreenTitle text="Mon portefeuille" badge="Exemple" />
    <div style={{ color: C.muted, fontSize: 26, fontWeight: 600 }}>Valeur totale</div>
    <div style={{ color: C.text, fontSize: 92, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05, margin: '6px 0 26px' }}>{total.toLocaleString('fr-FR').replace(/\s/g, ' ')} €</div>
    <div style={{ display: 'flex', height: 26, borderRadius: 13, overflow: 'hidden', background: 'rgba(255,255,255,.06)', marginBottom: 34 }}>
      {rows.map((r, k) => <div key={k} style={{ width: `${r[4] * io(f, 14 + k * 4, 34 + k * 4, 0, 1)}%`, background: r[3] }} />)}
    </div>
    {rows.map((r, k) => { const p = io(f, 20 + k * 6, 34 + k * 6, 0, 1); return <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '26px 0', borderTop: `1.5px solid ${C.line}`, opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: r[3], flex: 'none' }} />
      <div style={{ flex: 1 }}><div style={{ color: C.text, fontSize: 36, fontWeight: 700 }}>{r[0]}</div><div style={{ color: C.faint, fontSize: 24 }}>{r[1]} · {r[4]} %</div></div>
      <div style={{ color: C.text, fontSize: 36, fontWeight: 700 }}>{r[2].toLocaleString('fr-FR').replace(/\s/g, ' ')} €</div>
    </div>; })}
  </>;
};

const ScoreScreen = () => {
  const f = useCurrentFrame(), p = io(f, 6, 40, 0, 1), R = 150, L = 2 * Math.PI * R;
  const bars = [['Diversification', 70], ['Concentration', 58], ["Part d'ETF", 86]];
  return <>
    <ScreenTitle text="Santé du portefeuille" />
    <div style={{ position: 'relative', width: 360, height: 360, margin: '10px auto 30px' }}>
      <svg width="360" height="360" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stopColor={C.green} /><stop offset="1" stopColor={C.green2} /></linearGradient></defs>
        <circle cx="180" cy="180" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="26" />
        <circle cx="180" cy="180" r={R} fill="none" stroke="url(#sg)" strokeWidth="26" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - 0.78 * p)} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.text, fontSize: 110, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>{(7.8 * p).toFixed(1).replace('.', ',')}<span style={{ fontSize: 44, color: C.muted, fontWeight: 600 }}> /10</span></div>
        <div style={{ color: C.green, fontSize: 32, fontWeight: 700, marginTop: 6, opacity: io(f, 30, 42, 0, 1) }}>Bon</div>
      </div>
    </div>
    {bars.map((r, k) => { const q = io(f, 24 + k * 6, 46 + k * 6, 0, 1); return <div key={k} style={{ marginBottom: 22, opacity: Math.min(1, q * 2) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: C.text, fontSize: 28, fontWeight: 600, marginBottom: 10 }}><span>{r[0]}</span><span style={{ color: C.muted }}>{Math.round(r[1] * q)} %</span></div>
      <div style={{ height: 16, borderRadius: 8, background: 'rgba(255,255,255,.07)' }}><div style={{ height: '100%', width: `${r[1] * q}%`, borderRadius: 8, background: GRAD }} /></div>
    </div>; })}
    <div style={{ marginTop: 18, padding: '18px 24px', borderRadius: 20, background: 'rgba(52,211,153,.1)', border: '1.5px solid rgba(52,211,153,.35)', color: C.text, fontSize: 28, fontWeight: 600, opacity: io(f, 50, 62, 0, 1) }}>🎯 Priorité : diversifier un peu plus</div>
  </>;
};

const CHAT_Q = 'Mon portefeuille est-il trop concentré ?';
const CHAT_A = 'Une seule ligne pèse 38 % de ton portefeuille. Au-delà de 20 à 25 %, une mauvaise nouvelle peut peser lourd : un ETF diversifié réduit ce risque.';
const ChatScreen = ({ dur }) => {
  const f = useCurrentFrame(), q = io(f, 6, 16, 0, 1, Easing.out(Easing.back(1.4)));
  const typing = f >= 18 && f < 34, end = Math.max(60, dur - 12), n = Math.round(CHAT_A.length * io(f, 34, end, 0, 1, Easing.linear));
  return <>
    <ScreenTitle text="Assistant IA" badge="En français" />
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
      <div style={{ maxWidth: 470, padding: '24px 30px', borderRadius: '34px 34px 8px 34px', background: GRAD, color: '#04120c', fontSize: 32, fontWeight: 700, lineHeight: 1.3, opacity: q, transform: `scale(${0.8 + q * 0.2})`, transformOrigin: 'right bottom' }}>{CHAT_Q}</div>
    </div>
    <div style={{ display: 'flex', gap: 16, marginTop: 34, alignItems: 'flex-start', opacity: io(f, 16, 22, 0, 1) }}>
      <div style={{ width: 62, height: 62, borderRadius: 18, background: 'rgba(52,211,153,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, flex: 'none' }}>✦</div>
      <div style={{ maxWidth: 480, padding: '24px 30px', borderRadius: '8px 34px 34px 34px', background: C.glass, border: `1.5px solid ${C.line}`, color: C.text, fontSize: 31, fontWeight: 500, lineHeight: 1.38, minHeight: 60 }}>
        {typing ? <span style={{ letterSpacing: 6, color: C.muted }}>{'•••'.slice(0, 1 + Math.floor(f / 4) % 3)}</span> : CHAT_A.slice(0, n)}
      </div>
    </div>
  </>;
};

const AppScene = ({ b }) => <>
  <Reveal lines={b.lines} top={175} max={84} />
  <Phone>{b.screen === 'score' ? <ScoreScreen /> : b.screen === 'chat' ? <ChatScreen dur={b.dur} /> : <PortfolioScreen />}</Phone>
</>;

const Scene = ({ b }) => {
  const f = useCurrentFrame(), last = b.i === beats.length - 1;
  const inP = io(f, 0, 8, 0, 1), outP = last ? 1 : io(f, b.dur - 5, b.dur, 1, 0, Easing.in(Easing.cubic));
  const o = Math.min(inP, outP), s = 1.015 - 0.015 * inP + f * 0.0004;
  const icon = b.icon && ICONS.includes(b.icon) ? b.icon : null;
  let body;
  switch (b.v) {
    case 'number': body = <>{icon && <Icon3D name={icon} top={330} size={210} />}<BigNumber value={b.value} top={icon ? 620 : 640} /><Muted text={b.sub} top={icon ? 920 : 940} size={50} delay={8} /></>; break;
    case 'chart': body = <><Reveal lines={b.lines} top={370} max={92} /><Chart b={b} top={560} /></>; break;
    case 'compare': body = <><Reveal lines={b.lines} top={420} max={96} /><Compare b={b} top={680} /></>; break;
    case 'steps': case 'list': body = <><Reveal lines={b.lines} top={440} max={100} /><Items b={b} top={700} numbered={b.v === 'steps'} /></>; break;
    case 'market': body = <><Reveal lines={b.lines && b.lines.length ? b.lines : ['La semaine', 'des *marchés*']} top={330} max={100} /><Market b={b} top={620} /></>; break;
    case 'agenda': body = <><Reveal lines={b.lines && b.lines.length ? b.lines : ['À suivre', 'cette *semaine*']} top={330} max={100} /><Agenda b={b} top={620} /></>; break;
    case 'warn': body = <><Icon3D name="warning" top={380} size={220} /><Reveal lines={b.lines} top={680} max={140} /><Muted text={b.sub || 'Investir comporte un risque de perte en capital.'} top={1010} size={40} delay={10} /></>; break;
    case 'quote': body = <><div style={{ position: 'absolute', top: 430, left: 0, right: 0, textAlign: 'center', fontSize: 220, lineHeight: 1, fontWeight: 800, backgroundImage: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', opacity: io(f, 0, 12, 0, 0.9) }}>“</div><Reveal lines={b.lines} top={680} max={100} weight={600} /><Muted text={b.sub} top={1080} /></>; break;
    case 'cta': body = <Cta b={b} />; break;
    case 'words': body = <><Reveal lines={b.lines} top={360} max={110} /><Words b={b} /></>; break;
    case 'app': body = <AppScene b={b} />; break;
    default: body = <>{icon && <Icon3D name={icon} top={400} size={240} />}<Reveal lines={b.lines} top={icon ? 740 : 620} max={b.v === 'hook' ? 130 : 120} /><Muted text={b.sub} top={icon ? 1080 : 1000} /></>;
  }
  return <AbsoluteFill style={{ opacity: o, filter: o < 1 ? `blur(${(1 - o) * 8}px)` : 'none', transform: `scale(${s})` }}>{b.broll_file && <Broll file={b.broll_file} />}{body}<Captions b={b} /></AbsoluteFill>;
};

const Header = () => {
  const f = useCurrentFrame();
  return <>
    <div style={{ position: 'absolute', top: 30, left: 60, right: 60, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.1)' }}>
      <div style={{ height: '100%', width: `${(f / totalFrames) * 100}%`, borderRadius: 3, background: GRAD }} />
    </div>
    <div style={{ position: 'absolute', top: 70, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
      <Img src={staticFile('logo.svg')} style={{ width: 48, height: 48, borderRadius: 12 }} />
      <span style={{ color: C.text, fontSize: 32, fontWeight: 600, opacity: 0.85 }}>Kapitaro</span>
    </div>
  </>;
};

export const Reel = () => (
  <AbsoluteFill style={{ fontFamily, background: C.bg }}>
    {data.style !== 'real' && <Background />}
    {beats.map(b => <Sequence key={b.i} from={b.from} durationInFrames={b.dur}>{data.style === 'real' ? <RealScene b={b} /> : <Scene b={b} />}</Sequence>)}
    {(data.segments || []).map((s, k) => <Sequence key={'v' + k} from={Math.round(s.start * FPS)}><Audio src={staticFile(s.file)} /></Sequence>)}
    {data.musicFile && <Audio src={staticFile(data.musicFile)} volume={f => { const end = data.jingle && beats.length ? JINGLE_AT : totalFrames - 30; return interpolate(f, [0, 15, end - 20, end + 10], [0, 0.1, 0.1, data.jingle ? 0 : 0.04], clamp) * (data.jingle ? 1 : interpolate(f, [totalFrames - 45, totalFrames], [1, 0], clamp)); }} />}
    {/* Jingle Kapitaro (signature sonore) sur la scène de fin, si public/jingle.mp3 est présent */}
    {data.jingle && beats.length > 0 && <Sequence from={JINGLE_AT}><Audio src={staticFile('jingle.mp3')} volume={0.55} /></Sequence>}
    <Header />
  </AbsoluteFill>
);
