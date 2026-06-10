import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgres://${process.env.PGUSER || 'planner'}:${process.env.PGPASSWORD || 'planner'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'planner'}`,
});

export const q = (text, params) => pool.query(text, params);

const SCHEMA = `
-- NOTE: The "users" table is NOT created here. It is a shared table managed
-- by cores-dashboard.  The shared table uses the following schema:
--   userid    INTEGER PRIMARY KEY,
--   username  TEXT NOT NULL,
--   password_hash TEXT NOT NULL,
--   email     TEXT UNIQUE NOT NULL,
--   is_active BOOLEAN NOT NULL DEFAULT true,
--   is_admin  BOOLEAN NOT NULL DEFAULT false,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
--
-- All planner tables that reference users use INT columns (no FK constraint)
-- because the shared users table uses userid (INTEGER) as its PK.

CREATE TABLE IF NOT EXISTS planner_preferences (
  user_id INT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#31752f',
  notify_email BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#31752f',
  icon TEXT NOT NULL DEFAULT '📋',
  owner_id INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_members (
  plan_id INT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id INT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  favorite BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS plan_labels (
  plan_id INT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  idx INT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (plan_id, idx)
);

CREATE TABLE IF NOT EXISTS buckets (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  bucket_id INT NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  progress INT NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 5,
  start_date DATE,
  due_date DATE,
  labels INT[] NOT NULL DEFAULT '{}',
  order_index DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_by INT,
  completed_by INT,
  completed_at TIMESTAMPTZ,
  due_notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INT NOT NULL,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id SERIAL PRIMARY KEY,
  task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  order_index DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT 'application/octet-stream',
  size BIGINT NOT NULL DEFAULT 0,
  uploaded_by INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_plan ON tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_tasks_bucket ON tasks(bucket_id);
CREATE INDEX IF NOT EXISTS idx_assignees_user ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_members_user ON plan_members(user_id);
`;

export async function migrate() {
  let attempts = 0;
  for (;;) {
    try {
      await q('SELECT 1');
      break;
    } catch (e) {
      attempts++;
      if (attempts > 30) throw e;
      console.log(`Warte auf Datenbank... (${attempts})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  await q(SCHEMA);
  console.log('Datenbankschema bereit.');
}
