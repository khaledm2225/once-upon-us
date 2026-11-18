// Shared rules for the family photos API (Cloudflare Pages Functions + D1).
// No secret keys: the database is bound to the site by name in wrangler.toml.

export interface Env {
  DB: D1Database;
}

export const MAX_PHOTOS = 10;
/** Photos can be added to a set only this long after it is made (milliseconds). */
export const UPLOAD_WINDOW_MS = 30 * 60 * 1000;
/** JPEG base64 text: a 1024 pixel photo is about 200 KB, so 450,000 letters leaves room. */
export const MAX_JPEG_CHARS = 450_000;
/** New photo sets per day for the whole site. */
export const MAX_GIFTS_PER_DAY = 20;
/**
 * Photos kept in total. 900 photos of at most 450,000 letters is about
 * 405 MB, under the free plan's 500 MB per database, so the database can
 * never fill up: past this, new photos are politely refused.
 */
export const MAX_PHOTOS_TOTAL = 900;

/**
 * Writes only from this site's own pages. Browsers mark every request with
 * Sec-Fetch-Site, so another website can't use up the daily limits.
 */
export function fromOtherSite(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  return site !== null && site !== 'same-origin';
}
export const MAX_DATE_CHARS = 40;

const GIFT_ID = /^[A-Za-z0-9_-]{16,64}$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Route parameters arrive as a string or a list of strings. */
export function param(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export function isGiftId(value: string): boolean {
  return GIFT_ID.test(value);
}

/** 18 random bytes as base64url: a 24 letter id nobody can guess. */
export function newGiftId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** A photo number from 1 to 10, or null. */
export function photoNumber(value: string): number | null {
  if (!/^\d{1,2}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= MAX_PHOTOS ? n : null;
}

/** JPEG files start with the bytes FF D8 FF, which is "/9j/" in base64. */
export function isJpegBase64(text: string): boolean {
  return text.length <= MAX_JPEG_CHARS && text.startsWith('/9j/') && BASE64.test(text);
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}
