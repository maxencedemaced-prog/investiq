// Bandeau animé de la lettre du dimanche (GIF 600 × 220, joué une fois) : une courbe qui se dessine en montant.
// Rendu une seule fois : npx remotion render src/index.js EmailHero ../email/hero.gif --codec=gif --every-nth-frame=2 --number-of-gif-loops=0 --scale=0.5
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont('normal', { weights: ['600', '800'], subsets: ['latin', 'latin-ext'] });
const W = 1200, H = 440;
// Courbe de croissance avec quelques creux (réaliste, jamais une ligne droite)
const PTS = [0, 0.06, 0.04, 0.13, 0.11, 0.2, 0.27, 0.23, 0.34, 0.42, 0.38, 0.5, 0.58, 0.55, 0.68, 0.76, 0.72, 0.84, 0.93];
const X0 = 560, X1 = 1150, Y0 = 370, Y1 = 90;
const pt = k => [X0 + (X1 - X0) * k / (PTS.length - 1), Y0 - (Y0 - Y1) * PTS[k]];

export const EmailHero = () => {
  const f = useCurrentFrame();
  const p = interpolate(f, [4, 54], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const n = (PTS.length - 1) * p, full = Math.floor(n), frac = n - full;
  const pts = [];
  for (let k = 0; k <= full; k++) pts.push(pt(k));
  if (full < PTS.length - 1) { const a = pt(full), b = pt(full + 1); pts.push([a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]); }
  const line = pts.map((q, k) => (k ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('');
  const end = pts[pts.length - 1];
  const area = line + `L${end[0].toFixed(1)},${Y0}L${X0},${Y0}Z`;
  const t = interpolate(f, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const pulse = 1 + Math.sin(f / 4) * 0.12;
  return (
    <AbsoluteFill style={{ fontFamily, background: 'linear-gradient(135deg, #060b18 0%, #0b1a33 60%, #0a2a2a 100%)' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="ln" x1="0" x2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
          <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399" stopOpacity="0.35" /><stop offset="1" stopColor="#34d399" stopOpacity="0" /></linearGradient>
        </defs>
        {[0, 1, 2, 3].map(k => <line key={k} x1={X0} x2={X1} y1={Y1 + k * (Y0 - Y1) / 3} y2={Y1 + k * (Y0 - Y1) / 3} stroke="rgba(255,255,255,0.08)" strokeWidth="2" />)}
        <path d={area} fill="url(#ar)" />
        <path d={line} fill="none" stroke="url(#ln)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={end[0]} cy={end[1]} r={26 * pulse} fill="#22d3ee" opacity="0.18" />
        <circle cx={end[0]} cy={end[1]} r="11" fill="#22d3ee" />
      </svg>
      <div style={{ position: 'absolute', left: 64, top: 70, opacity: t, transform: `translateY(${(1 - t) * 16}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Img src={staticFile('logo.svg')} style={{ width: 58, height: 58, borderRadius: 15 }} />
          <span style={{ color: '#e8eef3', fontSize: 36, fontWeight: 600 }}>Kapitaro</span>
        </div>
        <div style={{ color: '#fff', fontSize: 80, fontWeight: 800, letterSpacing: -2, lineHeight: 1.02, marginTop: 34 }}>Ta semaine</div>
        <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: -2, lineHeight: 1.02, backgroundImage: 'linear-gradient(90deg, #34d399, #22d3ee)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>en 2 minutes</div>
      </div>
    </AbsoluteFill>
  );
};
export const EMAIL_HERO = { width: W, height: H, fps: 30, durationInFrames: 66 };
