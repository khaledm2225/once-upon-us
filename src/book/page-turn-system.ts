import { type Entity, GrabSystem, Grabbed, Pressed, Vector3, createSystem } from '@iwsdk/core';

import { CornerHandle, Leaf, LeafState, TurnTab } from './book-components.js';
import { isBusy, topLeftLeaf, topRightLeaf } from './book-state.js';

// Turning a page by hand.
// IWSDK's GrabSystem detects the pinch on a corner handle (the Grabbed tag).
// This system then makes the leaf follow the hand around the spine, and on
// release lets it finish the turn past halfway, or fall back before halfway.

/** The longest frame step we accept, so a long pause never makes a page jump. */
const MAX_DELTA = 0.05;
/**
 * The hand's height above the page is never counted below this, so a flat,
 * low drag across the spine still turns the page smoothly instead of snapping.
 */
const MIN_LIFT = 0.05;
/** Hand tracking is noisy: one frame may move a page at most this far (radians). */
const MAX_STEP = 0.2;
/** A released or poked page settles in this time, easing in and out (seconds). */
const SETTLE_MIN = 0.55;
const SETTLE_PER_HALF_TURN = 0.55;
/** Feedback with no glow: a page lifts a little under the hand, a little more when pinched. */
const HOVER_LIFT = 0.045;
const PINCH_LIFT = 0.08;
const LIFT_RATE = 10;

type Hand = 'left' | 'right';

interface ActiveGrab {
  leaf: Entity;
  hand: Hand;
  previousHandAngle: number;
}

interface Settle {
  from: number;
  to: number;
  elapsed: number;
  duration: number;
}

/** Events other systems listen to: "lift" when a page is picked up, "land" when it settles. */
export const bookEvents = new EventTarget();

/** An extra lift on the closed cover, set by OnboardingSystem to invite a pinch. */
let coverInvite = 0;
export function setCoverInvite(angle: number): void {
  coverInvite = angle;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Which way is "toward the middle of the book" for a leaf at this angle. */
function towardMiddle(angle: number): number {
  return angle > Math.PI / 2 ? -1 : 1;
}

export class PageTurnSystem extends createSystem({
  leaves: { required: [Leaf] },
  handles: { required: [CornerHandle] },
  heldHandles: { required: [CornerHandle, Grabbed] },
  pressedTabs: { required: [TurnTab, Pressed] },
}) {
  private readonly handWorld = new Vector3();
  private readonly handLocal = new Vector3();
  private readonly grabs = new Map<Entity, ActiveGrab>();
  private readonly settles = new Map<Entity, Settle>();
  private readonly hoverCount = new Map<Entity, number>();
  private readonly lift = new Map<Entity, number>();

  init(): void {
    this.queries.heldHandles.subscribe('qualify', (handle) => this.onGrab(handle));
    this.queries.heldHandles.subscribe('disqualify', (handle) => this.onRelease(handle));
    // Hover feedback: IWSDK's grab pointer sends pointerenter and pointerleave
    // to the handle when a hand comes near it.
    this.queries.handles.subscribe('qualify', (handle) => {
      const leaf = handle.getValue(CornerHandle, 'leaf');
      const object = handle.object3D;
      if (!leaf || !object) return;
      const change = (by: number) => this.hoverCount.set(leaf, Math.max(0, (this.hoverCount.get(leaf) ?? 0) + by));
      object.addEventListener('pointerenter' as never, () => change(1));
      object.addEventListener('pointerleave' as never, () => change(-1));
    });
  }

  private handAngle(leaf: Entity, hand: Hand): number | null {
    const book = leaf.object3D?.parent;
    if (!book) return null;
    this.player.indexTipSpaces[hand].getWorldPosition(this.handWorld);
    this.handLocal.copy(this.handWorld);
    book.worldToLocal(this.handLocal);
    // The spine is the book's Z axis, so the angle lives in the X/Y plane.
    return Math.atan2(Math.max(this.handLocal.y, MIN_LIFT), this.handLocal.x);
  }

  private onGrab(handle: Entity): void {
    const leaf = handle.getValue(CornerHandle, 'leaf');
    if (!leaf) return;
    const grabSystem = this.world.getSystem(GrabSystem);
    const hand: Hand = grabSystem?.getHolderHand(handle) ?? 'right';
    // One page at a time, even when two pinches land in the same moment or a
    // pinch lands while a fingertip is poking a tab: such a grab is let go at once.
    let otherMoving = false;
    for (const other of this.queries.leaves.entities) {
      if (other !== leaf && other.getValue(Leaf, 'state') !== LeafState.Rest) otherMoving = true;
    }
    // Only a real poke in progress counts: IWSDK's touch mode starts 15 cm away,
    // which would also block normal pinches near a tab.
    const poking = this.queries.pressedTabs.entities.size > 0;
    if (otherMoving || poking || leaf.getValue(Leaf, 'state') === LeafState.Settling) {
      grabSystem?.forceRelease(handle);
      return;
    }
    const angle = this.handAngle(leaf, hand);
    this.grabs.set(handle, { leaf, hand, previousHandAngle: angle ?? 0 });
    this.settles.delete(leaf);
    leaf.setValue(Leaf, 'state', LeafState.Held);
    // The pinch is confirmed at once: the page lifts a little toward the middle.
    const current = leaf.getValue(Leaf, 'angle') as number;
    this.setAngle(leaf, current + towardMiddle(current) * PINCH_LIFT);
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

  /** Sets a leaf's angle, kept between its two rest angles. */
  private setAngle(leaf: Entity, angle: number): void {
    const low = leaf.getValue(Leaf, 'restRight') as number;
    const high = leaf.getValue(Leaf, 'restLeft') as number;
    leaf.setValue(Leaf, 'angle', Math.min(high, Math.max(low, angle)));
  }

  update(delta: number): void {
    const dt = Math.min(delta, MAX_DELTA);

    // Held leaves follow the hand, one small, capped angle step per frame.
    for (const grab of this.grabs.values()) {
      const handAngle = this.handAngle(grab.leaf, grab.hand);
      if (handAngle === null) continue;
      const raw = Math.atan2(
        Math.sin(handAngle - grab.previousHandAngle),
        Math.cos(handAngle - grab.previousHandAngle),
      );
      grab.previousHandAngle = handAngle;
      const step = Math.min(MAX_STEP, Math.max(-MAX_STEP, raw));
      this.setAngle(grab.leaf, (grab.leaf.getValue(Leaf, 'angle') as number) + step);
    }

    for (const leaf of this.queries.leaves.entities) {
      // Released or poked leaves ease in and out to their side, then land.
      if (leaf.getValue(Leaf, 'state') === LeafState.Settling) {
        let settle = this.settles.get(leaf);
        const to = leaf.getValue(Leaf, 'target') as number;
        if (!settle || settle.to !== to) {
          const from = leaf.getValue(Leaf, 'angle') as number;
          settle = {
            from,
            to,
            elapsed: 0,
            duration: SETTLE_MIN + SETTLE_PER_HALF_TURN * (Math.abs(to - from) / (Math.PI / 2)),
          };
          this.settles.set(leaf, settle);
        }
        settle.elapsed += dt;
        const t = Math.min(1, settle.elapsed / settle.duration);
        leaf.setValue(Leaf, 'angle', settle.from + (settle.to - settle.from) * smoothstep(t));
        if (t >= 1) {
          this.settles.delete(leaf);
          leaf.setValue(Leaf, 'state', LeafState.Rest);
          bookEvents.dispatchEvent(new CustomEvent('land', { detail: { leaf } }));
        }
      }

      // Hover lift: only for a resting page, eased, and drawn on top of the real angle.
      const angle = leaf.getValue(Leaf, 'angle') as number;
      const resting = leaf.getValue(Leaf, 'state') === LeafState.Rest;
      const wanted = resting && (this.hoverCount.get(leaf) ?? 0) > 0 ? HOVER_LIFT * towardMiddle(angle) : 0;
      const current = this.lift.get(leaf) ?? 0;
      const lift = current + (wanted - current) * (1 - Math.exp(-LIFT_RATE * dt));
      this.lift.set(leaf, lift);
      const pivot = leaf.object3D;
      const invite = resting && (leaf.getValue(Leaf, 'index') as number) === 0 ? coverInvite : 0;
      if (pivot) pivot.rotation.z = angle + lift + invite;
    }

    // One page at a time: only the top page on each side can be grabbed,
    // and nothing new can start while a page is held or still easing.
    // Hidden handles are skipped by IWSDK's pointers; the held one stays live.
    const leaves = this.queries.leaves.entities;
    const busy = isBusy(leaves);
    const right = busy ? null : topRightLeaf(leaves);
    const left = busy ? null : topLeftLeaf(leaves);
    for (const handle of this.queries.handles.entities) {
      const leaf = handle.getValue(CornerHandle, 'leaf');
      const live = handle.hasComponent(Grabbed) || (leaf !== null && (leaf === right || leaf === left));
      if (handle.object3D) handle.object3D.visible = live;
      // A hidden handle gets no pointerleave, so its hover is cleared here.
      if (!live && leaf) this.hoverCount.set(leaf, 0);
    }
  }
}
