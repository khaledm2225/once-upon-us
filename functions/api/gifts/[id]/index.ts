import { type Env, isGiftId, json, param } from '../../../../server/gift-store.js';

// GET /api/gifts/<id>: the photo numbers and dates of one set, in order.
export const onRequestGet: PagesFunction<Env, 'id'> = async ({ env, params }) => {
  const id = param(params.id);
  if (!isGiftId(id)) return json({ error: 'Not found.' }, 404);
  const gift = await env.DB.prepare('SELECT id FROM gifts WHERE id = ?1').bind(id).first();
  if (!gift) return json({ error: 'Not found.' }, 404);
  const { results } = await env.DB.prepare('SELECT n, date_label AS date FROM photos WHERE gift_id = ?1 ORDER BY n')
    .bind(id)
    .all<{ n: number; date: string }>();
  return json({ photos: results });
};
