import { story } from './story.js';

// The gift: the two names and the dedication a family types on the start page,
// plus the id of the family's saved photos. They live in the link after "#"
// (that part never leaves the device), so the address itself is the gift link
// to send. No parameters means the story's own names, dedication and album.

export interface Gift {
  name1: string;
  name2: string;
  dedication: string[];
  /** Id of the family's saved photos on the server, or '' for none. */
  photos: string;
}

/** Photo ids are long random codes made by the server (base64url letters). */
const PHOTOS_ID = /^[A-Za-z0-9_-]{16,64}$/;

export const LIMITS = { name: 24, dedicationLines: 4, dedicationLetters: 240 } as const;

/** Counts real letters (not code units), so limits are fair for every script. */
function cut(text: string, max: number): string {
  return Array.from(text).slice(0, max).join('');
}

function cleanName(value: string | null): string {
  return cut((value ?? '').replace(/\s+/g, ' ').trim(), LIMITS.name);
}

export function cleanDedication(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .slice(0, LIMITS.dedicationLines);
  const kept: string[] = [];
  let budget = LIMITS.dedicationLetters;
  for (const line of lines) {
    if (budget <= 0) break;
    const piece = cut(line, budget);
    kept.push(piece);
    budget -= Array.from(piece).length;
  }
  return kept;
}

/**
 * The story's dedication for these names. For Grace and Henry it is the
 * approved text word for word; new names flow into its first line.
 */
export function defaultDedication(name1: string, name2: string): string[] {
  return [`To Grandma ${name1} and Grandpa ${name2}.`, ...story.dedication.slice(1)];
}

export function defaultGift(): Gift {
  const { name1, name2 } = story.cover;
  return { name1, name2, dedication: defaultDedication(name1, name2), photos: '' };
}

/** Reads the gift from the link; anything missing or empty falls back to the story's own. */
export function readGift(hash: string = location.hash): Gift {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const fallback = defaultGift();
  const dedication = cleanDedication(params.get('dedication') ?? '');
  const photos = params.get('photos') ?? '';
  const name1 = cleanName(params.get('name1')) || fallback.name1;
  const name2 = cleanName(params.get('name2')) || fallback.name2;
  return {
    name1,
    name2,
    dedication: dedication.length > 0 ? dedication : defaultDedication(name1, name2),
    photos: PHOTOS_ID.test(photos) ? photos : '',
  };
}

export function isDefaultGift(gift: Gift): boolean {
  const d = defaultGift();
  return (
    gift.name1 === d.name1 &&
    gift.name2 === d.name2 &&
    gift.dedication.join('\n') === d.dedication.join('\n') &&
    gift.photos === ''
  );
}

/** The link part after "#": empty for the story's own names, dedication and album. */
export function giftHash(gift: Gift): string {
  if (isDefaultGift(gift)) return '';
  const params = new URLSearchParams();
  params.set('name1', gift.name1);
  params.set('name2', gift.name2);
  params.set('dedication', gift.dedication.join('\n'));
  if (gift.photos) params.set('photos', gift.photos);
  return `#${params.toString()}`;
}

/** Updates the address bar without adding back button history. */
export function writeGift(gift: Gift): void {
  const url = `${location.pathname}${location.search}${giftHash(gift)}`;
  history.replaceState(null, '', url);
}
