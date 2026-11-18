import { createSystem } from '@iwsdk/core';

import { readPage, stopSpeaking } from '../settings/read-aloud.js';
import { Leaf } from './book-components.js';
import { isBusy, topLeftLeaf, topRightLeaf } from './book-state.js';
import { type BookText, DEDICATION_PAGE, type LineSlot } from './page-text.js';
import { TextLine } from './text-components.js';

// The words appear like film titles. When a page with text opens and the
// pages are still, its lines fade in one after another, each rising a few
// millimeters into place. Slow and small, and the book never moves.

/** First line starts after this many seconds; each next one this much later. */
const FIRST_DELAY = 0.45;
const STAGGER = 0.55;
/** How long one line takes to appear (seconds). */
const APPEAR = 1.4;
/** How far below its place a line starts (meters, toward the reader). */
const RISE = 0.003;

let text: BookText | null = null;

/** Hands the printed text to the system once it is built. */
export function setBookText(next: BookText): void {
  text = next;
}

const easeOut = (p: number) => 1 - (1 - p) ** 3;

export class TextRevealSystem extends createSystem({
  lines: { required: [TextLine] },
  leaves: { required: [Leaf] },
}) {
  private openPage = -2;
  private clock = 0;

  init(): void {
    // Entering VR plays the open page's words again, for the reader to see.
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.openPage = -2;
    });
    this.renderer.xr.addEventListener('sessionend', () => stopSpeaking());
  }

  update(delta: number): void {
    if (!text) return;
    const leaves = this.queries.leaves.entities;
    const left = topLeftLeaf(leaves);
    const leftIndex = left ? (left.getValue(Leaf, 'index') as number) : -1;
    // The left page shows story page k on leaf k (0 to 4). With no page left
    // on the right, the book is open at its last page: the dedication.
    const atEnd = left !== null && topRightLeaf(leaves) === null;
    const page = atEnd ? DEDICATION_PAGE : leftIndex >= 0 && leftIndex < DEDICATION_PAGE ? leftIndex : -1;
    const busy = isBusy(leaves);

    if (page !== this.openPage) {
      if (busy) {
        // A turning page carries its words along; nothing new appears yet.
        for (const line of text.lines) if (line.page !== this.openPage) this.hide(line);
        return;
      }
      this.openPage = page;
      this.clock = 0;
      this.readAloud(page);
    }
    this.clock += Math.min(delta, 0.05);

    for (const line of text.lines) {
      if (line.page !== page) {
        if (!busy) this.hide(line);
        continue;
      }
      const p = Math.min(1, Math.max(0, (this.clock - FIRST_DELAY - STAGGER * line.order) / APPEAR));
      const e = easeOut(p);
      line.group.visible = e > 0;
      line.material.opacity = e;
      line.group.position.z = line.restZ + RISE * (1 - e);
    }
  }

  /** Reads the newly opened page's words, in order, if read aloud is on. */
  private readAloud(page: number): void {
    if (!text || page < 0) {
      stopSpeaking();
      return;
    }
    const words: string[] = [];
    for (const line of text.lines) if (line.page === page) words[line.order] = line.text;
    readPage(words.join(' '));
  }

  private hide(line: LineSlot): void {
    line.group.visible = false;
    line.material.opacity = 0;
  }
}
