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
import { COLORS, LIGHT_PAPER, makeCanvas, paintPaper, toTexture } from '../paint/textures.js';
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
  weight: 400 | 700;
  ink: string;
  paper: string;
}

export const NORMAL_TEXT: TextStyle = { size: 46, weight: 400, ink: COLORS.ink, paper: COLORS.paper };

/** Near black ink for the stronger contrast setting. */
const STRONG_INK = '#160c06';

/** The text style for the reader's settings: bigger and bolder, darker, or both. */
export function textStyle(largeText: boolean, highContrast: boolean): TextStyle {
  return {
    size: largeText ? 76 : NORMAL_TEXT.size,
    weight: highContrast ? 700 : 400,
    ink: highContrast ? STRONG_INK : COLORS.ink,
    paper: highContrast ? LIGHT_PAPER : COLORS.paper,
  };
}

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

/** One GPU texture per paper color, shared by the album and dedication pages. */
const paperTextures = new Map<string, CanvasTexture>();
export function paperBaseTexture(paper: string): CanvasTexture {
  let texture = paperTextures.get(paper);
  if (!texture) {
    texture = toTexture(paperBase(paper));
    paperTextures.set(paper, texture);
  }
  return texture;
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

/** A printed line: its words, its baseline in page pixels, and its page. */
interface PlacedLine {
  text: string;
  baseline: number;
  /** True when large text continues the words on the right page. */
  right?: boolean;
}

/**
 * Story words stay in the band nearest the reader, in front of the standing
 * paper scene (its front layer stands about 4.7 cm from the spine, which is
 * 630 page pixels), so no line ever hides behind it.
 */
const STORY_BAND_TOP = 640;
const STORY_BOTTOM = PAGE_PX.h - 44;
const STORY_SIDE = 44;
const STORY_MIN_SIZE = 36;
/** Large text is at least this big: 1.5 times the normal 46 pixels. */
const LARGE_MIN_SIZE = 69;
const LARGE_SIDE = 34;

/**
 * Story text: each sentence balanced, in the lower band of the left page. If
 * the lines don't fit, the sentences flow together, and then the size steps
 * down until they fit.
 *
 * Large text never shrinks below 1.5 times normal: when it needs more room,
 * the words continue in the same band on the right page, like a real book.
 */
function layoutStory(
  ctx: CanvasRenderingContext2D,
  paragraphs: readonly string[],
  style: TextStyle,
  large: boolean,
): { size: number; lines: PlacedLine[] } {
  const width = PAGE_PX.w - (large ? LARGE_SIDE : STORY_SIDE) * 2;
  const minSize = large ? LARGE_MIN_SIZE : STORY_MIN_SIZE;
  const columns = large ? 2 : 1;
  for (let size = style.size; ; size -= 2) {
    setFont(ctx, size, style.weight);
    const lineHeight = size * (large ? 1.24 : 1.36);
    const perColumn = Math.max(1, Math.floor((STORY_BOTTOM - STORY_BAND_TOP - size) / lineHeight) + 1);
    let lines = paragraphs.flatMap((p) => balancedWrap(ctx, p, width));
    if (lines.length > perColumn * columns) {
      const joined = balancedWrap(ctx, paragraphs.join(' '), width);
      if (joined.length < lines.length) lines = joined;
    }
    if (lines.length <= perColumn * columns || size <= minSize) {
      if (lines.length <= perColumn) {
        // One column, resting on the page's bottom margin.
        const top = STORY_BOTTOM - lineHeight * (lines.length - 1);
        return { size, lines: lines.map((text, i) => ({ text, baseline: top + i * lineHeight })) };
      }
      // Two columns: the left page first, then the right, both from the band's top.
      const leftCount = Math.min(perColumn, Math.ceil(lines.length / 2));
      const first = STORY_BAND_TOP + size;
      return {
        size,
        lines: lines.map((text, i) => {
          const right = i >= leftCount;
          const row = right ? i - leftCount : i;
          return { text, baseline: first + row * lineHeight, right };
        }),
      };
    }
  }
}

/**
 * The dedication, centered on the page. A long one steps down in size until
 * it fits inside the margins, in every text setting.
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
    setFont(ctx, size, style.weight);
    groups = paragraphs.map((p) => balancedWrap(ctx, p, PAGE_PX.w - MARGIN * 2));
    total = groups.reduce((sum, g) => sum + g.length * size * 1.42, 0) + size * 0.7 * (groups.length - 1);
  };
  measure();
  while (total > PAGE_PX.h - MARGIN * 2 && size > STORY_MIN_SIZE) {
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
  /** The words on this line, for reading aloud. */
  text: string;
}

export const DEDICATION_PAGE = 5;

export interface BookText {
  lines: LineSlot[];
  setDedication(paragraphs: readonly string[]): void;
  /** Reprints every page in a new style (bigger text, stronger contrast). */
  restyle(next: TextStyle): void;
}

/**
 * Prints the text into the book. Spread k's text sits on its left page, the
 * back face of leaf k−1 (the inside of the cover for spread 1). The
 * dedication lies on the inside of the back cover, the last page.
 */
export function printBookText(world: World, book: Book, initial: TextStyle = NORMAL_TEXT): BookText {
  const [, measureCtx] = makeCanvas(8, 8);
  const lines: LineSlot[] = [];
  let style = initial;
  let dedicationText: readonly string[] = story.dedication;

  const addLines = (page: number, face: PageFace, placed: PlacedLine[], size: number, firstOrder = 0) => {
    const height = Math.round(size * 1.6);
    const baselineInStrip = Math.round(size * 1.15);
    placed.forEach((line, index) => {
      const order = firstOrder + index;
      const [canvas, ctx] = makeCanvas(PAGE_PX.w, height);
      setFont(ctx, size, style.weight);
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
      lines.push({ page, order, group, material, restZ, back: face.back, entity, text: line.text });
    });
  };

  const removeLines = (keep: (line: LineSlot) => boolean) => {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (keep(line)) continue;
      line.material.map?.dispose();
      line.entity.dispose();
      lines.splice(i, 1);
    }
  };

  // Story pages: the back face of leaf 0 (the cover) to leaf 4.
  const coverWidth = LAYOUT.page.width + LAYOUT.cover.overhang;
  const coverDepth = LAYOUT.page.depth + 2 * LAYOUT.cover.overhang;
  const printStory = () => {
    story.pages.forEach((page, i) => {
      const face: PageFace = {
        parent: book.leaves[i],
        width: i === 0 ? coverWidth : LAYOUT.page.width,
        depth: i === 0 ? coverDepth : LAYOUT.page.depth,
        surfaceY: 0,
        back: true,
      };
      const large = style.size >= LARGE_MIN_SIZE;
      const { size, lines: placed } = layoutStory(measureCtx, page.text, style, large);
      const left = placed.filter((line) => !line.right);
      addLines(i, face, left, size);
      // The right page of spread i + 1 is the front face of the next leaf.
      const right = placed.filter((line) => line.right);
      if (right.length > 0) {
        const rightFace: PageFace = {
          parent: book.leaves[i + 1],
          width: LAYOUT.page.width,
          depth: LAYOUT.page.depth,
          surfaceY: LAYOUT.page.thickness,
          back: false,
        };
        addLines(i, rightFace, right, size, left.length);
      }
    });
  };
  printStory();

  // The dedication page: plain paper on the inside of the back cover.
  const paperMaterial = new MeshLambertMaterial({ map: paperBaseTexture(style.paper) });
  const paper = new Mesh(new PlaneGeometry(LAYOUT.page.width, LAYOUT.page.depth), paperMaterial);
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
    dedicationText = paragraphs;
    removeLines((line) => line.page !== DEDICATION_PAGE);
    const { size, lines: placed } = layoutDedication(measureCtx, paragraphs, style);
    addLines(DEDICATION_PAGE, dedicationFace, placed, size);
  };
  setDedication(dedicationText);

  const restyle = (next: TextStyle) => {
    if (next.paper !== style.paper) {
      paperMaterial.map = paperBaseTexture(next.paper);
      paperMaterial.needsUpdate = true;
    }
    style = next;
    removeLines(() => false);
    printStory();
    setDedication(dedicationText);
  };

  return { lines, setDedication, restyle };
}
