import { Router } from 'express';
import { q } from '../db.js';
import { authRequired, requirePlanAccess } from '../auth.js';

const router = Router();
router.use(authRequired);

async function loadBucket(req, res) {
  const { rows } = await q('SELECT * FROM buckets WHERE id=$1', [Number(req.params.id)]);
  if (!rows[0]) {
    res.status(404).json({ error: 'Bucket nicht gefunden' });
    return null;
  }
  const member = await requirePlanAccess(req, res, rows[0].plan_id);
  return member ? rows[0] : null;
}

router.put('/:id', async (req, res) => {
  const bucket = await loadBucket(req, res);
  if (!bucket) return;
  const { name, orderIndex } = req.body || {};
  const { rows } = await q(
    `UPDATE buckets SET name=COALESCE($1,name), order_index=COALESCE($2,order_index)
     WHERE id=$3 RETURNING id, name, order_index AS "orderIndex"`,
    [name?.trim() || null, orderIndex ?? null, bucket.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const bucket = await loadBucket(req, res);
  if (!bucket) return;
  const { rows } = await q('SELECT COUNT(*)::int AS n FROM buckets WHERE plan_id=$1', [bucket.plan_id]);
  if (rows[0].n <= 1) return res.status(400).json({ error: 'Der letzte Bucket kann nicht gelöscht werden' });
  await q('DELETE FROM buckets WHERE id=$1', [bucket.id]);
  res.json({ ok: true });
});

export default router;
