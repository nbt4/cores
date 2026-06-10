import jwt from 'jsonwebtoken';
import { q } from './db.js';

export const CORES_JWT_SECRET = () =>
  process.env.CORES_JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me';

/**
 * signToken(user) – kept for reference, but tokens are now issued by
 * cores-dashboard. The planner itself no longer creates JWTs.
 */
export function signToken(user) {
  return jwt.sign(
    { uid: user.userid || user.id, username: user.username || user.name, is_admin: user.is_admin || (user.role === 'admin') },
    CORES_JWT_SECRET(),
    { expiresIn: '24h' },
  );
}

/**
 * Reads the cores_token from cookies (manually parsed from the Cookie header)
 * or from the Authorization Bearer header, verifies the JWT, loads the user
 * from the shared "users" table, and attaches req.user.
 */
export async function authRequired(req, res, next) {
  let token = null;

  // 1. Try cookie: manually parse req.headers.cookie
  const cookieHeader = req.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith('cores_token=')) {
      token = trimmed.slice('cores_token='.length);
      break;
    }
  }

  // 2. Fallback: Authorization Bearer header
  if (!token) {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      token = header.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }

  try {
    const payload = jwt.verify(token, CORES_JWT_SECRET());

    // The shared cores "users" table uses "userid" as PK (INTEGER, not SERIAL).
    const { rows } = await q(
      `SELECT u.userid, u.username, u.password_hash, u.email, u.is_active, u.is_admin, u.created_at,
              COALESCE(pp.avatar_color, '#31752f') AS avatar_color
       FROM users u
       LEFT JOIN planner_preferences pp ON pp.user_id = u.userid
       WHERE u.userid = $1 AND u.is_active = true`,
      [payload.uid],
    );

    if (!rows[0]) {
      return res.status(401).json({ error: 'Benutzer existiert nicht mehr' });
    }

    const u = rows[0];

    // Attach both the cores-standard fields AND backward-compatible aliases
    // so existing route code referencing req.user.id / req.user.name etc. still works.
    req.user = {
      // Cores-standard fields (what the JWT claims describe)
      userid: u.userid,
      username: u.username,
      email: u.email,
      is_admin: u.is_admin,

      // Backward-compatible aliases used by existing planner route code
      id: u.userid,
      name: u.username,
      role: u.is_admin ? 'admin' : 'user',
      avatar_color: u.avatar_color,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sitzung abgelaufen oder ungültig' });
  }
}

export function adminRequired(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Nur für Administratoren' });
  }
  next();
}

/**
 * Checks whether a user is a member of a plan.
 * Returns the membership row, or null if not a member.
 */
export async function planMember(planId, userId) {
  const { rows } = await q(
    'SELECT * FROM plan_members WHERE plan_id = $1 AND user_id = $2',
    [planId, userId],
  );
  return rows[0] || null;
}

/**
 * Middleware-style helper: sends 403 if the user is not a plan member.
 * Returns the membership row when authorized, null otherwise.
 */
export async function requirePlanAccess(req, res, planId) {
  const member = await planMember(planId, req.user.id);
  if (!member) {
    res.status(403).json({ error: 'Kein Zugriff auf diesen Plan' });
    return null;
  }
  return member;
}

/**
 * Middleware-style helper: loads a task, then checks plan membership.
 * Returns the task row when authorized, null otherwise.
 */
export async function requireTaskAccess(req, res, taskId) {
  const { rows } = await q('SELECT * FROM tasks WHERE id = $1', [taskId]);
  const task = rows[0];
  if (!task) {
    res.status(404).json({ error: 'Aufgabe nicht gefunden' });
    return null;
  }
  const member = await planMember(task.plan_id, req.user.id);
  if (!member) {
    res.status(403).json({ error: 'Kein Zugriff auf diesen Plan' });
    return null;
  }
  return task;
}
