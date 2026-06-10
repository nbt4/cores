import { useMemo, useState } from 'react';
import Icon from './icons.jsx';
import { Avatar, AvatarStack, Menu, Modal, UserPicker, LabelChip } from './components.jsx';
import { TaskCard } from './board.jsx';
import { PRIORITIES, PROGRESS, prio, prog, fmtDate, isOverdue, todayStr } from './util.js';

const STATUS_COLORS = { notStarted: '#8a8886', inProgress: '#0078d4', late: '#d13438', done: '#107c10' };
const STATUS_NAMES = { notStarted: 'Nicht begonnen', inProgress: 'In Arbeit', late: 'Verspätet', done: 'Erledigt' };

function statusOf(t) {
  if (t.progress === 100) return 'done';
  if (isOverdue(t)) return 'late';
  return t.progress === 50 ? 'inProgress' : 'notStarted';
}

/* ================= Rasteransicht ================= */

export function GridView({ plan, tasks, updateTask, openTask, createTask }) {
  const [sort, setSort] = useState({ key: 'orderIndex', dir: 1 });
  const [newTitle, setNewTitle] = useState('');

  const sorted = useMemo(() => {
    const get = {
      title: (t) => t.title.toLowerCase(),
      bucket: (t) => plan.buckets.find((b) => b.id === t.bucketId)?.name || '',
      progress: (t) => t.progress,
      priority: (t) => t.priority,
      dueDate: (t) => t.dueDate || '9999',
      startDate: (t) => t.startDate || '9999',
      orderIndex: (t) => t.orderIndex,
    }[sort.key];
    return [...tasks].sort((a, b) => (get(a) > get(b) ? sort.dir : get(a) < get(b) ? -sort.dir : 0));
  }, [tasks, sort, plan.buckets]);

  const Th = ({ k, children }) => (
    <th onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? -s.dir : 1 }))}>
      {children} {sort.key === k ? (sort.dir === 1 ? '↑' : '↓') : ''}
    </th>
  );

  const add = async () => {
    if (!newTitle.trim()) return;
    await createTask({ title: newTitle.trim(), bucketId: plan.buckets[0]?.id });
    setNewTitle('');
  };

  return (
    <div className="page" style={{ paddingTop: 4 }}>
      <div className="row gap8" style={{ marginBottom: 12, maxWidth: 480 }}>
        <input className="input" placeholder="Neue Aufgabe hinzufügen" value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn-primary" onClick={add} disabled={!newTitle.trim()}><Icon name="plus" size={15} /></button>
      </div>

      <table className="grid-table">
        <thead>
          <tr>
            <th style={{ width: 34 }} />
            <Th k="title">Aufgabenname</Th>
            <th>Zugewiesen zu</th>
            <Th k="bucket">Bucket</Th>
            <Th k="progress">Status</Th>
            <Th k="priority">Priorität</Th>
            <Th k="startDate">Start</Th>
            <Th k="dueDate">Fällig</Th>
            <th>Bezeichnungen</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const members = plan.members.filter((m) => t.assignees.includes(m.id));
            return (
              <tr key={t.id}>
                <td>
                  <button className={`tcard-check ${t.progress === 100 ? 'done' : ''}`}
                    onClick={() => updateTask(t.id, { progress: t.progress === 100 ? 0 : 100 })}>
                    <Icon name={t.progress === 100 ? 'checkCircle' : 'circle'} size={17} />
                  </button>
                </td>
                <td>
                  <span className="grid-title" onClick={() => openTask(t.id)}>
                    <span className={t.progress === 100 ? 'text2' : ''} style={t.progress === 100 ? { textDecoration: 'line-through' } : null}>{t.title}</span>
                    {t.checklistTotal > 0 && <span className="text2 small">{t.checklistDone}/{t.checklistTotal}</span>}
                  </span>
                </td>
                <td>
                  <Menu width={280} align="left" trigger={
                    members.length
                      ? <span style={{ cursor: 'pointer' }}><AvatarStack users={members} size={24} /></span>
                      : <button className="btn btn-subtle btn-sm"><Icon name="user" size={14} /></button>
                  }>
                    <div onClick={(e) => e.stopPropagation()} style={{ padding: 8 }}>
                      <UserPicker members={plan.members} selected={t.assignees} onChange={(ids) => updateTask(t.id, { assignees: ids })} />
                    </div>
                  </Menu>
                </td>
                <td>
                  <select className="cell-select" value={t.bucketId} onChange={(e) => updateTask(t.id, { bucketId: Number(e.target.value) })}>
                    {plan.buckets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className="cell-select" value={t.progress} style={{ color: prog(t.progress).color }}
                    onChange={(e) => updateTask(t.id, { progress: Number(e.target.value) })}>
                    {PROGRESS.map((p) => <option key={p.value} value={p.value}>{p.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className="cell-select" value={t.priority} onChange={(e) => updateTask(t.id, { priority: Number(e.target.value) })}>
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.name}</option>)}
                  </select>
                </td>
                <td>
                  <input type="date" className="cell-select" value={t.startDate || ''} style={{ width: 130 }}
                    onChange={(e) => updateTask(t.id, { startDate: e.target.value || null })} />
                </td>
                <td>
                  <input type="date" className="cell-select" value={t.dueDate || ''}
                    style={{ width: 130, color: isOverdue(t) ? 'var(--danger)' : undefined }}
                    onChange={(e) => updateTask(t.id, { dueDate: e.target.value || null })} />
                </td>
                <td>
                  <span className="row gap4 wrap">
                    {t.labels.map((idx) => <LabelChip key={idx} plan={plan} idx={idx} small />)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile Darstellung als Karten */}
      <div className="grid-cards">
        {sorted.map((t) => <TaskCard key={t.id} task={t} plan={plan} onOpen={openTask} updateTask={updateTask} />)}
      </div>
      {sorted.length === 0 && <p className="text2" style={{ textAlign: 'center', marginTop: 32 }}>Keine Aufgaben gefunden.</p>}
    </div>
  );
}

/* ================= Diagramme ================= */

function Donut({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const open = total - counts.done;
  const r = 60, c = 2 * Math.PI * r;
  let offset = 0;
  const segs = Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => {
    const len = (v / total) * c;
    const seg = <circle key={k} r={r} cx="75" cy="75" fill="none" stroke={STATUS_COLORS[k]} strokeWidth="22"
      strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 75 75)" />;
    offset += len;
    return seg;
  });
  return (
    <svg viewBox="0 0 150 150" style={{ width: 170, maxWidth: '100%' }}>
      {total === 0 ? <circle r={r} cx="75" cy="75" fill="none" stroke="var(--surface3)" strokeWidth="22" /> : segs}
      <text x="75" y="71" textAnchor="middle" style={{ font: '700 26px Segoe UI', fill: 'var(--text)' }}>{open}</text>
      <text x="75" y="90" textAnchor="middle" style={{ font: '12px Segoe UI', fill: 'var(--text2)' }}>verbleibend</text>
    </svg>
  );
}

function StackedBars({ groups }) {
  const max = Math.max(1, ...groups.map((g) => g.total));
  const H = 130;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', minHeight: H + 40, paddingTop: 6 }}>
        {groups.map((g) => (
          <div key={g.name} style={{ textAlign: 'center', minWidth: 56 }}>
            <div className="small text2" style={{ marginBottom: 3 }}>{g.total || ''}</div>
            <div style={{ height: H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {['done', 'late', 'inProgress', 'notStarted'].map((k) =>
                g.counts[k] ? (
                  <div key={k} title={`${STATUS_NAMES[k]}: ${g.counts[k]}`}
                    style={{ height: (g.counts[k] / max) * H, background: STATUS_COLORS[k], width: 34, margin: '0 auto', borderRadius: 2 }} />
                ) : null
              )}
            </div>
            <div className="small text2 ellipsis" style={{ maxWidth: 76, marginTop: 5 }} title={g.name}>{g.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartsView({ plan, tasks, openTask, updateTask }) {
  const counts = { notStarted: 0, inProgress: 0, late: 0, done: 0 };
  tasks.forEach((t) => counts[statusOf(t)]++);

  const byBucket = plan.buckets.map((b) => {
    const list = tasks.filter((t) => t.bucketId === b.id);
    const c = { notStarted: 0, inProgress: 0, late: 0, done: 0 };
    list.forEach((t) => c[statusOf(t)]++);
    return { name: b.name, total: list.length, counts: c };
  });

  const byPrio = PRIORITIES.map((p) => {
    const list = tasks.filter((t) => t.priority === p.value);
    const c = { notStarted: 0, inProgress: 0, late: 0, done: 0 };
    list.forEach((t) => c[statusOf(t)]++);
    return { name: p.name, total: list.length, counts: c };
  });

  const byMember = [
    ...plan.members.map((m) => ({ member: m, list: tasks.filter((t) => t.assignees.includes(m.id)) })),
    { member: { id: 0, name: 'Nicht zugewiesen' }, list: tasks.filter((t) => !t.assignees.length) },
  ].map(({ member, list }) => {
    const c = { notStarted: 0, inProgress: 0, late: 0, done: 0 };
    list.forEach((t) => c[statusOf(t)]++);
    return { member, total: list.length, counts: c };
  });
  const maxMember = Math.max(1, ...byMember.map((m) => m.total));

  const Legend = () => (
    <div className="legend">
      {Object.keys(STATUS_NAMES).map((k) => (
        <span key={k}><i style={{ background: STATUS_COLORS[k] }} />{STATUS_NAMES[k]}</span>
      ))}
    </div>
  );

  const open = tasks.filter((t) => t.progress < 100);

  return (
    <div className="page" style={{ paddingTop: 4 }}>
      <div className="charts">
        <div className="chart-card">
          <h3>Status</h3>
          <div className="row gap12 wrap">
            <Donut counts={counts} />
            <div>
              {Object.keys(STATUS_NAMES).map((k) => (
                <div key={k} className="row gap8" style={{ marginBottom: 6 }}>
                  <i style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS[k], display: 'inline-block' }} />
                  <span className="grow text2">{STATUS_NAMES[k]}</span>
                  <b>{counts[k]}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>Bucket</h3>
          <StackedBars groups={byBucket} />
          <Legend />
        </div>

        <div className="chart-card">
          <h3>Priorität</h3>
          <StackedBars groups={byPrio} />
          <Legend />
        </div>

        <div className="chart-card">
          <h3>Mitglieder</h3>
          {byMember.map(({ member, total, counts: c }) => (
            <div key={member.id} className="bar-row">
              {member.id ? <Avatar user={member} size={26} /> : <span className="avatar avatar-rest" style={{ width: 26, height: 26, fontSize: 10 }}>–</span>}
              <span className="small" style={{ width: 110 }} title={member.name}><span className="block ellipsis">{member.name}</span></span>
              <div className="bar-track">
                {['done', 'late', 'inProgress', 'notStarted'].map((k) =>
                  c[k] ? <i key={k} title={`${STATUS_NAMES[k]}: ${c[k]}`} style={{ width: `${(c[k] / maxMember) * 100}%`, background: STATUS_COLORS[k] }} /> : null
                )}
              </div>
              <b className="small" style={{ width: 22, textAlign: 'right' }}>{total}</b>
            </div>
          ))}
          <Legend />
        </div>

        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3>Offene Aufgaben ({open.length})</h3>
          {open.slice(0, 30).map((t) => (
            <div key={t.id} className="row gap8" style={{ padding: '7px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => openTask(t.id)}>
              <button className="tcard-check" onClick={(e) => { e.stopPropagation(); updateTask(t.id, { progress: 100 }); }}>
                <Icon name="circle" size={16} />
              </button>
              <span className="grow ellipsis">{t.title}</span>
              {t.dueDate && <span className={`small ${isOverdue(t) ? '' : 'text2'}`} style={isOverdue(t) ? { color: 'var(--danger)', fontWeight: 600 } : null}>{fmtDate(t.dueDate)}</span>}
              <span className="small text2 hide-mobile" style={{ width: 90 }}>{prio(t.priority).name}</span>
              <AvatarStack users={plan.members.filter((m) => t.assignees.includes(m.id))} size={22} />
            </div>
          ))}
          {open.length === 0 && <p className="text2 small">Alle Aufgaben sind erledigt. 🎉</p>}
        </div>
      </div>
    </div>
  );
}

/* ================= Zeitplan (Kalender) ================= */

export function ScheduleView({ plan, tasks, openTask, createTask }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [dayModal, setDayModal] = useState(null); // 'YYYY-MM-DD'
  const [newTitle, setNewTitle] = useState('');
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  const weeks = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7; // Montag = 0
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    const out = [];
    for (let w = 0; w < 6; w++) {
      const row = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        row.push(day);
      }
      out.push(row);
    }
    return out;
  }, [month]);

  const byDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (t.dueDate) (map[t.dueDate] = map[t.dueDate] || []).push(t);
    });
    return map;
  }, [tasks]);

  const unscheduled = tasks.filter((t) => !t.dueDate && t.progress < 100);
  const today = todayStr();
  const monthName = month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const dateKey = (d) => d.toLocaleDateString('sv-SE');

  const addToDay = async () => {
    if (!newTitle.trim() || !dayModal) return;
    await createTask({ title: newTitle.trim(), bucketId: plan.buckets[0]?.id, dueDate: dayModal });
    setNewTitle('');
  };

  return (
    <div className="page" style={{ paddingTop: 4 }}>
      <div className="row gap8 wrap" style={{ marginBottom: 12 }}>
        <button className="iconbtn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Voriger Monat"><Icon name="chevronLeft" /></button>
        <h3 style={{ margin: 0, minWidth: 150, textAlign: 'center', textTransform: 'capitalize' }}>{monthName}</h3>
        <button className="iconbtn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Nächster Monat"><Icon name="chevronRight" /></button>
        <button className="btn btn-sm" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Heute</button>
        <span className="grow" />
        <button className="btn" onClick={() => setShowUnscheduled(!showUnscheduled)}>
          <Icon name="inbox" size={15} /> Nicht geplant ({unscheduled.length})
        </button>
      </div>

      {showUnscheduled && (
        <div className="chart-card" style={{ marginBottom: 12 }}>
          <h3>Nicht geplante Aufgaben</h3>
          {unscheduled.length === 0 && <span className="text2 small">Alle offenen Aufgaben haben ein Fälligkeitsdatum.</span>}
          <div className="row gap8 wrap">
            {unscheduled.map((t) => (
              <button key={t.id} className="btn btn-sm" onClick={() => openTask(t.id)}>{t.title}</button>
            ))}
          </div>
        </div>
      )}

      <div className="cal-head">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="cal-grid">
        {weeks.flat().map((day) => {
          const key = dateKey(day);
          const list = byDate[key] || [];
          const isOther = day.getMonth() !== month.getMonth();
          return (
            <div key={key} className={`cal-day ${isOther ? 'other' : ''} ${key === today ? 'today' : ''}`}
              onClick={() => setDayModal(key)}>
              <span className="daynum">{day.getDate()}</span>
              {list.slice(0, 3).map((t) => (
                <span key={t.id} className={`cal-task ${t.progress === 100 ? 'done' : ''} ${isOverdue(t) ? 'late' : ''}`}
                  onClick={(e) => { e.stopPropagation(); openTask(t.id); }} title={t.title}>
                  {t.title}
                </span>
              ))}
              {list.length > 3 && <button className="cal-more" onClick={(e) => { e.stopPropagation(); setDayModal(key); }}>+{list.length - 3} weitere</button>}
              <span className="dots">
                {list.slice(0, 6).map((t) => <span key={t.id} className={`dot ${isOverdue(t) ? 'late' : ''}`} />)}
              </span>
            </div>
          );
        })}
      </div>

      {dayModal && (
        <Modal title={new Date(dayModal + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} onClose={() => setDayModal(null)}>
          {(byDate[dayModal] || []).map((t) => (
            <div key={t.id} className="tcard" onClick={() => { setDayModal(null); openTask(t.id); }}>
              <div className="tcard-title"><span className="grow">{t.title}</span></div>
              <div className="tcard-meta">
                <span className="meta-chip">{prog(t.progress).name}</span>
                <AvatarStack users={plan.members.filter((m) => t.assignees.includes(m.id))} size={20} />
              </div>
            </div>
          ))}
          {!(byDate[dayModal] || []).length && <p className="text2 small">Keine Aufgaben an diesem Tag.</p>}
          <div className="row gap8 mt8">
            <input className="input" placeholder="Neue Aufgabe für diesen Tag" value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addToDay()} />
            <button className="btn btn-primary" onClick={addToDay} disabled={!newTitle.trim()}><Icon name="plus" size={15} /></button>
          </div>
        </Modal>
      )}
    </div>
  );
}
