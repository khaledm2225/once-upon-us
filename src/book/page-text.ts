import {
  type CanvasTexture,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  type World,
} from '@iwsdk/core';

import { LAYOUT } from '../layout.js';
import { FONT_FAMILY, setFont } from '../paint/text.js';
import { COLORS, makeCanvas, paintPaper, toTexture } from '../paint/textures.js';
import { story } from '../story/story.js';
import type { Book } from './book.js';

// The printed words: each story page's text in the lower band of the left
// page under its scene, and the dedication on the last page.
// All text is Atkinson Hyperlegible, drawn after the font has loaded.

const PAGE_PX = { w: 768, h: 960 } as const;
const MARGIN = 64;

export interface TextStyle {
  /** Font size in canvas pixels for story text. */
  size: number;
  ink: string;
  paper: string;
}

export const NORMAL_TEXT: TextStyle = { size: 46, ink: COLORS.ink, paper: COLORS.paper };

/** One shared paper grain, painted once and copied under every page's text. */
let grainCanvas: HTMLCanvasElement | null = null;
function paperBase(paper: string): HTMLCanvasElement {
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

/** Paints story lines in the lower band of a page, centered. */
export function paintStoryPage(texture: CanvasTexture, paragraphs: readonly string[], style: TextStyle): void {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(paperBase(style.paper), 0, 0);
  setFont(ctx, style.size, 400);
  const lines = paragraphs.flatMap((p) => wrap(ctx, p, PAGE_PX.w - MARGIN * 2));
  const lineHeight = style.size * 1.42;
  const bottom = PAGE_PX.h - MARGIN * 1.1;
  const top = bottom - lineHeight * (lines.length - 1);
  ctx.fillStyle = style.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => ctx.fillText(line, PAGE_PX.w / 2, top + i * lineHeight));
  texture.needsUpdate = true;
}

/** Paints the dedication, centered on the page. */
export function paintDedicationPage(texture: CanvasTexture, paragraphs: readonly string[], style: TextStyle): void {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(paperBase(style.paper), 0, 0);
  const size = Math.round(style.size * 1.1);
  setFont(ctx, size, 400);
  ctx.font = `400 ${size}px ${FONT_FAMILY}`;
  const groups = paragraphs.map((p) => wrap(ctx, p, PAGE_PX.w - MARGIN * 2));
  const lineHeight = size * 1.42;
  const gap = size * 0.7;
  const total = groups.reduce((sum, g) => sum + g.length * lineHeight, 0) + gap * (groups.length - 1);
  let y = (PAGE_PX.h - total) / 2 + size;
  ctx.fillStyle = style.ink;
  ctx.textAlign = 'center';
  for (const group of groups) {
    for (const line of group) {
      ctx.fillText(line, PAGE_PX.w / 2, y);
      y += lineHeight;
    }
    y += gap;
  }
  texture.needsUpdate = true;
}

export interface BookText {
  storyTextures: CanvasTexture[];
  dedicationTexture: CanvasTexture;
}

/**
 * Prints the text into the book. Spread k's text sits on its left page, the
 * back face of leaf k−1 (the inside of the cover for spread 1). The
 * dedication lies on the inside of the back cover, the last page.
 */
export function printBookText(world: World, book: Book, style: TextStyle = NORMAL_TEXT): BookText {
  const storyTextures = story.pages.map((page, i) => {
    const [canvas] = makeCanvas(PAGE_PX.w, PAGE_PX.h);
    const texture = toTexture(canvas);
    // The back face is seen after the page turns, so the print is rotated half a turn.
    texture.center.set(0.5, 0.5);
    texture.rotation = Math.PI;
    paintStoryPage(texture, page.text, style);
    const mesh = book.leafMeshes[i];
    const materials = mesh.material as MeshLambertMaterial[];
    // The cover keeps six faces (its back face is material 3); paper leaves use two (back is 1).
    materials[i === 0 ? 3 : 1] = new MeshLambertMaterial({ map: texture });
    return texture;
  });

  const [canvas] = makeCanvas(PAGE_PX.w, PAGE_PX.h);
  const dedicationTexture = toTexture(canvas);
  paintDedicationPage(dedicationTexture, story.dedication, style);
  const page = new Mesh(
    new PlaneGeometry(LAYOUT.page.width, LAYOUT.page.depth),
    new MeshLambertMaterial({ map: dedicationTexture }),
  );
  page.name = 'dedication-page';
  page.rotation.x = -Math.PI / 2;
  page.position.set(LAYOUT.page.width / 2, 0.0003, 0);
  world.createTransformEntity(page, { parent: book.entity });

  return { storyTextures, dedicationTexture };
}
