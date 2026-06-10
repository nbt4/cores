import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { q } from '../db.js';
import { authRequired, requirePlanAccess, requireTaskAccess } from '../auth.js';
import { notifyTaskAssigned, notifyComment } from '../notify.js';

const router = Router();
router.use(authRequired);

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

async function planName(planId) {
  const { rows } = await q('SELECT name FROM plans WHERE id=$1', [planId]);
  return rows[0]?.name || '';
}

// DATE-Spalten zeitzonenunabhängig als YYYY-MM-DD ausgeben
const dateStr = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;

// ---- Aufgabe anlegen ----

router.post('/plans/:planId/tasks', async (req, res) => {
  const planId = Number(req.params.planId);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;
  const { title, bucketId, dueDate, startDate, priority, progress, labels, assignees } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Bitte einen Aufgabennamen angeben' });
  const { rows: b } = await q('SELECT id FROM buckets WHERE id=$1 AND plan_id=$2', [bucketId, planId]);
  if (!b[0]) return res.status(400).json({ error: 'Bucket nicht gefunden' });
  const { rows: m } = await q('SELECT COALESCE(MAX(order_index),0)+1000 AS oi FROM tasks WHERE bucket_id=$1', [bucketId]);
  const { rows } = await q(
    `INSERT INTO tasks (plan_id, bucket_id, title, due_date, start_date, priority, progress, labels, order_index, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [planId, bucketId, title.trim(), dueDate || null, startDate || null, priority ?? 5, progress ?? 0,
     Array.isArray(labels) ? labels : [], m[0].oi, req.user.id]
  );
  const task = rows[0];
  if (Array.isArray(assignees) && assignees.length) {
    for (const uid of assignees) {
      await q('INSERT INTO task_assignees (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [task.id, uid]);
    }
    notifyTaskAssigned(task, await planName(planId), assignees, req.user).catch(console.error);
  }
  res.json({ id: task.id });
});

// ---- Aufgabendetails ----

router.get('/tasks/:id', async (req, res) => {
  const task = await requireTaskAccess(req, res, Number(req.params.id));
  if (!task) return;
  const [assignees, checklist, comments, attachments, creator] = await Promise.all([
    q('SELECT user_id FROM task_assignees WHERE task_id=$1', [task.id]),
    q('SELECT id, title, done, order_index AS "orderIndex" FROM checklist_items WHERE task_id=$1 ORDER BY order_index', [task.id]),
    q(
      `SELECT c.id, c.body, c.created_at AS "createdAt", u.userid AS "userId", u.username AS name,
              COALESCE(pp.avatar_color, '#31752f') AS "avatarColor"
       FROM comments c
       LEFT JOIN users u ON u.userid = c.user_id
       LEFT JOIN planner_preferences pp ON pp.user_id = u.userid
       WHERE c.task_id = $1 ORDER BY c.created_at DESC`,
      [task.id]
    ),
    q(
      `SELECT a.id, a.original_name AS name, a.mime, a.size, a.created_at AS "createdAt",
              (SELECT username FROM users WHERE userid = a.uploaded_by) AS "uploadedBy"
       FROM attachments a WHERE a.task_id=$1 ORDER BY a.created_at DESC`,
      [task.id]
    ),
    q('SELECT username AS name FROM users WHERE userid=$1', [task.created_by]),
  ]);
  res.json({
    id: task.id,
    planId: task.plan_id,
    bucketId: task.bucket_id,
    title: task.title,
    description: task.description,
    progress: task.progress,
    priority: task.priority,
    startDate: dateStr(task.start_date),
    dueDate: dateStr(task.due_date),
    labels: task.labels,
    createdAt: task.created_at,
    createdByName: creator.rows[0]?.name || null,
    assignees: assignees.rows.map((r) => r.user_id),
    checklist: checklist.rows,
    comments: comments.rows,
    attachments: attachments.rows,
  });
});

// ---- Aufgabe aktualisieren (auch Verschieben & Zuweisen) ----

router.put('/tasks/:id', async (req, res) => {
  const task = await requireTaskAccess(req, res, Number(req.params.id));
  if (!task) return;
  const b = req.body || {};
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k);

  if (has('bucketId')) {
    const { rows } = await q('SELECT id FROM buckets WHERE id=$1 AND plan_id=$2', [b.bucketId, task.plan_id]);
    if (!rows[0]) return res.status(400).json({ error: 'Bucket nicht gefunden' });
  }

  const progress = has('progress') ? b.progress : task.progress;
  const completedChange = has('progress') && b.progress !== task.progress;

  await q(
    `UPDATE tasks SET
       title=COALESCE($1,title),
       description=$2,
       bucket_id=COALESCE($3,bucket_id),
       progress=COALESCE($4,progress),
       priority=COALESCE($5,priority),
       start_date=$6,
       due_date=$7,
       labels=$8,
       order_index=COALESCE($9,order_index),
       completed_at=CASE WHEN $10 THEN (CASE WHEN $4=100 THEN now() ELSE NULL END) ELSE completed_at END,
       completed_by=CASE WHEN $10 THEN (CASE WHEN $4=100 THEN $11::int ELSE NULL END) ELSE completed_by END,
       due_notified=CASE WHEN $12 THEN false ELSE due_notified END,
       updated_at=now()
     WHERE id=$13`,
    [
      b.title?.trim() || null,
      has('description') ? b.description ?? '' : task.description,
      b.bucketId ?? null,
      has('progress') ? b.progress : null,
      b.priority ?? null,
      has('startDate') ? b.startDate || null : task.start_date,
      has('dueDate') ? b.dueDate || null : task.due_date,
      has('labels') && Array.isArray(b.labels) ? b.labels : task.labels,
      b.orderIndex ?? null,
      completedChange,
      req.user.id,
      has('dueDate'),
      task.id,
    ]
  );

  if (has('assignees') && Array.isArray(b.assignees)) {
    const { rows } = await q('SELECT user_id FROM task_assignees WHERE task_id=$1', [task.id]);
    const current = new Set(rows.map((r) => r.user_id));
    const next = new Set(b.assignees.map(Number));
    const added = [...next].filter((id) => !current.has(id));
    for (const id of [...current].filter((id) => !next.has(id))) {
      await q('DELETE FROM task_assignees WHERE task_id=$1 AND user_id=$2', [task.id, id]);
    }
    for (const id of added) {
      await q('INSERT INTO task_assignees (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [task.id, id]);
    }
    if (added.length) {
      const fresh = { ...task, title: b.title?.trim() || task.title };
      notifyTaskAssigned(fresh, await planName(task.plan_id), added, req.user).catch(console.error);
    }
  }
  res.json({ ok: true });
});

router.delete('/tasks/:id', async (req, res) => {
  const task = await requireTaskAccess(req, res, Number(req.params.id));
  if (!task) return;
  const { rows } = await q('SELECT stored_name FROM attachments WHERE task_id=$1', [task.id]);
  await q('DELETE FROM tasks WHERE id=$1', [task.id]);
  for (const a of rows) fs.promises.unlink(path.join(UPLOAD_DIR, a.stored_name)).catch(() => {});
  res.json({ ok: true });
});

// ---- Aufgabe kopieren ----

router.post('/tasks/:id/copy', async (req, res) => {
  const task = await requireTaskAccess(req, res, Number(req.params.id));
  if (!task) return;
  const o = req.body || {}; // { title, assignees, progress, dates, description, checklist, labels }
  const { rows: m } = await q('SELECT COALESCE(MAX(order_index),0)+1000 AS oi FROM tasks WHERE bucket_id=$1', [task.bucket_id]);
  const { rows } = await q(
    `INSERT INTO tasks (plan_id, bucket_id, title, description, progress, priority, start_date, due_date, labels, order_index, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      task.plan_id, task.bucket_id,
      o.title?.trim() || `Kopie von ${task.title}`,
      o.description !== false ? task.description : '',
      o.progress !== false ? task.progress : 0,
      task.priority,
      o.dates !== false ? task.start_date : null,
      o.dates !== false ? task.due_date : null,
      o.labels !== false ? task.labels : [],
      m[0].oi, req.user.id,
    ]
  );
  const newId = rows[0].id;
  if (o.checklist !== false) {
    await q(
      `INSERT INTO checklist_items (task_id, title, done, order_index)
       SELECT $1, title, false, order_index FROM checklist_items WHERE task_id=$2`,
      [newId, task.id]
    );
  }
  if (o.assignees !== false) {
    await q('INSERT INTO task_assignees (task_id, user_id) SELECT $1, user_id FROM task_assignees WHERE task_id=$2', [newId, task.id]);
  }
  res.json({ id: newId });
});

// ---- Checkliste ----

router.post('/tasks/:id/checklist', async (req, res) => {
  const task = await requireTaskAccess(req, res, Number(req.params.id));
  if (!task) return;
  const { title } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Bitte einen Text angeben' });
  const { rows: m } = await q('SELECT COALESCE(MAX(order_index),0)+1000 AS oi FROM checklist_items WHERE task_id=$1', [task.id]);
  const { rows } = await q(
    `INSERT INTO checklist_items (task_id, title, order_index) VALUES ($1,$2,$3)
     RETURNING id, title, done, order_index AS "orderIndex"`,
    [task.id, title.trim(), m[0].oi]
  );
  res.json(rows[0]);
});

router.put('/checklist/:id', async (req, res) => {
  const { rows: items } = await q('SELECT * FROM checklist_items WHERE id=$1', [Number(req.params.id)]);
  if (!items[0]) return res.status(404).json({ error: 'Element nicht gefunden' });
  const task = await requireTaskAccess(req, res, items[0].task_id);
  if (!task) return;
  const { title, done, orderIndex } = req.body || {};
  const { rows } = await q(
    `UPDATE checklist_items SET title=COALESCE($1,title), done=COALESCE($2,done), order_index=COALESCE($3,order_index)
     WHERE id=$4 RETURNING id, title, done, order_index AS "orderIndex"`,
    [title?.trim() || null, typeof done === 'boolean' ? done : null, orderIndex ?? null, items[0].id]
  );
  res.json(rows[0]);
});

router.delete('/checklist/:id', async (req, res) => {
  const { rows: items } = await q('SELECT * FROM checklist_items WHERE id=$1', [Number(req.params.id)]);
  if (!items[0]) return res.status(404).json({ error: 'Element nicht gefunden' });
  const task = await requireTaskAccess(req, res, items[0].task_id);
  if (!task) return;
  await q('DELETE FROM checklist_items WHERE id=$1', [items[0].id]);
  res.json({ ok: true });
});

// ---- Kommentare ----

router.post('/tasks/:id/comments', async (req, res) => {
  const task = await requireTaskAccess(req, res, Number(req.params.id));
  if (!task) return;
  const { body } = req.body || {};
  if (!body?.trim()) return res.status(400).json({ error: 'Kommentar darf nicht leer sein' });
  const { rows } = await q(
    `INSERT INTO comments (task_id, user_id, body) VALUES ($1,$2,$3) RETURNING id, body, created_at AS "createdAt"`,
    [task.id, req.user.id, body.trim()]
  );
  notifyComment(task, await planName(task.plan_id), body.trim(), req.user).catch(console.error);
  res.json({ ...rows[0], userId: req.user.id, name: req.user.name, avatarColor: req.user.avatar_color });
});

router.delete('/comments/:id', async (req, res) => {
  const { rows } = await q('SELECT * FROM comments WHERE id=$1', [Number(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Kommentar nicht gefunden' });
  const task = await requireTaskAccess(req, res, rows[0].task_id);
  if (!task) return;
  if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Nur eigene Kommentare können gelöscht werden' });
  }
  await q('DELETE FROM comments WHERE id=$1', [rows[0].id]);
  res.json({ ok: true });
});

// ---- Anhänge ----

router.post('/tasks/:id/attachments', upload.single('file'), async (req, res) => {
  const task = await requireTaskAccess(req, res, Number(req.params.id));
  if (!task) {
    if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
    return;
  }
  if (!req.file) return res.status(400).json({ error: 'Keine Datei übermittelt' });
  const original = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const { rows } = await q(
    `INSERT INTO attachments (task_id, stored_name, original_name, mime, size, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, original_name AS name, mime, size, created_at AS "createdAt"`,
    [task.id, req.file.filename, original, req.file.mimetype, req.file.size, req.user.id]
  );
  res.json({ ...rows[0], uploadedBy: req.user.name });
});

router.get('/attachments/:id/download', async (req, res) => {
  const { rows } = await q('SELECT * FROM attachments WHERE id=$1', [Number(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Anhang nicht gefunden' });
  const task = await requireTaskAccess(req, res, rows[0].task_id);
  if (!task) return;
  res.download(path.join(UPLOAD_DIR, rows[0].stored_name), rows[0].original_name);
});

router.delete('/attachments/:id', async (req, res) => {
  const { rows } = await q('SELECT * FROM attachments WHERE id=$1', [Number(req.params.id)]);
  if (!rows[0]) return res.status(404).json({ error: 'Anhang nicht gefunden' });
  const task = await requireTaskAccess(req, res, rows[0].task_id);
  if (!task) return;
  await q('DELETE FROM attachments WHERE id=$1', [rows[0].id]);
  fs.promises.unlink(path.join(UPLOAD_DIR, rows[0].stored_name)).catch(() => {});
  res.json({ ok: true });
});

// ---- Meine Aufgaben (planübergreifend) ----

router.get('/mytasks', async (req, res) => {
  const { rows } = await q(
    `SELECT t.id, t.plan_id AS "planId", p.name AS "planName", p.color AS "planColor", p.icon AS "planIcon",
            b.name AS "bucketName", t.title, t.progress, t.priority,
            t.start_date::text AS "startDate", t.due_date::text AS "dueDate", t.labels,
            COALESCE(c.total,0)::int AS "checklistTotal", COALESCE(c.done,0)::int AS "checklistDone",
            COALESCE(a.ids,'{}') AS assignees
     FROM tasks t
     JOIN task_assignees ta ON ta.task_id=t.id AND ta.user_id=$1
     JOIN plans p ON p.id=t.plan_id
     JOIN buckets b ON b.id=t.bucket_id
     LEFT JOIN (SELECT task_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE done) AS done FROM checklist_items GROUP BY task_id) c ON c.task_id=t.id
     LEFT JOIN (SELECT task_id, array_agg(user_id) AS ids FROM task_assignees GROUP BY task_id) a ON a.task_id=t.id
     ORDER BY t.due_date NULLS LAST, t.priority`,
    [req.user.id]
  );
  res.json(rows);
});

export default router;
