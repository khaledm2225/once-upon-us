import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  type WebGLRenderer,
} from '@iwsdk/core';

// Every texture in the app is painted here on an HTML canvas.
// Colors are calm base colors; the warm lamp light adds the warmth.

export const COLORS = {
  paper: '#efe2cc',
  paperEdge: '#e2cfae',
  coverCloth: '#5c2414',
  coverFoil: '#ecd7b4',
  tableWood: '#4a3121',
  wall: '#4a3022',
  floor: '#2e1d14',
  ink: '#3b2414',
} as const;

let maxAnisotropy = 1;

/** Call once after the renderer exists, so text stays sharp at a slant. */
export function setTextureQuality(renderer: WebGLRenderer): void {
  maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
}

export function makeCanvas(
  width: number,
  height: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  return [canvas, ctx];
}

/** A small seeded random, so every texture looks the same on every load. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * sharp = true gives text and paper the GPU's best angled filtering; floors,
 * walls, wood, cloth and shadows use a cheaper level.
 */
export function toTexture(canvas: HTMLCanvasElement, repeat = false, sharp = true): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = sharp ? maxAnisotropy : Math.min(4, maxAnisotropy);
  if (repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  }
  return texture;
}

/** Cream paper with fine speckles and a few soft fibers. */
export function paintPaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  base: string = COLORS.paper,
  seed = 7,
): void {
  const random = seededRandom(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  const specks = Math.floor((width * height) / 90);
  for (let i = 0; i < specks; i++) {
    const dark = random() < 0.55;
    ctx.fillStyle = dark
      ? `rgba(110, 80, 50, ${0.035 + random() * 0.04})`
      : `rgba(255, 250, 238, ${0.05 + random() * 0.05})`;
    const size = 0.6 + random() * 1.4;
    ctx.fillRect(random() * width, random() * height, size, size);
  }
  ctx.lineCap = 'round';
  const fibers = Math.floor((width * height) / 9000);
  for (let i = 0; i < fibers; i++) {
    const x = random() * width;
    const y = random() * height;
    const angle = random() * Math.PI * 2;
    const length = 6 + random() * 18;
    ctx.strokeStyle = `rgba(120, 90, 60, ${0.04 + random() * 0.05})`;
    ctx.lineWidth = 0.6 + random() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(angle + 0.6) * length * 0.5,
      y + Math.sin(angle + 0.6) * length * 0.5,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length,
    );
    ctx.stroke();
  }
}

export function paperTexture(size = 512, seed = 7): CanvasTexture {
  const [canvas, ctx] = makeCanvas(size, size);
  paintPaper(ctx, size, size, COLORS.paper, seed);
  return toTexture(canvas, true);
}

/** Book cloth: a tight woven grid over the base color. */
export function paintCloth(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  base: string = COLORS.coverCloth,
): void {
  const random = seededRandom(11);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  for (let y = 0; y < height; y += 2) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + random() * 0.05})`;
    ctx.fillRect(0, y, width, 1);
  }
  for (let x = 0; x < width; x += 2) {
    ctx.fillStyle = `rgba(255, 220, 190, ${0.03 + random() * 0.04})`;
    ctx.fillRect(x, 0, 1, height);
  }
  const slubs = Math.floor((width * height) / 400);
  for (let i = 0; i < slubs; i++) {
    ctx.fillStyle = random() < 0.5 ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 220, 190, 0.05)';
    ctx.fillRect(random() * width, random() * height, 2 + random() * 5, 1);
  }
}

export function clothTexture(size = 256): CanvasTexture {
  const [canvas, ctx] = makeCanvas(size, size);
  paintCloth(ctx, size, size);
  return toTexture(canvas, true, false);
}

/** Warm wood with long soft grain lines. */
export function woodTexture(width = 512, height = 512): CanvasTexture {
  const [canvas, ctx] = makeCanvas(width, height);
  const random = seededRandom(23);
  ctx.fillStyle = COLORS.tableWood;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 140; i++) {
    const y0 = random() * height;
    const amplitude = 2 + random() * 6;
    const wave = 0.004 + random() * 0.01;
    const phase = random() * Math.PI * 2;
    ctx.strokeStyle =
      random() < 0.6
        ? `rgba(30, 14, 6, ${0.08 + random() * 0.12})`
        : `rgba(150, 95, 60, ${0.06 + random() * 0.08})`;
    ctx.lineWidth = 0.6 + random() * 2.2;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = y0 + Math.sin(x * wave + phase) * amplitude;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(canvas, true, false);
}

/** Plain warm surface with very faint speckles, for walls and floor. */
export function surfaceTexture(base: string, seed: number, size = 256): CanvasTexture {
  const [canvas, ctx] = makeCanvas(size, size);
  const random = seededRandom(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < (size * size) / 60; i++) {
    ctx.fillStyle =
      random() < 0.5 ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 230, 200, 0.03)';
    ctx.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  return toTexture(canvas, true, false);
}

/**
 * A soft shadow painted once: a blurred dark rounded shape on a clear canvas.
 * Used on flat quads, so there are no real time shadows to compute.
 */
export function softShadowTexture(
  width: number,
  height: number,
  inset: number,
  blur: number,
  strength = 0.5,
): CanvasTexture {
  const [canvas, ctx] = makeCanvas(width, height);
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = `rgba(20, 8, 2, ${strength})`;
  const radius = Math.min(width, height) * 0.08;
  ctx.beginPath();
  ctx.roundRect(inset, inset, width - inset * 2, height - inset * 2, radius);
  ctx.fill();
  return toTexture(canvas, false, false);
}
