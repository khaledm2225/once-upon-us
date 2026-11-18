import { Pressed, createSystem } from '@iwsdk/core';

import { Leaf, TurnTab } from './book-components.js';
import { isBusy, startAutoTurn, topLeftLeaf, topRightLeaf } from './book-state.js';
import { bookEvents } from './page-turn-system.js';

// The big paper tabs, for weak hands or shaky fingers.
// A poke (IWSDK adds the Pressed tag) turns one page by itself.
// A poke while a page moves is ignored, and the finger has to leave the tab
// (Pressed removed) before the next poke can count.

export class TabSystem extends createSystem({
  leaves: { required: [Leaf] },
  pressedTabs: { required: [TurnTab, Pressed] },
}) {
  init(): void {
    this.queries.pressedTabs.subscribe('qualify', (tab) => {
      const leaves = this.queries.leaves.entities;
      if (isBusy(leaves)) return;
      const forward = (tab.getValue(TurnTab, 'direction') as number) > 0;
      const leaf = forward ? topRightLeaf(leaves) : topLeftLeaf(leaves);
      if (!leaf) return;
      startAutoTurn(leaf, forward);
      bookEvents.dispatchEvent(new CustomEvent('lift', { detail: { leaf } }));
    });
  }
}
