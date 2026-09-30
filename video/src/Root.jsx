import React from 'react';
import { Composition } from 'remotion';
import { Reel, totalFrames } from './Reel';

export const Root = () => (
  <Composition id="Reel" component={Reel} durationInFrames={totalFrames} fps={30} width={1080} height={1920} />
);
