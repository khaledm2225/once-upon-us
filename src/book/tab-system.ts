import { Box3, type Entity, Hovered, Pressed, Vector3, createSystem } from '@iwsdk/core';

import { Leaf, TurnTab } from './book-components.js';
import { isBusy, startAutoTurn, topLeftLeaf, topRightLeaf } from './book-state.js';
import { bookEvents } from './page-turn-system.js';

/** Both hands, kept as one list so loops make no garbage each frame. */
const HANDS = ['left', 'right'] as const;

// The big paper tabs, for weak hands or shaky fingers.
// A poke (IWSDK adds the Pressed tag) turns one page by itself.
// After a turn the tab rests: it works again only once every fingertip has
// moved clearly away from it, so a trembling finger can't turn page after page.

/** A fingertip must be this far from the tab before it can turn another page. */
const REARM_DISTANCE = 0.06;
/** After a page lands, pokes are ignored this long (seconds). */
const QUIET_AFTER_LAND = 0.5;
/** Paper feedback with no glow: lift on hover, sink on press (meters). */
const HOVER_RISE = 0.001;
const PRESS_SINK = -0.0025;
const FEEDBACK_RATE = 18;
/** Resting height of a tab above the hinge plane. */
const TAB_REST_Y = 0.003;

export class TabSystem extends createSystem({
  leaves: { required: [Leaf] },
  tabs: { required: [TurnTab] },
  pressedTabs: { required: [TurnTab, Pressed] },
}) {
  private readonly armed = new Map<Entity, boolean>();
  private readonly offset = new Map<Entity, number>();
  private readonly box = new Box3();
  private readonly tip = new Vector3();
  private quietUntil = 0;
  private now = 0;

  init(): void {
    this.queries.pressedTabs.subscribe('qualify', (tab) => this.onPoke(tab));
    bookEvents.addEventListener('land', () => {
      this.quietUntil = this.now + QUIET_AFTER_LAND;
    });
  }

  private onPoke(tab: Entity): void {
    const leaves = this.queries.leaves.entities;
    if (this.armed.get(tab) === false || this.now < this.quietUntil || isBusy(leaves)) return;
    const forward = (tab.getValue(TurnTab, 'direction') as number) > 0;
    const leaf = forward ? topRightLeaf(leaves) : topLeftLeaf(leaves);
    if (!leaf) return;
    this.armed.set(tab, false);
    startAutoTurn(leaf, forward);
    bookEvents.dispatchEvent(new CustomEvent('lift', { detail: { leaf, byTab: true } }));
  }

  /** Distance from the nearest index fingertip to the tab's box. */
  private nearestTip(tab: Entity): number {
    const object = tab.object3D;
    if (!object) return Infinity;
    this.box.setFromObject(object);
    let nearest = Infinity;
    for (const hand of HANDS) {
      this.player.indexTipSpaces[hand].getWorldPosition(this.tip);
      nearest = Math.min(nearest, this.box.distanceToPoint(this.tip));
    }
    return nearest;
  }

  update(delta: number): void {
    this.now += Math.min(delta, 0.05);
    const leaves = this.queries.leaves.entities;
    const hasForward = topRightLeaf(leaves) !== null;
    const hasBack = topLeftLeaf(leaves) !== null;

    for (const tab of this.queries.tabs.entities) {
      const object = tab.object3D;
      if (!object) continue;
      // A tab with no page to turn is hidden (and IWSDK's poke skips hidden objects).
      const forward = (tab.getValue(TurnTab, 'direction') as number) > 0;
      object.visible = forward ? hasForward : hasBack;

      if (this.armed.get(tab) === false && this.nearestTip(tab) > REARM_DISTANCE) {
        this.armed.set(tab, true);
      }

      const wanted = tab.hasComponent(Pressed) ? PRESS_SINK : tab.hasComponent(Hovered) ? HOVER_RISE : 0;
      const current = this.offset.get(tab) ?? 0;
      const next = current + (wanted - current) * (1 - Math.exp(-FEEDBACK_RATE * Math.min(delta, 0.05)));
      this.offset.set(tab, next);
      object.position.y = TAB_REST_Y + next;
    }
  }
}
