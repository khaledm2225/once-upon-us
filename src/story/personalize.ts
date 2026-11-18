import { story } from './story.js';

// The gift: the two names and the dedication a family types on the start page.
// They live in the link after "#" (that part never leaves the device), so the
// address itself is the gift link to send. No parameters means the story's own
// names and dedication.

export interface Gift {
  name1: string;
  name2: string;
  dedication: string[];
}

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

export function defaultGift(): Gift {
  return { name1: story.cover.name1, name2: story.cover.name2, dedication: [...story.dedication] };
}

/** Reads the gift from the link; anything missing or empty falls back to the story's own. */
export function readGift(hash: string = location.hash): Gift {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const fallback = defaultGift();
  const dedication = cleanDedication(params.get('dedication') ?? '');
  return {
    name1: cleanName(params.get('name1')) || fallback.name1,
    name2: cleanName(params.get('name2')) || fallback.name2,
    dedication: dedication.length > 0 ? dedication : fallback.dedication,
  };
}

export function isDefaultGift(gift: Gift): boolean {
  const d = defaultGift();
  return gift.name1 === d.name1 && gift.name2 === d.name2 && gift.dedication.join('\n') === d.dedication.join('\n');
}

/** The link part after "#": empty for the story's own names and dedication. */
export function giftHash(gift: Gift): string {
  if (isDefaultGift(gift)) return '';
  const params = new URLSearchParams();
  params.set('name1', gift.name1);
  params.set('name2', gift.name2);
  params.set('dedication', gift.dedication.join('\n'));
  return `#${params.toString()}`;
}

/** Updates the address bar without adding back button history. */
export function writeGift(gift: Gift): void {
  const url = `${location.pathname}${location.search}${giftHash(gift)}`;
  history.replaceState(null, '', url);
}
