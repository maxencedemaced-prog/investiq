import React from 'react';
import { Composition } from 'remotion';
import { Reel, totalFrames } from './Reel';
import { Dossier, dossierFrames } from './Dossier';
import { Story } from './Story';
import { EmailHero, EMAIL_HERO } from './EmailHero';
import data from './data.json';

// Style « dossier » (fiche d'enquête) : même composition « Reel », autre gabarit
const dossier = data.style === 'dossier';

export const Root = () => (
  <>
    <Composition id="Reel" component={dossier ? Dossier : Reel} durationInFrames={dossier ? dossierFrames : totalFrames} fps={30} width={1080} height={1920} />
    <Composition id="EmailHero" component={EmailHero} {...EMAIL_HERO} />
    <Composition id="Story" component={Story} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
