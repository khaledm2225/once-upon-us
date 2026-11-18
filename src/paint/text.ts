// Text is drawn on canvas textures in Atkinson Hyperlegible Next,
// only after the browser has the font, so it never falls back to another font.

export const FONT_FAMILY = '"Atkinson Hyperlegible Next"';

export async function loadFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load(`400 48px ${FONT_FAMILY}`),
    document.fonts.load(`600 48px ${FONT_FAMILY}`),
    document.fonts.load(`700 48px ${FONT_FAMILY}`),
  ]);
}

export function setFont(
  ctx: CanvasRenderingContext2D,
  sizePx: number,
  weight: 400 | 700 = 400,
): void {
  ctx.font = `${weight} ${sizePx}px ${FONT_FAMILY}`;
}

/** Draws one line centered at x, with its baseline at y. */
export function drawCenteredLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  sizePx: number,
  color: string,
  weight: 400 | 700 = 400,
): void {
  setFont(ctx, sizePx, weight);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

/** Shrinks the font until the line fits the width. Returns the size used. */
export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  weight: 400 | 700 = 400,
): number {
  let size = startPx;
  setFont(ctx, size, weight);
  while (size > 8 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    setFont(ctx, size, weight);
  }
  return size;
}
