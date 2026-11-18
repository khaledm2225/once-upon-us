import type { Entity } from '@iwsdk/core';

import { Leaf, LeafState } from './book-components.js';

// Small shared questions about the book, used by the turn and tab systems.

/** True while any page is held or still easing: then nothing else may start. */
export function isBusy(leaves: Iterable<Entity>): boolean {
  for (const leaf of leaves) {
    if (leaf.getValue(Leaf, 'state') !== LeafState.Rest) return true;
  }
  return false;
}

export function isTurned(leaf: Entity): boolean {
  return (leaf.getValue(Leaf, 'angle') as number) > Math.PI / 2;
}

/** The top page on the right: the lowest index that is not turned yet. */
export function topRightLeaf(leaves: Iterable<Entity>): Entity | null {
  let best: Entity | null = null;
  for (const leaf of leaves) {
    if (isTurned(leaf)) continue;
    if (!best || (leaf.getValue(Leaf, 'index') as number) < (best.getValue(Leaf, 'index') as number)) {
      best = leaf;
    }
  }
  return best;
}

/** The top page on the left: the highest index already turned. */
export function topLeftLeaf(leaves: Iterable<Entity>): Entity | null {
  let best: Entity | null = null;
  for (const leaf of leaves) {
    if (!isTurned(leaf)) continue;
    if (!best || (leaf.getValue(Leaf, 'index') as number) > (best.getValue(Leaf, 'index') as number)) {
      best = leaf;
    }
  }
  return best;
}

/** Turns a page by itself, as gently as a released page settles. */
export function startAutoTurn(leaf: Entity, toLeft: boolean): void {
  const target = toLeft
    ? (leaf.getValue(Leaf, 'restLeft') as number)
    : (leaf.getValue(Leaf, 'restRight') as number);
  leaf.setValue(Leaf, 'target', target);
  leaf.setValue(Leaf, 'state', LeafState.Settling);
}
