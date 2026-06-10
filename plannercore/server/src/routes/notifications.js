import { Router } from 'express';
import { q } from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const { rows } = await q(
    `SELECT id, type, payload, read, created_at AS "createdAt"
     FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  const { rows: unread } = await q(
    'SELECT COUNT(*)::int AS n FROM notifications WHERE user_id=$1 AND read=false',
    [req.user.id]
  );
  res.json({ items: rows, unread: unread[0].n });
});

router.put('/read', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
  if (ids) {
    await q('UPDATE notifications SET read=true WHERE user_id=$1 AND id=ANY($2)', [req.user.id, ids]);
  } else {
    await q('UPDATE notifications SET read=true WHERE user_id=$1', [req.user.id]);
  }
  res.json({ ok: true });
});

export default router;
