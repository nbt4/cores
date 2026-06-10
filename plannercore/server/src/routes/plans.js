import { Router } from 'express';
import { q, pool } from '../db.js';
import { authRequired, requirePlanAccess } from '../auth.js';
import { notifyAddedToPlan } from '../notify.js';

const router = Router();
router.use(authRequired);

const PLAN_FIELDS = `p.id, p.name, p.description, p.color, p.icon, p.owner_id AS "ownerId", p.created_at AS "createdAt"`;

router.get('/', async (req, res) => {
  const { rows } = await q(
    `SELECT ${PLAN_FIELDS}, pm.favorite, pm.role AS "myRole",
       (SELECT COUNT(*)::int FROM plan_members m WHERE m.plan_id=p.id) AS "memberCount",
       (SELECT COUNT(*)::int FROM tasks t WHERE t.plan_id=p.id) AS "taskCount",
       (SELECT COUNT(*)::int FROM tasks t WHERE t.plan_id=p.id AND t.progress=100) AS "doneCount",
       (SELECT COUNT(*)::int FROM tasks t WHERE t.plan_id=p.id AND t.progress<100 AND t.due_date < CURRENT_DATE) AS "lateCount"
     FROM plans p JOIN plan_members pm ON pm.plan_id=p.id AND pm.user_id=$1
     ORDER BY pm.favorite DESC, p.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, description, color, icon } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Bitte einen Plannamen angeben' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO plans (name, description, color, icon, owner_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name.trim(), description || '', color || '#31752f', icon || '📋', req.user.id]
    );
    const plan = rows[0];
    await client.query(`INSERT INTO plan_members (plan_id, user_id, role) VALUES ($1,$2,'owner')`, [plan.id, req.user.id]);
    await client.query(`INSERT INTO buckets (plan_id, name, order_index) VALUES ($1,'Zu erledigen',1000)`, [plan.id]);
    await client.query('COMMIT');
    res.json({ id: plan.id });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

router.get('/:id', async (req, res) => {
  const planId = Number(req.params.id);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;

  const [plan, members, labels, buckets, tasks] = await Promise.all([
    q(`SELECT ${PLAN_FIELDS} FROM plans p WHERE p.id=$1`, [planId]),
    q(
      `SELECT u.userid AS id, u.username AS name, u.email,
              COALESCE(pp.avatar_color, '#31752f') AS "avatarColor", pm.role
       FROM plan_members pm
       JOIN users u ON u.userid = pm.user_id
       LEFT JOIN planner_preferences pp ON pp.user_id = u.userid
       WHERE pm.plan_id = $1 ORDER BY u.username`,
      [planId]
    ),
    q(`SELECT idx, name FROM plan_labels WHERE plan_id=$1`, [planId]),
    q(`SELECT id, name, order_index AS "orderIndex" FROM buckets WHERE plan_id=$1 ORDER BY order_index`, [planId]),
    q(
      `SELECT t.id, t.bucket_id AS "bucketId", t.title, t.progress, t.priority,
              t.start_date::text AS "startDate", t.due_date::text AS "dueDate",
              t.labels, t.order_index AS "orderIndex", t.created_by AS "createdBy",
              (t.description <> '') AS "hasDescription",
              COALESCE(a.ids, '{}') AS assignees,
              COALESCE(c.total,0)::int AS "checklistTotal", COALESCE(c.done,0)::int AS "checklistDone",
              COALESCE(cm.n,0)::int AS "commentCount", COALESCE(att.n,0)::int AS "attachmentCount"
       FROM tasks t
       LEFT JOIN (SELECT task_id, array_agg(user_id) AS ids FROM task_assignees GROUP BY task_id) a ON a.task_id=t.id
       LEFT JOIN (SELECT task_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE done) AS done FROM checklist_items GROUP BY task_id) c ON c.task_id=t.id
       LEFT JOIN (SELECT task_id, COUNT(*) AS n FROM comments GROUP BY task_id) cm ON cm.task_id=t.id
       LEFT JOIN (SELECT task_id, COUNT(*) AS n FROM attachments GROUP BY task_id) att ON att.task_id=t.id
       WHERE t.plan_id=$1 ORDER BY t.order_index`,
      [planId]
    ),
  ]);

  res.json({
    ...plan.rows[0],
    myRole: member.role,
    favorite: member.favorite,
    members: members.rows,
    labels: labels.rows,
    buckets: buckets.rows,
    tasks: tasks.rows,
  });
});

router.put('/:id', async (req, res) => {
  const planId = Number(req.params.id);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;
  const { name, description, color, icon } = req.body || {};
  const { rows } = await q(
    `UPDATE plans SET name=COALESCE($1,name), description=COALESCE($2,description),
      color=COALESCE($3,color), icon=COALESCE($4,icon) WHERE id=$5 RETURNING id`,
    [name?.trim() || null, description ?? null, color || null, icon || null, planId]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const planId = Number(req.params.id);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;
  if (member.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Nur der Besitzer kann den Plan löschen' });
  }
  await q('DELETE FROM plans WHERE id=$1', [planId]);
  res.json({ ok: true });
});

router.put('/:id/favorite', async (req, res) => {
  const planId = Number(req.params.id);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;
  await q('UPDATE plan_members SET favorite=$1 WHERE plan_id=$2 AND user_id=$3', [
    !!req.body?.favorite,
    planId,
    req.user.id,
  ]);
  res.json({ ok: true });
});

// ---- Mitglieder ----

router.post('/:id/members', async (req, res) => {
  const planId = Number(req.params.id);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;
  const { email, userId } = req.body || {};
  const { rows } = userId
    ? await q('SELECT * FROM users WHERE userid=$1', [userId])
    : await q('SELECT * FROM users WHERE email=lower($1)', [email || '']);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'Kein Benutzer mit dieser E-Mail-Adresse gefunden' });
  await q(
    `INSERT INTO plan_members (plan_id, user_id, role) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`,
    [planId, user.userid]
  );
  const { rows: planRows } = await q('SELECT * FROM plans WHERE id=$1', [planId]);
  notifyAddedToPlan(planRows[0], user.userid, req.user).catch(console.error);
  // Lade avatar_color aus planner_preferences
  const { rows: prefRows } = await q('SELECT avatar_color FROM planner_preferences WHERE user_id = $1', [user.userid]);
  const avatarColor = prefRows[0]?.avatar_color || '#31752f';
  res.json({ id: user.userid, name: user.username, email: user.email, avatarColor, role: 'member' });
});

router.delete('/:id/members/:userId', async (req, res) => {
  const planId = Number(req.params.id);
  const targetId = Number(req.params.userId);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;
  const { rows } = await q('SELECT owner_id FROM plans WHERE id=$1', [planId]);
  if (rows[0].owner_id === targetId) {
    return res.status(400).json({ error: 'Der Besitzer kann den Plan nicht verlassen. Löschen Sie den Plan oder übertragen Sie ihn.' });
  }
  if (targetId !== req.user.id && member.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Nur der Besitzer kann andere Mitglieder entfernen' });
  }
  await q('DELETE FROM plan_members WHERE plan_id=$1 AND user_id=$2', [planId, targetId]);
  await q(
    'DELETE FROM task_assignees ta USING tasks t WHERE ta.task_id=t.id AND t.plan_id=$1 AND ta.user_id=$2',
    [planId, targetId]
  );
  res.json({ ok: true });
});

// ---- Bezeichnungen (25 Labels pro Plan, umbenennbar) ----

router.put('/:id/labels', async (req, res) => {
  const planId = Number(req.params.id);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;
  const labels = Array.isArray(req.body?.labels) ? req.body.labels : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM plan_labels WHERE plan_id=$1', [planId]);
    for (const l of labels) {
      const idx = Number(l.idx);
      if (idx >= 0 && idx < 25 && l.name?.trim()) {
        await client.query('INSERT INTO plan_labels (plan_id, idx, name) VALUES ($1,$2,$3)', [planId, idx, l.name.trim()]);
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// ---- Buckets anlegen ----

router.post('/:id/buckets', async (req, res) => {
  const planId = Number(req.params.id);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Bitte einen Bucket-Namen angeben' });
  const { rows: m } = await q('SELECT COALESCE(MAX(order_index),0)+1000 AS oi FROM buckets WHERE plan_id=$1', [planId]);
  const { rows } = await q(
    `INSERT INTO buckets (plan_id, name, order_index) VALUES ($1,$2,$3)
     RETURNING id, name, order_index AS "orderIndex"`,
    [planId, name.trim(), m[0].oi]
  );
  res.json(rows[0]);
});

// ---- CSV-Export (für Excel, deutsches Format) ----

router.get('/:id/export', async (req, res) => {
  const planId = Number(req.params.id);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;
  const { rows: planRows } = await q('SELECT name FROM plans WHERE id=$1', [planId]);
  const { rows } = await q(
    `SELECT t.id, t.title, b.name AS bucket, t.progress, t.priority,
            t.start_date::text AS start, t.due_date::text AS due, t.description,
            t.created_at::date::text AS created, t.completed_at::date::text AS completed,
            (SELECT string_agg(u.username, ', ') FROM task_assignees ta JOIN users u ON u.userid=ta.user_id WHERE ta.task_id=t.id) AS assignees,
            (SELECT username FROM users WHERE userid=t.created_by) AS creator,
            (SELECT COUNT(*)::int FROM checklist_items c WHERE c.task_id=t.id) AS cl_total,
            (SELECT COUNT(*)::int FROM checklist_items c WHERE c.task_id=t.id AND c.done) AS cl_done
     FROM tasks t JOIN buckets b ON b.id=t.bucket_id WHERE t.plan_id=$1 ORDER BY b.order_index, t.order_index`,
    [planId]
  );
  const progressName = { 0: 'Nicht begonnen', 50: 'In Arbeit', 100: 'Erledigt' };
  const prioName = { 1: 'Dringend', 3: 'Wichtig', 5: 'Mittel', 9: 'Niedrig' };
  const escCsv = (v) => {
    const s = String(v ?? '');
    const escaped = '"' + s.replace(/"/g, '""') + '"';
    // Formula-Injection-Schutz: Werte die mit =, +, -, @ beginnen,
    // mit einem Tab-Präfix versehen (verhindert Excel-Formula-Ausführung)
    return /^[=+\-@\t\r\n]/.test(s) ? '\t' + escaped : escaped;
  };
  const header = ['Aufgaben-ID', 'Aufgabenname', 'Bucket', 'Status', 'Priorität', 'Zugewiesen an', 'Erstellt von', 'Erstellt am', 'Startdatum', 'Fälligkeitsdatum', 'Abgeschlossen am', 'Checkliste', 'Beschreibung'];
  const lines = rows.map((r) =>
    [r.id, r.title, r.bucket, progressName[r.progress], prioName[r.priority] || r.priority, r.assignees, r.creator, r.created, r.start, r.due, r.completed, r.cl_total ? `${r.cl_done}/${r.cl_total}` : '', r.description]
      .map(escCsv).join(';')
  );
  const csv = '﻿' + header.map(escCsv).join(';') + '\r\n' + lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(planRows[0].name)}.csv"`);
  res.send(csv);
});

// ---- Plan kopieren (Struktur wie in Planner: Buckets, Aufgaben, Beschreibungen,
//      Checklisten, Bezeichnungen, Priorität – ohne Zuweisungen/Termine/Fortschritt) ----

router.post('/:id/copy', async (req, res) => {
  const planId = Number(req.params.id);
  const member = await requirePlanAccess(req, res, planId);
  if (!member) return;
  const name = req.body?.name?.trim() || null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: src } = await client.query('SELECT * FROM plans WHERE id=$1', [planId]);
    const { rows: np } = await client.query(
      `INSERT INTO plans (name, description, color, icon, owner_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [name || `Kopie von ${src[0].name}`, src[0].description, src[0].color, src[0].icon, req.user.id]
    );
    const newId = np[0].id;
    await client.query(`INSERT INTO plan_members (plan_id, user_id, role) VALUES ($1,$2,'owner')`, [newId, req.user.id]);
    await client.query(`INSERT INTO plan_labels (plan_id, idx, name) SELECT $1, idx, name FROM plan_labels WHERE plan_id=$2`, [newId, planId]);
    const { rows: srcBuckets } = await client.query('SELECT * FROM buckets WHERE plan_id=$1 ORDER BY order_index', [planId]);
    for (const b of srcBuckets) {
      const { rows: nb } = await client.query(
        'INSERT INTO buckets (plan_id, name, order_index) VALUES ($1,$2,$3) RETURNING id',
        [newId, b.name, b.order_index]
      );
      const { rows: srcTasks } = await client.query('SELECT * FROM tasks WHERE bucket_id=$1 ORDER BY order_index', [b.id]);
      for (const t of srcTasks) {
        const { rows: nt } = await client.query(
          `INSERT INTO tasks (plan_id, bucket_id, title, description, priority, labels, order_index, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [newId, nb[0].id, t.title, t.description, t.priority, t.labels, t.order_index, req.user.id]
        );
        await client.query(
          `INSERT INTO checklist_items (task_id, title, done, order_index)
           SELECT $1, title, false, order_index FROM checklist_items WHERE task_id=$2`,
          [nt[0].id, t.id]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ id: newId });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

export default router;
