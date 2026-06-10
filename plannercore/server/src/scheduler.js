import { q } from './db.js';
import { notifyDueSoon } from './notify.js';

// Prüft regelmäßig auf Aufgaben, die innerhalb von 24 Stunden fällig oder
// bereits überfällig sind, und benachrichtigt die zugewiesenen Personen einmalig.
async function checkDueTasks() {
  const { rows } = await q(
    `SELECT t.*, p.name AS plan_name FROM tasks t JOIN plans p ON p.id=t.plan_id
     WHERE t.due_date IS NOT NULL AND t.due_date <= CURRENT_DATE + 1
       AND t.progress < 100 AND t.due_notified = false`
  );
  for (const task of rows) {
    const { rows: assignees } = await q('SELECT user_id FROM task_assignees WHERE task_id=$1', [task.id]);
    if (assignees.length) {
      const overdue = new Date(task.due_date) < new Date(new Date().toDateString());
      await notifyDueSoon(task, task.plan_name, assignees.map((a) => a.user_id), overdue);
    }
    await q('UPDATE tasks SET due_notified=true WHERE id=$1', [task.id]);
  }
}

export function startScheduler() {
  const run = () => checkDueTasks().catch((e) => console.error('Scheduler-Fehler:', e.message));
  setTimeout(run, 15_000);
  setInterval(run, 30 * 60 * 1000);
}
