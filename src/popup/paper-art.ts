import { seededRandom } from '../paint/textures.js';

// Small helpers to paint paper cut shapes on a canvas: a flat paper color,
// a fine grain clipped to the shape, and a slightly darker cut edge.
// Every scene layer is painted with these, so the whole book shares one look.

/** Winter knit colors (charcoal, navy, cream, camel, rust) and scene paper colors. */
export const PAPER = {
  charcoal: '#3a3633',
  navy: '#2f3546',
  cream: '#efe2c9',
  camel: '#b98f5e',
  rust: '#9c4a2a',
  terracotta: '#a8452a',
  olive: '#7d6a35',
  oliveDark: '#5e5128',
  sage: '#8a8a5c',
  bark: '#6e4a26',
  wood: '#c58a4f',
  ivory: '#f4ead8',
  skinShadow: '#c79a78',
  hairGray: '#b9b2aa',
  hairDark: '#3b2a22',
} as const;

export type Ctx = CanvasRenderingContext2D;

/** Grain dots clipped to the current path, so each shape looks like paper. */
function grain(ctx: Ctx, path: Path2D, seed: number, w: number, h: number): void {
  const random = seededRandom(seed);
  ctx.save();
  ctx.clip(path);
  const count = Math.floor((w * h) / 120);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = random() < 0.5 ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 245, 230, 0.06)';
    ctx.fillRect(random() * w, random() * h, 1 + random() * 1.4, 1 + random() * 1.4);
  }
  ctx.restore();
}

let shapeSeed = 1;

/** Fills a paper shape with color, grain and a darker cut edge. */
/** High contrast: every paper shape gets a thick, dark outline. */
const STRONG_EDGE = 'rgba(22, 12, 6, 0.9)';
let strongEdges = false;
export function setStrongEdges(on: boolean): void {
  strongEdges = on;
}

export function paperShape(
  ctx: Ctx,
  path: Path2D,
  color: string,
  options: { edge?: string; edgeWidth?: number } = {},
): void {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = color;
  ctx.fill(path);
  grain(ctx, path, shapeSeed++, width, height);
  ctx.strokeStyle = strongEdges ? STRONG_EDGE : (options.edge ?? 'rgba(40, 22, 12, 0.35)');
  ctx.lineWidth = strongEdges ? Math.max(5, (options.edgeWidth ?? 2) * 2.5) : (options.edgeWidth ?? 2);
  ctx.lineJoin = 'round';
  ctx.stroke(path);
}

/** A rounded rectangle path. */
export function roundRect(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
}

/** A soft row of cloud bumps along the top of a band, flat at the bottom. */
export function cloudBand(x0: number, x1: number, top: number, bottom: number, bump: number, seed: number): Path2D {
  const random = seededRandom(seed);
  const p = new Path2D();
  p.moveTo(x0, bottom);
  p.lineTo(x0, top + bump);
  let x = x0;
  while (x < x1) {
    const step = bump * (1.4 + random() * 1.2);
    const nx = Math.min(x1, x + step);
    p.quadraticCurveTo((x + nx) / 2, top - bump * (0.4 + random() * 0.8), nx, top + bump * (0.2 + random() * 0.6));
    x = nx;
  }
  p.lineTo(x1, bottom);
  p.closePath();
  return p;
}

/** Rolling hills: a wavy top edge from x0 to x1 above a flat bottom. */
export function hills(x0: number, x1: number, base: number, bottom: number, amp: number, waves: number, phase: number): Path2D {
  const p = new Path2D();
  p.moveTo(x0, bottom);
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = base - amp * (0.5 + 0.5 * Math.sin(t * Math.PI * waves + phase));
    if (i === 0) p.lineTo(x, y);
    else p.lineTo(x, y);
  }
  p.lineTo(x1, bottom);
  p.closePath();
  return p;
}

/**
 * A faceless standing figure seen from the front or back: head, body and
 * legs as soft paper shapes. Sizes are in canvas pixels; (x, footY) is the
 * point between the feet. Returns the body path, so stripes can be added.
 */
export function figure(
  ctx: Ctx,
  x: number,
  footY: number,
  height: number,
  colors: { coat: string; legs: string; hair: string; skin?: string },
  options: { dress?: boolean; hat?: string } = {},
): Path2D {
  const headR = height * 0.085;
  const shoulderY = footY - height * 0.78;
  const hipY = footY - height * 0.42;
  const bodyW = height * 0.27;

  const legs = new Path2D();
  legs.roundRect(x - bodyW * 0.32, hipY - 2, bodyW * 0.26, footY - hipY + 2, 3);
  legs.roundRect(x + bodyW * 0.06, hipY - 2, bodyW * 0.26, footY - hipY + 2, 3);
  if (!options.dress) paperShape(ctx, legs, colors.legs);

  const body = new Path2D();
  const hem = options.dress ? footY - height * 0.05 : hipY + height * 0.06;
  const flare = options.dress ? bodyW * 0.32 : 0;
  body.moveTo(x - bodyW * 0.42, shoulderY + headR * 0.4);
  body.quadraticCurveTo(x, shoulderY - headR * 0.35, x + bodyW * 0.42, shoulderY + headR * 0.4);
  body.lineTo(x + bodyW * 0.5 + flare, hem);
  body.quadraticCurveTo(x, hem + height * 0.03, x - bodyW * 0.5 - flare, hem);
  body.closePath();
  paperShape(ctx, body, colors.coat);

  const head = new Path2D();
  head.arc(x, shoulderY - headR * 0.9, headR, 0, Math.PI * 2);
  paperShape(ctx, head, colors.skin ?? colors.hair);
  if (colors.skin) {
    // Hair as a cap over the top of the head; no face is ever drawn.
    const hair = new Path2D();
    hair.arc(x, shoulderY - headR * 0.95, headR * 1.04, Math.PI * 1.02, Math.PI * 1.98);
    hair.closePath();
    paperShape(ctx, hair, colors.hair);
  }
  if (options.hat) {
    const hat = new Path2D();
    hat.roundRect(x - headR * 1.25, shoulderY - headR * 1.75, headR * 2.5, headR * 0.35, 3);
    hat.roundRect(x - headR * 0.8, shoulderY - headR * 2.45, headR * 1.6, headR * 0.8, 4);
    paperShape(ctx, hat, options.hat);
  }
  return body;
}

/** Horizontal knit stripes clipped to a body shape (charcoal, navy, cream, camel, rust). */
export function knitStripes(ctx: Ctx, body: Path2D, top: number, bottom: number, colors: string[], stripe: number): void {
  ctx.save();
  ctx.clip(body);
  let i = 0;
  for (let y = top; y < bottom; y += stripe) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(0, y, ctx.canvas.width, stripe * 0.55);
    i++;
  }
  ctx.restore();
}

/** A simple chair seen from the front, at (x, floorY), scaled by size. */
export function chair(ctx: Ctx, x: number, floorY: number, size: number, color: string): void {
  const p = new Path2D();
  const w = size * 0.5;
  p.roundRect(x - w / 2, floorY - size, w, size * 0.12, 3); // top rail
  p.roundRect(x - w / 2, floorY - size, size * 0.08, size, 2); // left post
  p.roundRect(x + w / 2 - size * 0.08, floorY - size, size * 0.08, size, 2); // right post
  p.roundRect(x - w / 2 - size * 0.04, floorY - size * 0.48, w + size * 0.08, size * 0.08, 2); // seat
  p.roundRect(x - w / 2, floorY - size * 0.75, w, size * 0.06, 2); // middle rail
  paperShape(ctx, p, color);
}

/** Small cream stars as tiny four point sparks. */
export function stars(ctx: Ctx, x0: number, x1: number, y0: number, y1: number, count: number, seed: number): void {
  const random = seededRandom(seed);
  ctx.fillStyle = 'rgba(244, 230, 200, 0.85)';
  for (let i = 0; i < count; i++) {
    const x = x0 + random() * (x1 - x0);
    const y = y0 + random() * (y1 - y0);
    const r = 1.5 + random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2);
    ctx.lineTo(x + r * 0.5, y);
    ctx.lineTo(x, y + r * 2);
    ctx.lineTo(x - r * 0.5, y);
    ctx.closePath();
    ctx.fill();
  }
}
