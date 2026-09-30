// Story d'actualité Kapitaro (image 1080 × 1920) : photo réelle du secteur, texte factuel par-dessus.
// Les données viennent de src/story.json, écrit par render-job.mjs.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import story from './story.json';

const { fontFamily } = loadFont('normal', { weights: ['500', '600', '700', '800'], subsets: ['latin', 'latin-ext'] });
const GRAD = 'linear-gradient(90deg, #34d399, #22d3ee)';
const size = (text, max, min, per) => Math.max(min, Math.min(max, Math.floor(max - Math.max(0, String(text || '').length - per) * 1.4)));

export const Story = () => {
  const s = story || {};
  const neg = /^[-−]/.test(String(s.value || '').trim());
  return (
    <AbsoluteFill style={{ fontFamily, background: '#060b18', color: '#fff' }}>
      {s.photo && <Img src={staticFile(s.photo)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(6,11,24,.65) 0%, rgba(6,11,24,.15) 26%, rgba(6,11,24,.35) 48%, rgba(6,11,24,.88) 70%, rgba(6,11,24,.97) 100%)' }} />

      <div style={{ position: 'absolute', top: 90, left: 70, right: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Img src={staticFile('logo.svg')} style={{ width: 60, height: 60, borderRadius: 16 }} />
          <span style={{ fontSize: 38, fontWeight: 700 }}>Kapitaro</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ padding: '10px 22px', borderRadius: 999, background: GRAD, color: '#04120c', fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>{s.kicker || 'ACTU'}</span>
          {s.when && <span style={{ fontSize: 30, fontWeight: 600, opacity: 0.85 }}>{s.when}</span>}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 70, right: 70, bottom: 230 }}>
        <div style={{ fontSize: size(s.company, 110, 70, 10), fontWeight: 800, letterSpacing: -2, lineHeight: 1, textTransform: 'uppercase', backgroundImage: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{s.company}</div>
        {s.value && <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -5, lineHeight: 1.05, marginTop: 10, color: neg ? '#fb7185' : '#34d399' }}>{s.value}</div>}
        <div style={{ fontSize: size(s.title, 68, 50, 30), fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5, marginTop: 28, textShadow: '0 4px 24px rgba(0,0,0,.5)' }}>{s.title}</div>
        {s.facts && <div style={{ fontSize: size(s.facts, 42, 34, 110), fontWeight: 500, lineHeight: 1.35, marginTop: 24, color: 'rgba(241,245,249,.9)' }}>{s.facts}</div>}
      </div>

      <div style={{ position: 'absolute', left: 70, right: 70, bottom: 90, borderTop: '2px solid rgba(255,255,255,.18)', paddingTop: 26, display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 26, color: 'rgba(226,232,240,.8)' }}>
        <span>{s.source ? 'Source : ' + s.source : ''}</span>
        <span>Info, pas un conseil en investissement.</span>
      </div>
    </AbsoluteFill>
  );
};
