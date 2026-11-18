import {
  type Env,
  MAX_GIFTS_PER_DAY,
  UPLOAD_WINDOW_MS,
  fromOtherSite,
  json,
  newGiftId,
} from '../../../server/gift-store.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// POST /api/gifts: makes a new, empty photo set and returns its id.
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (fromOtherSite(request)) return json({ error: 'Not allowed.' }, 403);
  // Sets that closed with no photos (an upload that never finished) are cleared.
  await env.DB.prepare('DELETE FROM gifts WHERE created_at < ?1 AND id NOT IN (SELECT gift_id FROM photos)')
    .bind(Date.now() - UPLOAD_WINDOW_MS)
    .run();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS count FROM gifts WHERE created_at > ?1')
    .bind(Date.now() - DAY_MS)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= MAX_GIFTS_PER_DAY) {
    return json({ error: 'Too many photo sets today. Please try again tomorrow.' }, 429);
  }
  const id = newGiftId();
  await env.DB.prepare('INSERT INTO gifts (id, created_at) VALUES (?1, ?2)').bind(id, Date.now()).run();
  return json({ id }, 201);
};
