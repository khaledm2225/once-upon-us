import {
  type Env,
  MAX_DATE_CHARS,
  MAX_JPEG_CHARS,
  UPLOAD_WINDOW_MS,
  isGiftId,
  isJpegBase64,
  json,
  param,
  photoNumber,
} from '../../../../../server/gift-store.js';

// GET /api/gifts/<id>/photos/<n>: one photo as JPEG base64 text.
export const onRequestGet: PagesFunction<Env, 'id' | 'n'> = async ({ env, params }) => {
  const id = param(params.id);
  const n = photoNumber(param(params.n));
  if (!isGiftId(id) || n === null) return json({ error: 'Not found.' }, 404);
  const row = await env.DB.prepare('SELECT jpeg FROM photos WHERE gift_id = ?1 AND n = ?2')
    .bind(id, n)
    .first<{ jpeg: string }>();
  if (!row) return json({ error: 'Not found.' }, 404);
  // Family photos: only the viewer's own browser may keep a copy, for a day.
  return new Response(row.jpeg, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'private, max-age=86400',
    },
  });
};

// PUT /api/gifts/<id>/photos/<n>: adds photo n to a set, once, within
// 30 minutes of making the set. Body: {"date": "August 1968", "jpeg": "<base64>"}.
export const onRequestPut: PagesFunction<Env, 'id' | 'n'> = async ({ env, params, request }) => {
  const id = param(params.id);
  const n = photoNumber(param(params.n));
  if (!isGiftId(id) || n === null) return json({ error: 'Not found.' }, 404);
  // The size is checked before the body is read; a body of unknown size is refused.
  const length = Number(request.headers.get('content-length') ?? Number.NaN);
  if (!Number.isFinite(length)) return json({ error: 'The photo size is missing.' }, 411);
  if (length > MAX_JPEG_CHARS + 1000) return json({ error: 'The photo is too large.' }, 413);

  const gift = await env.DB.prepare('SELECT created_at FROM gifts WHERE id = ?1')
    .bind(id)
    .first<{ created_at: number }>();
  if (!gift) return json({ error: 'Not found.' }, 404);
  if (Date.now() - gift.created_at > UPLOAD_WINDOW_MS) {
    return json({ error: 'This photo set is closed.' }, 403);
  }

  let body: { date?: unknown; jpeg?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'The photo could not be read.' }, 400);
  }
  const date = typeof body.date === 'string' ? body.date.replace(/\s+/g, ' ').trim() : '';
  const jpeg = typeof body.jpeg === 'string' ? body.jpeg : '';
  if (date.length === 0 || date.length > MAX_DATE_CHARS || !isJpegBase64(jpeg)) {
    return json({ error: 'The photo or its date is not valid.' }, 400);
  }

  try {
    await env.DB.prepare('INSERT INTO photos (gift_id, n, date_label, jpeg) VALUES (?1, ?2, ?3, ?4)')
      .bind(id, n, date, jpeg)
      .run();
  } catch {
    return json({ error: 'This photo is already saved.' }, 409);
  }
  return json({ saved: n }, 201);
};
