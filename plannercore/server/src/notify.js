import { q } from './db.js';
import { sendMail, mailTemplate } from './mailer.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Legt eine In-App-Benachrichtigung an und versendet optional eine E-Mail.
export async function notify(userIds, type, payload, email) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return;
  for (const userId of ids) {
    await q('INSERT INTO notifications (user_id, type, payload) VALUES ($1,$2,$3)', [
      userId,
      type,
      JSON.stringify(payload),
    ]);
  }
  if (!email) return;
  const { rows } = await q(
    `SELECT u.email, u.username AS name FROM users u
     LEFT JOIN planner_preferences pp ON pp.user_id = u.userid
     WHERE u.userid = ANY($1) AND COALESCE(pp.notify_email, true) = true`,
    [ids]
  );
  for (const u of rows) {
    sendMail(u.email, email.subject, email.html); // bewusst ohne await (fire and forget)
  }
}

export async function notifyTaskAssigned(task, planName, assigneeIds, byUser) {
  await notify(
    assigneeIds.filter((id) => id !== byUser.id),
    'task_assigned',
    { taskId: task.id, planId: task.plan_id, taskTitle: task.title, planName, by: byUser.name },
    {
      subject: `${byUser.name} hat Ihnen eine Aufgabe zugewiesen: ${task.title}`,
      html: mailTemplate(
        'Neue Aufgabe für Sie',
        [
          `<b>${esc(byUser.name)}</b> hat Ihnen im Plan <b>${esc(planName)}</b> die Aufgabe <b>${esc(task.title)}</b> zugewiesen.`,
          task.due_date ? `Fällig am: <b>${new Date(task.due_date).toLocaleDateString('de-DE')}</b>` : '',
        ].filter(Boolean),
        'Aufgabe öffnen',
        `/plan/${task.plan_id}?task=${task.id}`
      ),
    }
  );
}

export async function notifyComment(task, planName, comment, byUser) {
  const { rows } = await q('SELECT user_id FROM task_assignees WHERE task_id=$1', [task.id]);
  const recipients = new Set(rows.map((r) => r.user_id));
  if (task.created_by) recipients.add(task.created_by);
  recipients.delete(byUser.id);
  await notify(
    [...recipients],
    'comment',
    { taskId: task.id, planId: task.plan_id, taskTitle: task.title, planName, by: byUser.name },
    {
      subject: `Neuer Kommentar zu "${task.title}"`,
      html: mailTemplate(
        'Neuer Kommentar',
        [
          `<b>${esc(byUser.name)}</b> hat die Aufgabe <b>${esc(task.title)}</b> im Plan <b>${esc(planName)}</b> kommentiert:`,
          `<i>„${esc(comment).slice(0, 500)}"</i>`,
        ],
        'Kommentar ansehen',
        `/plan/${task.plan_id}?task=${task.id}`
      ),
    }
  );
}

export async function notifyAddedToPlan(plan, userId, byUser) {
  await notify(
    [userId].filter((id) => id !== byUser.id),
    'plan_added',
    { planId: plan.id, planName: plan.name, by: byUser.name },
    {
      subject: `Sie wurden zum Plan "${plan.name}" hinzugefügt`,
      html: mailTemplate(
        'Willkommen im Plan',
        [`<b>${esc(byUser.name)}</b> hat Sie zum Plan <b>${esc(plan.name)}</b> hinzugefügt.`],
        'Plan öffnen',
        `/plan/${plan.id}`
      ),
    }
  );
}

export async function notifyDueSoon(task, planName, assigneeIds, overdue) {
  await notify(
    assigneeIds,
    overdue ? 'task_overdue' : 'task_due',
    { taskId: task.id, planId: task.plan_id, taskTitle: task.title, planName },
    {
      subject: overdue
        ? `Überfällig: ${task.title}`
        : `Bald fällig: ${task.title}`,
      html: mailTemplate(
        overdue ? 'Aufgabe überfällig' : 'Aufgabe bald fällig',
        [
          `Die Aufgabe <b>${esc(task.title)}</b> im Plan <b>${esc(planName)}</b> ist am <b>${new Date(task.due_date).toLocaleDateString('de-DE')}</b> fällig.`,
        ],
        'Aufgabe öffnen',
        `/plan/${task.plan_id}?task=${task.id}`
      ),
    }
  );
}
