import type { Entity } from '@iwsdk/core';

import { Leaf, LeafState } from '../book/book-components.js';
import { type Gift, giftHash } from '../story/personalize.js';

// Pause and resume: the current page is saved on the device after every page
// lands, keyed by the gift, so two gift books never mix. It is kept out of the
// link, so a shared link always opens at the cover. Storage can be blocked
// (for example in private browsing), so every call is wrapped in try/catch.

const KEY_PREFIX = 'once-upon-us:page:';

function key(gift: Gift): string {
  return KEY_PREFIX + (giftHash(gift) || 'default');
}

/** How many leaves are turned to the left: 0 is the closed book. */
export function turnedCount(leaves: Iterable<Entity>): number {
  let count = 0;
  for (const leaf of leaves) {
    if ((leaf.getValue(Leaf, 'angle') as number) > Math.PI / 2) count++;
  }
  return count;
}

export function savePage(gift: Gift, page: number): void {
  try {
    localStorage.setItem(key(gift), String(page));
  } catch {
    // Storage is blocked: the book still works, it just won't remember the page.
  }
}

export function loadPage(gift: Gift, leafCount: number): number {
  try {
    const value = Number.parseInt(localStorage.getItem(key(gift)) ?? '0', 10);
    return Number.isFinite(value) ? Math.min(leafCount, Math.max(0, value)) : 0;
  } catch {
    return 0;
  }
}

/** Opens the book to a saved page at once, with no replay. */
export function restorePage(leaves: Entity[], page: number): void {
  leaves.forEach((leaf, index) => {
    const angle = index < page ? (leaf.getValue(Leaf, 'restLeft') as number) : (leaf.getValue(Leaf, 'restRight') as number);
    leaf.setValue(Leaf, 'angle', angle);
    leaf.setValue(Leaf, 'target', angle);
    leaf.setValue(Leaf, 'state', LeafState.Rest);
    if (leaf.object3D) leaf.object3D.rotation.z = angle;
  });
}
