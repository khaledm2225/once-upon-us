import { type Env, KEEP_DAYS, deleteOldGifts } from '../../server/gift-store.js';

// Wakes once a day (see wrangler.toml) and deletes photo sets older than
// KEEP_DAYS. scheduledTime is the planned run time, which also lets a local
// test pretend to be a later day.
export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      deleteOldGifts(env.DB, controller.scheduledTime).then((deleted) =>
        console.log(`Deleted ${deleted} photos older than ${KEEP_DAYS} days.`),
      ),
    );
  },
} satisfies ExportedHandler<Env>;
