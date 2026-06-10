import { Router } from 'express';
import { q } from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();

/**
 * POST /logout
 * Clears the cores_token cookie and returns success.
 * The frontend can also just delete the cookie, but this provides a server-side
 * endpoint for completeness.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('cores_token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  res.json({ ok: true });
});

/**
 * GET /me
 * Returns the current user profile as set by the authRequired middleware.
 * Requires a valid cores_token cookie or Authorization Bearer header.
 */
router.get('/me', authRequired, (req, res) => {
  res.json({
    userId: req.user.userid,
    username: req.user.username,
    email: req.user.email,
    isAdmin: req.user.is_admin,
  });
});

/**
 * PUT /me
 * Allows the user to update their own name/username and email.
 * Password changes are not handled here — use cores-dashboard for that.
 */
router.put('/me', authRequired, async (req, res) => {
  const { username, email } = req.body || {};

  if (email && !email.includes('@')) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
  }

  try {
    const updates = [];
    const params = [];
    let idx = 1;

    if (username?.trim()) {
      updates.push(`username = $${idx++}`);
      params.push(username.trim());
    }
    if (email?.trim()) {
      updates.push(`email = lower($${idx++})`);
      params.push(email.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Keine Änderungen übermittelt' });
    }

    params.push(req.user.userid);
    const { rows } = await q(
      `UPDATE users SET ${updates.join(', ')} WHERE userid = $${idx} RETURNING userid, username, email, is_admin`,
      params,
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    res.json({
      userId: rows[0].userid,
      username: rows[0].username,
      email: rows[0].email,
      isAdmin: rows[0].is_admin,
    });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits vergeben' });
    }
    throw e;
  }
});

export default router;
