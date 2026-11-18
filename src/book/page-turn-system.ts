import { type Entity, GrabSystem, Grabbed, Vector3, createSystem } from '@iwsdk/core';

import { CornerHandle, Leaf, LeafState } from './book-components.js';

// Turning a page by hand.
// IWSDK's GrabSystem detects the pinch on a corner handle (the Grabbed tag).
// This system then makes the leaf follow the hand around the spine, and on
// release lets it finish the turn past halfway, or fall back before halfway.

/** How fast a released page eases to its side (higher is faster). */
const EASE_RATE = 5.5;
/** The longest frame step we accept, so a long pause never makes a page jump. */
const MAX_DELTA = 0.05;
/** Near the spine a tiny hand move is a huge angle, so those frames are skipped. */
const MIN_RADIUS = 0.03;

type Hand = 'left' | 'right';

interface ActiveGrab {
  leaf: Entity;
  hand: Hand;
  previousHandAngle: number;
}

/** Events other systems listen to: "lift" when a page is picked up, "land" when it settles. */
export const bookEvents = new EventTarget();

export class PageTurnSystem extends createSystem({
  leaves: { required: [Leaf] },
  heldHandles: { required: [CornerHandle, Grabbed] },
}) {
  private readonly handWorld = new Vector3();
  private readonly handLocal = new Vector3();
  private readonly grabs = new Map<Entity, ActiveGrab>();

  init(): void {
    this.queries.heldHandles.subscribe('qualify', (handle) => this.onGrab(handle));
    this.queries.heldHandles.subscribe('disqualify', (handle) => this.onRelease(handle));
  }

  private handAngle(leaf: Entity, hand: Hand): number | null {
    const book = leaf.object3D?.parent;
    if (!book) return null;
    this.player.indexTipSpaces[hand].getWorldPosition(this.handWorld);
    this.handLocal.copy(this.handWorld);
    book.worldToLocal(this.handLocal);
    // The spine is the book's Z axis, so the angle lives in the X/Y plane.
    if (Math.hypot(this.handLocal.x, this.handLocal.y) < MIN_RADIUS) return null;
    return Math.atan2(this.handLocal.y, this.handLocal.x);
  }

  private onGrab(handle: Entity): void {
    const leaf = handle.getValue(CornerHandle, 'leaf');
    if (!leaf) return;
    const grabSystem = this.world.getSystem(GrabSystem);
    const hand: Hand = grabSystem?.getHolderHand(handle) ?? 'right';
    const angle = this.handAngle(leaf, hand);
    this.grabs.set(handle, { leaf, hand, previousHandAngle: angle ?? 0 });
    leaf.setValue(Leaf, 'state', LeafState.Held);
    bookEvents.dispatchEvent(new CustomEvent('lift', { detail: { leaf } }));
  }

  private onRelease(handle: Entity): void {
    const grab = this.grabs.get(handle);
    if (!grab) return;
    this.grabs.delete(handle);
    const { leaf } = grab;
    const angle = leaf.getValue(Leaf, 'angle') as number;
    const target =
      angle > Math.PI / 2
        ? (leaf.getValue(Leaf, 'restLeft') as number)
        : (leaf.getValue(Leaf, 'restRight') as number);
    leaf.setValue(Leaf, 'target', target);
    leaf.setValue(Leaf, 'state', LeafState.Settling);
  }

  update(delta: number): void {
    const dt = Math.min(delta, MAX_DELTA);

    // Held leaves follow the hand, one small angle step per frame.
    for (const grab of this.grabs.values()) {
      const handAngle = this.handAngle(grab.leaf, grab.hand);
      if (handAngle === null) continue;
      const step = Math.atan2(
        Math.sin(handAngle - grab.previousHandAngle),
        Math.cos(handAngle - grab.previousHandAngle),
      );
      grab.previousHandAngle = handAngle;
      const low = grab.leaf.getValue(Leaf, 'restRight') as number;
      const high = grab.leaf.getValue(Leaf, 'restLeft') as number;
      const angle = grab.leaf.getValue(Leaf, 'angle') as number;
      grab.leaf.setValue(Leaf, 'angle', Math.min(high, Math.max(low, angle + step)));
    }

    // Released leaves ease to their side, then land.
    for (const leaf of this.queries.leaves.entities) {
      if (leaf.getValue(Leaf, 'state') === LeafState.Settling) {
        const angle = leaf.getValue(Leaf, 'angle') as number;
        const target = leaf.getValue(Leaf, 'target') as number;
        const next = angle + (target - angle) * (1 - Math.exp(-EASE_RATE * dt));
        if (Math.abs(target - next) < 0.0015) {
          leaf.setValue(Leaf, 'angle', target);
          leaf.setValue(Leaf, 'state', LeafState.Rest);
          bookEvents.dispatchEvent(new CustomEvent('land', { detail: { leaf } }));
        } else {
          leaf.setValue(Leaf, 'angle', next);
        }
      }
      const pivot = leaf.object3D;
      if (pivot) pivot.rotation.z = leaf.getValue(Leaf, 'angle') as number;
    }
  }
}
