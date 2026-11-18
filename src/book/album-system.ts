import { createSystem } from '@iwsdk/core';

import { AlbumPrint } from './album-components.js';
import type { Album, PrintSlot } from './album-pages.js';
import { Leaf } from './book-components.js';
import { isBusy, topLeftLeaf, topRightLeaf } from './book-state.js';

// The album moves like a film. When an album spread opens and the pages are
// still, its prints are set down one by one: each fades in while it settles
// from just above the paper. Then a slow camera move drifts into one photo,
// eases back out, and moves on to the next photo, again and again.
// Everything is slow and small, and the book itself never moves, so it stays
// comfortable in VR.

/** First print starts after this many seconds; each next one this much later. */
const FIRST_DELAY = 0.35;
const STAGGER = 0.5;
/** How long one print takes to settle (seconds). */
const SETTLE = 1.0;
/** How high above the paper a print starts (meters), and how much larger. */
const DROP = 0.012;
const GROW = 0.04;
/** Each photo gets this long in the slow camera move (seconds). */
const HOLD = 7;
/** How far the camera move zooms in at its closest. */
const ZOOM = 0.14;

let album: Album | null = null;

/** Hands the album to the system once it is built. */
export function setAlbum(next: Album): void {
  album = next;
}

const easeOut = (p: number) => 1 - (1 - p) ** 3;

export class AlbumSystem extends createSystem({
  prints: { required: [AlbumPrint] },
  leaves: { required: [Leaf] },
}) {
  private readonly shown: PrintSlot[] = [];
  private spreadKey = -1;
  private clock = 0;

  init(): void {
    // Entering VR plays the open spread's film again, for the reader to see.
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.spreadKey = -1;
    });
  }

  update(delta: number): void {
    if (!album) return;
    const leaves = this.queries.leaves.entities;
    const right = topRightLeaf(leaves);
    const left = topLeftLeaf(leaves);
    const rightIndex = right ? (right.getValue(Leaf, 'index') as number) : -1;
    const leftIndex = left ? (left.getValue(Leaf, 'index') as number) : -1;
    const busy = isBusy(leaves);

    // A new spread restarts the film, once the pages are still.
    const key = (leftIndex + 1) * 16 + (rightIndex + 1);
    if (key !== this.spreadKey) {
      if (busy) return this.holdMoving(leftIndex, rightIndex);
      this.spreadKey = key;
      this.clock = 0;
    }
    this.clock += Math.min(delta, 0.05);

    // The prints on the two open pages, in reading order: the left page
    // (back faces) first, then the right page; slots are already top to bottom.
    this.shown.length = 0;
    for (const slot of album.slots) {
      if (slot.back && slot.leaf === leftIndex && slot.hasPhoto) this.shown.push(slot);
    }
    for (const slot of album.slots) {
      if (!slot.back && slot.leaf === rightIndex && slot.hasPhoto) this.shown.push(slot);
    }
    for (const slot of album.slots) {
      if (this.shown.includes(slot)) continue;
      if (!busy || !slot.group.visible) this.hide(slot);
    }
    if (this.shown.length === 0) return;

    const filmStart = FIRST_DELAY + STAGGER * (this.shown.length - 1) + SETTLE;
    const film = this.clock - filmStart;
    const focus = film > 0 ? Math.floor(film / HOLD) % this.shown.length : -1;
    const u = film > 0 ? (film % HOLD) / HOLD : 0;

    for (let order = 0; order < this.shown.length; order++) {
      const slot = this.shown[order];
      const p = Math.min(1, Math.max(0, (this.clock - FIRST_DELAY - STAGGER * order) / SETTLE));
      const e = easeOut(p);
      // A print draws only once its own fade has begun.
      slot.group.visible = e > 0;
      slot.photoMaterial.opacity = e;
      slot.frameMaterial.opacity = e;
      slot.group.position.y = slot.restY + (slot.back ? -1 : 1) * DROP * (1 - e);
      slot.group.scale.setScalar(1 + GROW * (1 - e));

      // In, then out, with no sudden start or stop: sin² over the photo's turn.
      const zoom = order === focus ? 1 + ZOOM * Math.sin(Math.PI * u) ** 2 : 1;
      const map = slot.photoMaterial.map;
      if (map) {
        const size = 1 / zoom;
        map.repeat.set(size, size);
        map.offset.set((1 - size) * slot.anchor.x, (1 - size) * slot.anchor.y);
      }
    }
  }

  /** While a page turns, prints already showing ride along with their page. */
  private holdMoving(leftIndex: number, rightIndex: number): void {
    if (!album) return;
    for (const slot of album.slots) {
      const wasOpen = slot.group.visible;
      const stillOpen = slot.back ? slot.leaf === leftIndex : slot.leaf === rightIndex;
      if (!wasOpen && !stillOpen) this.hide(slot);
    }
  }

  private hide(slot: PrintSlot): void {
    slot.group.visible = false;
    slot.photoMaterial.opacity = 0;
    slot.frameMaterial.opacity = 0;
  }
}
