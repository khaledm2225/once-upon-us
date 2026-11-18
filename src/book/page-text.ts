import {
  type CanvasTexture,
  type Entity,
  Group,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  type World,
} from '@iwsdk/core';

import { LAYOUT } from '../layout.js';
import { setFont } from '../paint/text.js';
import { COLORS, makeCanvas, paintPaper, toTexture } from '../paint/textures.js';
import { story } from '../story/story.js';
import { TextLine } from './text-components.js';
import type { Book } from './book.js';

// The printed words: each story page's text in the lower band of the left
// page under its scene, and the dedication on the last page.
// All text is Atkinson Hyperlegible Next, drawn after the font has loaded.
//
// Each line is printed on its own see-through strip lying on the page, so the
// lines can appear one by one like film titles (TextRevealSystem).

export const PAGE_PX = { w: 768, h: 960 } as const;
const MARGIN = 64;
/** Lines float this far off the paper, so they never flicker into it. */
const LIFT = 0.0003;

export interface TextStyle {
  /** Font size in canvas pixels for story text. */
  size: number;
  ink: string;
  paper: string;
}

export const NORMAL_TEXT: TextStyle = { size: 46, ink: COLORS.ink, paper: COLORS.paper };

/** One shared paper grain, painted once and used by every printed page. */
let grainCanvas: HTMLCanvasElement | null = null;
export function paperBase(paper: string): HTMLCanvasElement {
  if (!grainCanvas || grainCanvas.dataset.paper !== paper) {
    const [canvas, ctx] = makeCanvas(PAGE_PX.w, PAGE_PX.h);
    paintPaper(ctx, PAGE_PX.w, PAGE_PX.h, paper, 13);
    canvas.dataset.paper = paper;
    grainCanvas = canvas;
  }
  return grainCanvas;
}

/** Splits text into lines that fit the width. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Wraps a sentence into as few lines as fit, then evens them out, so a
 * sentence never ends on one lonely word.
 */
function balancedWrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const count = wrap(ctx, text, maxWidth).length;
  if (count < 2) return [text];
  let low = 0;
  let high = maxWidth;
  while (high - low > 2) {
    const mid = (low + high) / 2;
    if (wrap(ctx, text, mid).length > count) low = mid;
    else high = mid;
  }
  return wrap(ctx, text, high);
}

/** A printed line on its page: its words and its baseline in page pixels. */
interface PlacedLine {
  text: string;
  baseline: number;
}

/** Story text: each sentence balanced, set in the lower band of the page. */
function layoutStory(ctx: CanvasRenderingContext2D, paragraphs: readonly string[], style: TextStyle): PlacedLine[] {
  setFont(ctx, style.size, 400);
  const lines = paragraphs.flatMap((p) => balancedWrap(ctx, p, PAGE_PX.w - MARGIN * 2));
  const lineHeight = style.size * 1.42;
  const bottom = PAGE_PX.h - MARGIN * 1.1;
  const top = bottom - lineHeight * (lines.length - 1);
  return lines.map((text, i) => ({ text, baseline: top + i * lineHeight }));
}

/**
 * The dedication, centered on the page. A long one steps down in size until
 * it fits inside the margins, never smaller than the story text.
 */
function layoutDedication(
  ctx: CanvasRenderingContext2D,
  paragraphs: readonly string[],
  style: TextStyle,
): { size: number; lines: PlacedLine[] } {
  let size = Math.round(style.size * 1.1);
  let groups: string[][] = [];
  let total = 0;
  const measure = () => {
    setFont(ctx, size, 400);
    groups = paragraphs.map((p) => balancedWrap(ctx, p, PAGE_PX.w - MARGIN * 2));
    total = groups.reduce((sum, g) => sum + g.length * size * 1.42, 0) + size * 0.7 * (groups.length - 1);
  };
  measure();
  while (total > PAGE_PX.h - MARGIN * 2 && size > style.size) {
    size -= 2;
    measure();
  }
  const lineHeight = size * 1.42;
  const gap = size * 0.7;
  let y = (PAGE_PX.h - total) / 2 + size;
  const lines: PlacedLine[] = [];
  for (const group of groups) {
    for (const text of group) {
      lines.push({ text, baseline: y });
      y += lineHeight;
    }
    y += gap;
  }
  return { size, lines };
}

/** Where a page lies: which object it sits on, its size, and which face. */
interface PageFace {
  parent: Entity;
  width: number;
  depth: number;
  /** The paper surface height in the parent's frame. */
  surfaceY: number;
  back: boolean;
}

/** One printed line, ready to fade in. */
export interface LineSlot {
  /** 0 to 4: story pages; 5: the dedication. */
  page: number;
  order: number;
  group: Group;
  material: MeshLambertMaterial;
  restZ: number;
  back: boolean;
  entity: Entity;
}

export const DEDICATION_PAGE = 5;

export interface BookText {
  lines: LineSlot[];
  setDedication(paragraphs: readonly string[]): void;
}

/**
 * Prints the text into the book. Spread k's text sits on its left page, the
 * back face of leaf k−1 (the inside of the cover for spread 1). The
 * dedication lies on the inside of the back cover, the last page.
 */
export function printBookText(world: World, book: Book, style: TextStyle = NORMAL_TEXT): BookText {
  const [, measureCtx] = makeCanvas(8, 8);
  const lines: LineSlot[] = [];

  const addLines = (page: number, face: PageFace, placed: PlacedLine[], size: number) => {
    const height = Math.round(size * 1.6);
    const baselineInStrip = Math.round(size * 1.15);
    placed.forEach((line, order) => {
      const [canvas, ctx] = makeCanvas(PAGE_PX.w, height);
      setFont(ctx, size, 400);
      ctx.fillStyle = style.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(line.text, PAGE_PX.w / 2, baselineInStrip);
      const texture: CanvasTexture = toTexture(canvas);
      // Upload now, so a page's words never stutter in when it opens.
      world.renderer.initTexture(texture);
      const material = new MeshLambertMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0 });
      const strip = new Mesh(new PlaneGeometry(1, 1), material);
      strip.scale.set(face.width, (height / PAGE_PX.h) * face.depth, 1);

      const group = new Group();
      group.name = `text-${page}-${order}`;
      group.add(strip);
      // Same placement as album prints: front faces look up, back faces are
      // read after their sheet turns half around the spine.
      if (face.back) group.rotation.set(Math.PI / 2, 0, Math.PI);
      else group.rotation.set(-Math.PI / 2, 0, 0);
      const centerPx = line.baseline - baselineInStrip + height / 2;
      const restZ = -face.depth / 2 + (centerPx / PAGE_PX.h) * face.depth;
      group.position.set(face.width / 2, face.back ? face.surfaceY - LIFT : face.surfaceY + LIFT, restZ);
      group.visible = false;
      const entity = world.createTransformEntity(group, { parent: face.parent });
      entity.addComponent(TextLine, { page });
      lines.push({ page, order, group, material, restZ, back: face.back, entity });
    });
  };

  // Story pages: the back face of leaf 0 (the cover) to leaf 4.
  const coverWidth = LAYOUT.page.width + LAYOUT.cover.overhang;
  const coverDepth = LAYOUT.page.depth + 2 * LAYOUT.cover.overhang;
  story.pages.forEach((page, i) => {
    const face: PageFace = {
      parent: book.leaves[i],
      width: i === 0 ? coverWidth : LAYOUT.page.width,
      depth: i === 0 ? coverDepth : LAYOUT.page.depth,
      surfaceY: 0,
      back: true,
    };
    addLines(i, face, layoutStory(measureCtx, page.text, style), style.size);
  });

  // The dedication page: plain paper on the inside of the back cover.
  const paper = new Mesh(
    new PlaneGeometry(LAYOUT.page.width, LAYOUT.page.depth),
    new MeshLambertMaterial({ map: toTexture(paperBase(style.paper)) }),
  );
  paper.name = 'dedication-page';
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(LAYOUT.page.width / 2, 0.0003, 0);
  world.createTransformEntity(paper, { parent: book.entity });
  const dedicationFace: PageFace = {
    parent: book.entity,
    width: LAYOUT.page.width,
    depth: LAYOUT.page.depth,
    surfaceY: 0.0003,
    back: false,
  };

  const setDedication = (paragraphs: readonly string[]) => {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.page !== DEDICATION_PAGE) continue;
      line.material.map?.dispose();
      line.entity.dispose();
      lines.splice(i, 1);
    }
    const { size, lines: placed } = layoutDedication(measureCtx, paragraphs, style);
    addLines(DEDICATION_PAGE, dedicationFace, placed, size);
  };
  setDedication(story.dedication);

  return { lines, setDedication };
}
