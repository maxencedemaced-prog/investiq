import React from 'react';
import { Composition } from 'remotion';
import { Reel, totalFrames } from './Reel';
import { Dossier, dossierFrames } from './Dossier';
import { Slideshow, slideshowFrames } from './Slideshow';
import { Story } from './Story';
import { EmailHero, EMAIL_HERO } from './EmailHero';
import data from './data.json';

// Même composition « Reel », gabarit selon le style : fiche d'enquête (dossier), diaporama d'un carrousel, ou vidéo animée
const style = data.style;
const Comp = style === 'dossier' ? Dossier : style === 'slideshow' ? Slideshow : Reel;
const frames = style === 'dossier' ? dossierFrames : style === 'slideshow' ? slideshowFrames : totalFrames;

export const Root = () => (
  <>
    <Composition id="Reel" component={Comp} durationInFrames={frames} fps={30} width={1080} height={1920} />
    <Composition id="EmailHero" component={EmailHero} {...EMAIL_HERO} />
    <Composition id="Story" component={Story} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
