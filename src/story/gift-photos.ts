import type { AlbumPhoto } from './album.js';

// The family's photos live on the site's own small server: Cloudflare Pages
// Functions with a D1 database, on the free plan. Each photo is shrunk in the
// browser first (at most 1024 pixels on its longest side) and sent as JPEG
// text (base64). The server answers with a long random id, and that id goes
// in the gift link, so only people with the link can open the photos.

const API = '/api/gifts';
const MAX_SIDE = 1024;
const QUALITY = 0.82;
/** Behind see-through parts of a photo, like the print it becomes. */
const BACKDROP = '#f6efe1';

export interface PhotoToSave {
  file: File;
  date: string;
}

/** Loads a gift's saved photos, in order, ready for the album. */
export async function fetchGiftAlbum(id: string): Promise<AlbumPhoto[]> {
  const response = await fetch(`${API}/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`The photo list answered ${response.status}.`);
  const { photos } = (await response.json()) as { photos: { n: number; date: string }[] };
  const loaded = await Promise.allSettled(
    photos.map(async ({ n, date }) => {
      const photo = await fetch(`${API}/${encodeURIComponent(id)}/photos/${n}`);
      if (!photo.ok) throw new Error(`Photo ${n} answered ${photo.status}.`);
      return { src: `data:image/jpeg;base64,${await photo.text()}`, date };
    }),
  );
  return loaded.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}

/** Shrinks a photo and returns it as JPEG base64 text (no "data:" prefix). */
async function shrinkToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

/** Checks that the browser can read a photo before it joins the list. */
export async function canReadPhoto(file: File): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

/** Saves the photos as a new set and returns its id for the gift link. */
export async function saveGiftPhotos(
  photos: readonly PhotoToSave[],
  onProgress: (saved: number, total: number) => void,
): Promise<string> {
  const created = await fetch(API, { method: 'POST' });
  if (!created.ok) throw new Error(`Creating the photo set answered ${created.status}.`);
  const { id } = (await created.json()) as { id: string };
  for (let i = 0; i < photos.length; i++) {
    onProgress(i, photos.length);
    const jpeg = await shrinkToJpeg(photos[i].file);
    const saved = await fetch(`${API}/${encodeURIComponent(id)}/photos/${i + 1}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: photos[i].date, jpeg }),
    });
    if (!saved.ok) throw new Error(`Photo ${i + 1} answered ${saved.status}.`);
  }
  onProgress(photos.length, photos.length);
  return id;
}
