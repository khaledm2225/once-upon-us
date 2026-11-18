import { seededRandom } from '../../paint/textures.js';
import { getSettings } from '../../settings/settings.js';
import { type SceneDef, repaintScenes } from '../popup-builder.js';
import type { Ctx } from '../paper-art.js';

// The story pages show real photos: on each spread one photo, printed with a
// cream border, stands up from the fold as the page opens and folds flat as
// it closes. The story's own book shows the demo photos of the fictional
// Grace and Henry; a family's gift shows the family's own photos.

const STORY_PAGES = 5;
const PRINT_COLOR = '#f6efe1';

const images: (HTMLImageElement | null)[] = Array.from({ length: STORY_PAGES }, () => null);
/** Each new set of photos wins over a set that is still loading. */
let generation = 0;

/** Shows these photos on the story pages, one per page, in order. */
export function setStoryPhotos(sources: readonly string[]): void {
  const mine = ++generation;
  images.fill(null);
  sources.slice(0, STORY_PAGES).forEach((source, page) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = source;
    image
      .decode()
      .then(() => {
        if (mine !== generation) return;
        images[page] = image;
        repaintScenes(getSettings().highContrast);
      })
      .catch((error: unknown) => console.warn('A story photo could not load.', error));
  });
  repaintScenes(getSettings().highContrast);
}

/** Draws the page's photo as a print, centered on the fold; nothing until it loads. */
function paintPrint(ctx: Ctx, width: number, height: number, image: HTMLImageElement | null): void {
  if (!image) return;
  const border = Math.round(height * 0.045);
  const photoHeight = height - border * 2;
  const photoWidth = Math.round((photoHeight * image.naturalWidth) / image.naturalHeight);
  const printWidth = Math.min(width, photoWidth + border * 2);
  const x0 = Math.round((width - printWidth) / 2);
  ctx.fillStyle = PRINT_COLOR;
  ctx.fillRect(x0, 0, printWidth, height);
  const px = x0 + border;
  const pw = printWidth - border * 2;
  // An old print's look: warm, a little faded, darker at the corners, with
  // fine grain, like a photo kept in a drawer for years.
  ctx.save();
  ctx.filter = 'sepia(0.32) saturate(0.88) contrast(1.04) brightness(1.03)';
  ctx.drawImage(image, px, border, pw, photoHeight);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(224, 164, 88, 0.35)';
  ctx.fillRect(px, border, pw, photoHeight);
  ctx.restore();
  const cx = px + pw / 2;
  const cy = border + photoHeight / 2;
  const vignette = ctx.createRadialGradient(cx, cy, photoHeight * 0.35, cx, cy, Math.hypot(pw, photoHeight) * 0.62);
  vignette.addColorStop(0, 'rgba(40, 22, 10, 0)');
  vignette.addColorStop(1, 'rgba(40, 22, 10, 0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(px, border, pw, photoHeight);
  const grain = seededRandom(image.naturalWidth + image.naturalHeight);
  ctx.fillStyle = 'rgba(255, 244, 228, 0.05)';
  for (let i = 0; i < 1800; i++) ctx.fillRect(px + grain() * pw, border + grain() * photoHeight, 1.5, 1.5);
  ctx.strokeStyle = 'rgba(59, 36, 20, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 1, 1, printWidth - 2, height - 2);
}

/** The pop-up for story spread 1 to 5: one standing photo print. */
export function photoScene(spread: number): SceneDef {
  return {
    spread,
    layers: [
      {
        name: 'photo',
        // Its hinge sits on the page's middle line, so folded either way the
        // print (0.124 m, shown 1.2x) stays inside the 0.3 m deep page.
        z: -0.012,
        height: 0.124,
        paint: (ctx, width, height) => paintPrint(ctx, width, height, images[spread - 1]),
      },
    ],
  };
}
