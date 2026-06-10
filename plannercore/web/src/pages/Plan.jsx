import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, useConfirm, useToast } from '../providers.jsx';
import Icon from '../icons.jsx';
import { Avatar, AvatarStack, Menu, MenuItem, Modal, Spinner, UserPicker, BlurInput } from '../components.jsx';
import { PRIORITIES, LABEL_COLORS, labelName, dueCategory, DUE_GROUPS } from '../util.js';
import { PlanDialog } from './Hub.jsx';
import Board from '../board.jsx';
import TaskDialog from '../taskdialog.jsx';
import { GridView, ChartsView, ScheduleView } from '../views.jsx';

const VIEWS = [
  ['board', 'Board', 'board'],
  ['grid', 'Raster', 'grid'],
  ['charts', 'Diagramme', 'chart'],
  ['schedule', 'Zeitplan', 'calendar'],
];

const GROUPS = [
  ['bucket', 'Bucket'],
  ['progress', 'Status'],
  ['priority', 'Priorität'],
  ['due', 'Fälligkeitsdatum'],
  ['assignee', 'Zugewiesen zu'],
  ['labels', 'Bezeichnungen'],
];

function MembersDialog({ plan, reload, onClose }) {
  const { user } = useAuth();
  const { toastError, toastOk } = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(() => api(`/users?q=${encodeURIComponent(q)}`).then(setResults).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  const add = async (target) => {
    try {
      await api(`/plans/${plan.id}/members`, { method: 'POST', body: target.id ? { userId: target.id } : { email: q } });
      toastOk('Mitglied hinzugefügt – Benachrichtigung wurde gesendet');
      setQ('');
      reload();
    } catch (e) { toastError(e); }
  };

  const remove = async (m) => {
    if (!(await confirm('Mitglied entfernen', `${m.name} aus dem Plan entfernen? Zuweisungen werden aufgehoben.`, 'Entfernen'))) return;
    try {
      await api(`/plans/${plan.id}/members/${m.id}`, { method: 'DELETE' });
      reload();
    } catch (e) { toastError(e); }
  };

  const candidates = results.filter((r) => !plan.members.some((m) => m.id === r.id));

  return (
    <Modal title="Mitglieder" onClose={onClose}>
      <div className="field">
        <span className="field-label">Person über Name oder E-Mail hinzufügen</span>
        <input className="input" placeholder="z. B. anna@firma.de" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && q.includes('@') && add({})} />
        {candidates.length > 0 && (
          <div className="picker-list">
            {candidates.map((r) => (
              <button key={r.id} className="picker-item" onClick={() => add(r)}>
                <Avatar user={r} size={28} />
                <span className="grow"><span className="block">{r.name}</span><span className="text2 small">{r.email}</span></span>
                <Icon name="plus" size={16} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="field-label">{plan.members.length} Mitglieder</div>
      {plan.members.map((m) => (
        <div key={m.id} className="row gap8" style={{ padding: '6px 0' }}>
          <Avatar user={m} size={30} />
          <span className="grow">
            <span className="block">{m.name} {m.id === user.id && <span className="text2">(Sie)</span>}</span>
            <span className="text2 small">{m.email}</span>
          </span>
          {m.role === 'owner' ? (
            <span className="text2 small">Besitzer</span>
          ) : (
            <button className="btn btn-subtle btn-sm" onClick={() => remove(m)}>Entfernen</button>
          )}
        </div>
      ))}
    </Modal>
  );
}

function LabelsDialog({ plan, reload, onClose }) {
  const { toastError, toastOk } = useToast();
  const [names, setNames] = useState(() =>
    LABEL_COLORS.map((_, idx) => plan.labels.find((l) => l.idx === idx)?.name || '')
  );
  const save = async () => {
    try {
      await api(`/plans/${plan.id}/labels`, {
        method: 'PUT',
        body: { labels: names.map((name, idx) => ({ idx, name })).filter((l) => l.name.trim()) },
      });
      toastOk('Bezeichnungen gespeichert');
      reload();
      onClose();
    } catch (e) { toastError(e); }
  };
  return (
    <Modal title="Bezeichnungen bearbeiten" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <p className="text2 small" style={{ marginTop: 0 }}>25 Farben stehen zur Verfügung. Vergeben Sie eigene Namen pro Plan.</p>
      <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
        {LABEL_COLORS.map(([defName, color], idx) => (
          <div key={idx} className="row gap8" style={{ marginBottom: 6 }}>
            <span className="label-swatch" style={{ background: color }} />
            <input className="input" placeholder={defName} value={names[idx]}
              onChange={(e) => setNames(names.map((n, i) => (i === idx ? e.target.value : n)))} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

function FilterMenu({ plan, filter, setFilter }) {
  const activeCount =
    (filter.text ? 1 : 0) + filter.due.length + filter.prio.length + filter.labels.length + filter.assignees.length;
  const toggle = (key, value) =>
    setFilter((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));

  return (
    <Menu
      width={300}
      align="right"
      trigger={
        <button className="btn">
          <Icon name="filter" size={15} /> Filter {activeCount > 0 && <b>({activeCount})</b>}
        </button>
      }
    >
      <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
        <h5>Stichwort</h5>
        <input className="input" placeholder="Nach Aufgabenname filtern" value={filter.text}
          onChange={(e) => setFilter((f) => ({ ...f, text: e.target.value }))} />
        <h5>Fälligkeit</h5>
        <div>
          {DUE_GROUPS.map(([key, name]) => (
            <button key={key} className={`chip-toggle ${filter.due.includes(key) ? 'on' : ''}`} onClick={() => toggle('due', key)}>{name}</button>
          ))}
        </div>
        <h5>Priorität</h5>
        <div>
          {PRIORITIES.map((p) => (
            <button key={p.value} className={`chip-toggle ${filter.prio.includes(p.value) ? 'on' : ''}`} onClick={() => toggle('prio', p.value)}>{p.name}</button>
          ))}
        </div>
        <h5>Bezeichnung</h5>
        <div style={{ maxHeight: 130, overflowY: 'auto' }}>
          {LABEL_COLORS.map(([, color], idx) => {
            const used = plan.tasks.some((t) => t.labels.includes(idx)) || plan.labels.some((l) => l.idx === idx);
            if (!used) return null;
            return (
              <button key={idx} className={`chip-toggle ${filter.labels.includes(idx) ? 'on' : ''}`}
                style={filter.labels.includes(idx) ? { background: color, borderColor: color, color: '#fff' } : {}}
                onClick={() => toggle('labels', idx)}>
                {labelName(plan, idx)}
              </button>
            );
          })}
        </div>
        <h5>Zugewiesen zu</h5>
        <div style={{ maxHeight: 130, overflowY: 'auto' }}>
          <button className={`chip-toggle ${filter.assignees.includes(0) ? 'on' : ''}`} onClick={() => toggle('assignees', 0)}>Nicht zugewiesen</button>
          {plan.members.map((m) => (
            <button key={m.id} className={`chip-toggle ${filter.assignees.includes(m.id) ? 'on' : ''}`} onClick={() => toggle('assignees', m.id)}>{m.name}</button>
          ))}
        </div>
        {activeCount > 0 && (
          <button className="btn btn-subtle mt8" onClick={() => setFilter({ text: '', due: [], prio: [], labels: [], assignees: [] })}>
            Alle Filter löschen
          </button>
        )}
      </div>
    </Menu>
  );
}

export default function PlanPage() {
  const { id } = useParams();
  const planId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toastError, toastOk } = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'board';
  const openTaskId = params.get('task') ? Number(params.get('task')) : null;

  const [plan, setPlan] = useState(null);
  const [groupBy, setGroupBy] = useState('bucket');
  const [filter, setFilter] = useState({ text: '', due: [], prio: [], labels: [], assignees: [] });
  const [dialog, setDialog] = useState(null); // 'edit' | 'members' | 'labels'

  const reload = useCallback(
    () => api(`/plans/${planId}`).then(setPlan).catch((e) => { toastError(e); navigate('/'); }),
    [planId]
  );
  useEffect(() => { setPlan(null); reload(); }, [reload]);

  // Optimistisches Aktualisieren einer Aufgabe
  const patchTaskLocal = useCallback((taskId, patch) => {
    setPlan((p) => p && { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) });
  }, []);
  const updateTask = useCallback(
    async (taskId, patch) => {
      patchTaskLocal(taskId, patch);
      try {
        await api(`/tasks/${taskId}`, { method: 'PUT', body: patch });
      } catch (e) {
        toastError(e);
        reload();
      }
    },
    [patchTaskLocal, reload, toastError]
  );
  const createTask = useCallback(
    async (fields) => {
      try {
        await api(`/plans/${planId}/tasks`, { method: 'POST', body: fields });
        reload();
      } catch (e) { toastError(e); }
    },
    [planId, reload, toastError]
  );

  const setView = (v) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('view', v); return n; }, { replace: true });
  const openTask = (taskId) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('task', String(taskId)); return n; });
  const closeTask = () => { setParams((prev) => { const n = new URLSearchParams(prev); n.delete('task'); return n; }); reload(); };

  const filteredTasks = useMemo(() => {
    if (!plan) return [];
    return plan.tasks.filter((t) => {
      if (filter.text && !t.title.toLowerCase().includes(filter.text.toLowerCase())) return false;
      if (filter.due.length && !filter.due.includes(dueCategory(t))) return false;
      if (filter.prio.length && !filter.prio.includes(t.priority)) return false;
      if (filter.labels.length && !filter.labels.some((l) => t.labels.includes(l))) return false;
      if (filter.assignees.length) {
        const hit = filter.assignees.some((a) => (a === 0 ? t.assignees.length === 0 : t.assignees.includes(a)));
        if (!hit) return false;
      }
      return true;
    });
  }, [plan, filter]);

  if (!plan) return <Spinner />;

  const toggleFav = async () => {
    await api(`/plans/${planId}/favorite`, { method: 'PUT', body: { favorite: !plan.favorite } }).catch(toastError);
    window.dispatchEvent(new Event('planner:plans-changed'));
    reload();
  };

  const deletePlan = async () => {
    if (!(await confirm('Plan löschen', `„${plan.name}" und alle zugehörigen Aufgaben endgültig löschen?`))) return;
    try {
      await api(`/plans/${planId}`, { method: 'DELETE' });
      window.dispatchEvent(new Event('planner:plans-changed'));
      navigate('/');
    } catch (e) { toastError(e); }
  };

  const leavePlan = async () => {
    if (!(await confirm('Plan verlassen', 'Diesen Plan wirklich verlassen?', 'Verlassen'))) return;
    try {
      await api(`/plans/${planId}/members/${user.id}`, { method: 'DELETE' });
      window.dispatchEvent(new Event('planner:plans-changed'));
      navigate('/');
    } catch (e) { toastError(e); }
  };

  const copyPlan = async () => {
    try {
      const { id: newId } = await api(`/plans/${planId}/copy`, { method: 'POST', body: {} });
      window.dispatchEvent(new Event('planner:plans-changed'));
      toastOk('Plan wurde kopiert');
      navigate(`/plan/${newId}`);
    } catch (e) { toastError(e); }
  };

  const exportCsv = async () => {
    try {
      const res = await fetch(`/api/plans/${planId}/export`, { credentials: 'include' });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `${plan.name}.csv` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toastError(e); }
  };

  const viewProps = { plan, tasks: filteredTasks, reload, updateTask, createTask, openTask, patchTaskLocal };

  return (
    <>
      <div className="plan-head">
        <div className="plan-title-row">
          <span className="side-plan-icon" style={{ background: plan.color, width: 32, height: 32, fontSize: 17 }}>{plan.icon}</span>
          <h1 className="ellipsis" title={plan.description || plan.name}>{plan.name}</h1>
          <button className="iconbtn" onClick={toggleFav} aria-label="Favorit" style={{ color: plan.favorite ? '#eaa300' : 'var(--text2)' }}>
            <Icon name={plan.favorite ? 'starFill' : 'star'} size={17} />
          </button>
          <span className="grow" />
          <span style={{ cursor: 'pointer' }} onClick={() => setDialog('members')}>
            <AvatarStack users={plan.members} max={4} size={28} />
          </span>
          <button className="btn hide-mobile" onClick={() => setDialog('members')}><Icon name="users" size={15} /> Mitglieder</button>
          <Menu trigger={<button className="iconbtn" aria-label="Planoptionen"><Icon name="dots" size={18} /></button>}>
            <MenuItem icon="edit" label="Plan bearbeiten" onClick={() => setDialog('edit')} />
            <MenuItem icon="users" label="Mitglieder verwalten" onClick={() => setDialog('members')} />
            <MenuItem icon="label" label="Bezeichnungen bearbeiten" onClick={() => setDialog('labels')} />
            <div className="menu-sep" />
            <MenuItem icon="copy" label="Plan kopieren" onClick={copyPlan} />
            <MenuItem icon="download" label="Nach Excel exportieren (CSV)" onClick={exportCsv} />
            <div className="menu-sep" />
            {plan.myRole !== 'owner' && <MenuItem icon="logout" label="Plan verlassen" onClick={leavePlan} />}
            {(plan.myRole === 'owner' || user.role === 'admin') && (
              <MenuItem icon="trash" label="Plan löschen" danger onClick={deletePlan} />
            )}
          </Menu>
        </div>
        <div className="plan-tabs">
          {VIEWS.map(([key, name, icon]) => (
            <button key={key} className={`tab ${view === key ? 'active' : ''}`} onClick={() => setView(key)}>
              <Icon name={icon} size={16} /> {name}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar">
        {view === 'board' && (
          <label className="row gap8">
            <span className="text2 small hide-mobile">Gruppieren nach</span>
            <select className="input" style={{ width: 'auto', minWidth: 130 }} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              {GROUPS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
        )}
        <span className="grow" />
        <span className="text2 small hide-mobile">{filteredTasks.length} von {plan.tasks.length} Aufgaben</span>
        <FilterMenu plan={plan} filter={filter} setFilter={setFilter} />
      </div>

      {view === 'board' && <Board {...viewProps} groupBy={groupBy} />}
      {view === 'grid' && <GridView {...viewProps} />}
      {view === 'charts' && <ChartsView {...viewProps} />}
      {view === 'schedule' && <ScheduleView {...viewProps} />}

      {dialog === 'edit' && <PlanDialog plan={plan} onClose={() => setDialog(null)} onSaved={reload} />}
      {dialog === 'members' && <MembersDialog plan={plan} reload={reload} onClose={() => setDialog(null)} />}
      {dialog === 'labels' && <LabelsDialog plan={plan} reload={reload} onClose={() => setDialog(null)} />}
      {openTaskId && <TaskDialog taskId={openTaskId} plan={plan} onClose={closeTask} reloadPlan={reload} />}
    </>
  );
}
