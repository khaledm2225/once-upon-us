import { type Entity, createSystem } from '@iwsdk/core';

import { Leaf } from '../book/book-components.js';
import { bookEvents } from '../book/page-turn-system.js';
import { PopUpSystem } from '../popup/popup-system.js';
import { playLift, playThump, playTurn, setRain } from './paper-sound.js';

// Plays the paper sounds at the right moments: a lift when a page is picked
// up, a rustle when it passes the middle, a thump when it lands, and rain
// while page 1 is open in VR.

export class PaperSoundSystem extends createSystem({
  leaves: { required: [Leaf] },
}) {
  private readonly side = new Map<Entity, boolean>();
  private lastRain = -1;

  init(): void {
    bookEvents.addEventListener('lift', () => playLift());
    bookEvents.addEventListener('land', () => playThump());
    this.renderer.xr.addEventListener('sessionend', () => {
      setRain(0);
      this.lastRain = 0;
    });
  }

  update(): void {
    for (const leaf of this.queries.leaves.entities) {
      const left = (leaf.getValue(Leaf, 'angle') as number) > Math.PI / 2;
      const before = this.side.get(leaf);
      if (before !== undefined && before !== left) playTurn();
      this.side.set(leaf, left);
    }
    const popups = this.world.getSystem(PopUpSystem);
    const opening = popups ? popups.spreadOpening(1) : 0;
    const rain = this.renderer.xr.isPresenting ? Math.min(1, Math.max(0, (opening - Math.PI * 0.4) / (Math.PI * 0.4))) : 0;
    // Only tell the audio when the level really changes.
    if (Math.abs(rain - this.lastRain) > 0.02) {
      this.lastRain = rain;
      setRain(rain);
    }
  }
}
