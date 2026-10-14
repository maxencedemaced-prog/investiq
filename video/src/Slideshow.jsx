// Vidéo « diaporama » d'un carrousel (Reel 1080 × 1920), fabriquée sur GitHub : chaque diapositive défile
// avec un léger zoom et un fondu, sur la musique choisie, puis une carte de fin Kapitaro.
// Données : src/data.json (slides = fichiers images dans public/, musicFile), écrit par render-job.mjs.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import data from './data.json';

const { fontFamily } = loadFont('normal', { weights: ['600', '800'], subsets: ['latin', 'latin-ext'] });
const FPS = 30, PER = Math.round((data.perSlide || 3.4) * FPS), END = 2 * FPS;
const slides = data.slides || [];
export const slideshowFrames = Math.max(1, slides.length) * PER + END;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

const Slide = ({ file, last }) => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, 10], [0, 1], clamp), last ? 1 : interpolate(f, [PER - 8, PER], [1, 0], clamp));
  const z = interpolate(f, [0, PER], [1, 1.06], { ...clamp, easing: Easing.inOut(Easing.quad) });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Img src={staticFile(file)} style={{ position: 'absolute', inset: -80, width: 'calc(100% + 160px)', height: 'calc(100% + 160px)', objectFit: 'cover', filter: 'blur(40px) brightness(.45)' }} />
      <div style={{ position: 'absolute', left: 40, top: 300, width: 1000, height: 1250, borderRadius: 36, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.55)', transform: `scale(${z})` }}>
        <Img src={staticFile(file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </AbsoluteFill>
  );
};

const EndCard = () => {
  const f = useCurrentFrame(), o = interpolate(f, [0, 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(160deg,#0b1220,#0f1f17)', alignItems: 'center', justifyContent: 'center', opacity: o, fontFamily, gap: 22 }}>
      <Img src={staticFile('logo.svg')} style={{ width: 170, height: 170, borderRadius: 40 }} />
      <div style={{ color: '#fff', fontSize: 76, fontWeight: 800 }}>Kapitaro</div>
      <div style={{ color: '#4ade80', fontSize: 42, fontWeight: 800 }}>kapitaro.fr</div>
    </AbsoluteFill>
  );
};

export const Slideshow = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#060b18', fontFamily }}>
      {slides.map((file, i) => <Sequence key={i} from={i * PER} durationInFrames={PER}><Slide file={file} last={i === slides.length - 1} /></Sequence>)}
      <Sequence from={slides.length * PER} durationInFrames={END}><EndCard /></Sequence>
      <div style={{ position: 'absolute', top: 40, left: 60, right: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.12)' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (f / slideshowFrames) * 100)}%`, borderRadius: 3, background: 'linear-gradient(90deg,#34d399,#22d3ee)' }} />
      </div>
      <div style={{ position: 'absolute', top: 90, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
        <Img src={staticFile('logo.svg')} style={{ width: 52, height: 52, borderRadius: 13 }} />
        <span style={{ color: '#f4f7fb', fontSize: 34, fontWeight: 600 }}>Kapitaro</span>
      </div>
      {data.musicFile && <Audio src={staticFile(data.musicFile)} volume={fr => interpolate(fr, [0, 15, slideshowFrames - 30, slideshowFrames], [0, 0.35, 0.35, 0], clamp)} />}
    </AbsoluteFill>
  );
};
