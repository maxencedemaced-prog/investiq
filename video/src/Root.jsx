import React from 'react';
import { Composition } from 'remotion';
import { Reel, totalFrames } from './Reel';
import { Story } from './Story';

export const Root = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={totalFrames} fps={30} width={1080} height={1920} />
    <Composition id="Story" component={Story} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
