import { createSystem } from '@iwsdk/core';

import { AlbumPrint } from './album-components.js';
import type { Album, PrintSlot } from './album-pages.js';
import { Leaf } from './book-components.js';
import { isBusy, topLeftLeaf, topRightLeaf } from './book-state.js';
import { playMemory } from '../sound/paper-sound.js';

// The album moves like a film of memories. When an album spread opens and
// the pages are still, its photos come one at a time: a photo rises above the
// spine, larger and leaning toward the reader, with its date printed under it.
// It rests there for a moment, then glides down to its place on the page,
// while the next photo rises. Once the pages are full, a slow camera move
// drifts into one photo, eases back out, and moves on to the next.
// The book itself never moves, and every motion is slow, so it stays
// comfortable in VR.

/** The first photo rises after this many seconds; each next one this much later. */
const FIRST_DELAY = 0.4;
const STEP = 4.2;
/** Seconds to fade in, to rest in front of the reader, and to glide down. */
const APPEAR = 0.8;
const SHOW = 2.4;
const GLIDE = 1.6;
/** Once a photo is in front, its date writes itself across it, left to right. */
const WRITE_DELAY = 0.15;
const WRITE = 1.1;
/** The written date fades out over this long as the photo starts down. */
const UNWRITE = 0.5;
/** The shown pose: this high above the page (meters), this close to the reader, this large. */
const RAISE = 0.12;
const TOWARD = 0.03;
const SHOWN_SCALE = 1.8;
/** How far a shown photo leans up toward the reader (radians). */
const LEAN = 0.8;
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
const easeInOut = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const clamp01 = (p: number) => Math.min(1, Math.max(0, p));

export class AlbumSystem extends createSystem({
  prints: { required: [AlbumPrint] },
  leaves: { required: [Leaf] },
}) {
  private readonly shown: PrintSlot[] = [];
  /** Prints whose rise has already played its sound on this spread. */
  private readonly sounded = new Set<PrintSlot>();
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
      this.sounded.clear();
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

    const filmStart = FIRST_DELAY + STEP * (this.shown.length - 1) + APPEAR + SHOW + GLIDE;
    // A page turning while a photo is in the air would cut through it, so
    // every photo lands on its page as soon as a turn starts.
    if (busy) this.clock = Math.max(this.clock, filmStart);
    const film = this.clock - filmStart;
    const focus = film > 0 ? Math.floor(film / HOLD) % this.shown.length : -1;
    const u = film > 0 ? (film % HOLD) / HOLD : 0;

    for (let order = 0; order < this.shown.length; order++) {
      const slot = this.shown[order];
      const t = this.clock - FIRST_DELAY - STEP * order;
      // Each photo's rise has its own warm note; a turn skips the rest.
      if (t >= 0 && !this.sounded.has(slot)) {
        this.sounded.add(slot);
        if (!busy && t < APPEAR) playMemory(order);
      }
      this.pose(slot, t);

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

  /**
   * Places one print along its path, t seconds after its turn began: it fades
   * in above the spine, rests there facing the reader, then glides down to
   * its place on the page. Page coordinates: x runs out from the spine, z
   * toward the reader, and y along the face normal (down on a back face).
   */
  private pose(slot: PrintSlot, t: number): void {
    const appear = easeOut(clamp01(t / APPEAR));
    // 1 while shown in front of the reader, 0 once down on the page.
    const up = 1 - easeInOut(clamp01((t - APPEAR - SHOW) / GLIDE));
    const side = slot.back ? -1 : 1;
    const g = slot.group;
    g.visible = appear > 0;
    slot.photoMaterial.opacity = appear;
    slot.frameMaterial.opacity = appear;
    g.position.x = slot.restX * (1 - up);
    g.position.z = slot.restZ + (TOWARD - slot.restZ) * up;
    g.position.y = slot.restY + side * RAISE * up;
    g.rotation.x = side * (-Math.PI / 2 + LEAN * up);
    g.scale.setScalar(1 + (SHOWN_SCALE - 1) * up * (0.9 + 0.1 * appear));

    // The date writes itself across the photo, then fades as it goes down.
    const write = easeInOut(clamp01((t - APPEAR - WRITE_DELAY) / WRITE));
    const keep = 1 - clamp01((t - APPEAR - SHOW) / UNWRITE);
    const title = slot.title;
    title.visible = write > 0 && keep > 0;
    slot.titleMaterial.opacity = Math.min(1, write * 1.5) * keep;
    const width = slot.titleWidth * Math.max(write, 0.001);
    title.scale.x = width;
    title.position.x = (width - slot.titleWidth) / 2;
    const map = slot.titleMaterial.map;
    if (map) map.repeat.x = Math.max(write, 0.001);
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
    slot.title.visible = false;
    slot.titleMaterial.opacity = 0;
    slot.photoMaterial.opacity = 0;
    slot.frameMaterial.opacity = 0;
  }
}
