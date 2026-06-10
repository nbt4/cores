import { Router } from 'express';
import { q } from '../db.js';
import { authRequired, adminRequired } from '../auth.js';

const router = Router();
router.use(authRequired);

// Avatar-Farbe aus planner_preferences laden (Default: #31752f)
function avatarColorExpr(tableAlias = 'u') {
  return `COALESCE(pp.avatar_color, '#31752f') AS "avatarColor"`;
}

// Benutzersuche für Mitglieder-Auswahl (alle angemeldeten Benutzer dürfen suchen).
router.get('/', async (req, res) => {
  const search = `%${(req.query.q || '').trim()}%`;
  const { rows } = await q(
    `SELECT u.userid AS id, u.username AS name, u.email,
            ${avatarColorExpr('u')}
     FROM users u
     LEFT JOIN planner_preferences pp ON pp.user_id = u.userid
     WHERE u.username ILIKE $1 OR u.email ILIKE $1
     ORDER BY u.username LIMIT 20`,
    [search]
  );
  res.json(rows);
});

// ---- Administration ----

router.get('/admin', adminRequired, async (req, res) => {
  const { rows } = await q(
    `SELECT u.userid AS id, u.email, u.username AS name,
            ${avatarColorExpr('u')},
            u.is_admin, u.created_at AS "createdAt",
            (SELECT COUNT(*)::int FROM plan_members pm WHERE pm.user_id = u.userid) AS "planCount"
     FROM users u
     LEFT JOIN planner_preferences pp ON pp.user_id = u.userid
     ORDER BY u.username`
  );
  // Map is_admin boolean to role string for frontend compatibility
  const mapped = rows.map(r => ({ ...r, role: r.is_admin ? 'admin' : 'user' }));
  res.json(mapped);
});

// Benutzerverwaltung (Anlegen/Ändern/Löschen) erfolgt über cores-dashboard.
// Diese Endpoints sind read-only — der Planner kann keine Benutzer verwalten.

router.delete('/admin/:id', adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Sie können sich nicht selbst löschen' });
  // Pläne, die dem Benutzer gehören, an den Admin übertragen
  await q(
    `INSERT INTO plan_members (plan_id, user_id, role)
     SELECT id, $1, 'owner' FROM plans WHERE owner_id = $2 ON CONFLICT DO NOTHING`,
    [req.user.id, id]
  );
  await q('UPDATE plan_members SET role = \'owner\' WHERE user_id = $1 AND plan_id IN (SELECT id FROM plans WHERE owner_id = $2)', [req.user.id, id]);
  await q('UPDATE plans SET owner_id = $1 WHERE owner_id = $2', [req.user.id, id]);
  await q('UPDATE tasks SET created_by = NULL WHERE created_by = $1', [id]);
  await q('UPDATE tasks SET completed_by = NULL WHERE completed_by = $1', [id]);
  // Soft-delete: Benutzer deaktivieren statt löschen
  await q('UPDATE users SET is_active = false WHERE userid = $1', [id]);
  res.json({ ok: true });
});

export default router;
