import { type Env, KEEP_MS, isGiftId, json, param } from '../../../../server/gift-store.js';

// GET /api/gifts/<id>: the photo numbers and dates of one set, in order.
export const onRequestGet: PagesFunction<Env, 'id'> = async ({ env, params }) => {
  const id = param(params.id);
  if (!isGiftId(id)) return json({ error: 'Not found.' }, 404);
  // A set older than KEEP_DAYS is gone, even before the daily cleanup deletes it.
  const gift = await env.DB.prepare('SELECT id FROM gifts WHERE id = ?1 AND created_at > ?2')
    .bind(id, Date.now() - KEEP_MS)
    .first();
  if (!gift) return json({ error: 'Not found.' }, 404);
  const { results } = await env.DB.prepare('SELECT n, date_label AS date FROM photos WHERE gift_id = ?1 ORDER BY n')
    .bind(id)
    .all<{ n: number; date: string }>();
  return json({ photos: results });
};
