import { createSystem } from '@iwsdk/core';

import { Leaf } from '../book/book-components.js';
import { PopLayer } from './popup-components.js';

// The pop-up effect. No timers: every layer half reads how open its spread is.
// opening of spread k = angle of leaf k−1 minus angle of leaf k (0 to π).
// stand = opening ÷ π, so a half open page means a half standing scene,
// and closing the page folds the scene flat again.

/** Below this opening the spread is closed, so its layers are hidden. */
const HIDE_BELOW = 0.04;

export class PopUpSystem extends createSystem({
  leaves: { required: [Leaf] },
  layers: { required: [PopLayer] },
}) {
  /** Leaf angles by index, refreshed every frame. */
  private readonly angles: number[] = [];

  /** How open spread k is, from 0 (closed) to π (flat open). */
  spreadOpening(spread: number): number {
    const left = this.angles[spread - 1];
    const right = this.angles[spread];
    if (left === undefined || right === undefined) return 0;
    return Math.min(Math.PI, Math.max(0, left - right));
  }

  update(): void {
    for (const leaf of this.queries.leaves.entities) {
      this.angles[leaf.getValue(Leaf, 'index') as number] = leaf.getValue(Leaf, 'angle') as number;
    }
    for (const layer of this.queries.layers.entities) {
      const object = layer.object3D;
      if (!object) continue;
      const opening = this.spreadOpening(layer.getValue(PopLayer, 'spread') as number);
      object.visible = opening > HIDE_BELOW;
      if (!object.visible) continue;
      const stand = (opening / Math.PI) * (layer.getValue(PopLayer, 'fullStand') as number);
      // 0 lies flat, folded back toward the far edge; 1 stands straight up.
      object.rotation.x = -(Math.PI / 2) * (1 - stand);
    }
  }
}
