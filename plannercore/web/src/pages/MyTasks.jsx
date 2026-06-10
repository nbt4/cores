import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../providers.jsx';
import Icon from '../icons.jsx';
import { Spinner, EmptyState } from '../components.jsx';
import { PROGRESS, prio, fmtDate, isOverdue } from '../util.js';

export default function MyTasksPage() {
  const [tasks, setTasks] = useState(null);
  const { toastError } = useToast();
  const navigate = useNavigate();

  const load = () => api('/mytasks').then(setTasks).catch(toastError);
  useEffect(() => { load(); }, []);

  if (!tasks) return <Spinner />;

  const toggleDone = async (t) => {
    setTasks((list) => list.map((x) => (x.id === t.id ? { ...x, progress: t.progress === 100 ? 0 : 100 } : x)));
    try {
      await api(`/tasks/${t.id}`, { method: 'PUT', body: { progress: t.progress === 100 ? 0 : 100 } });
    } catch (e) { toastError(e); load(); }
  };

  const Card = ({ t }) => (
    <div className={`tcard ${t.progress === 100 ? 'done' : ''}`} onClick={() => navigate(`/plan/${t.planId}?task=${t.id}`)}>
      <div className="tcard-title">
        <button className={`tcard-check ${t.progress === 100 ? 'done' : ''}`} onClick={(e) => { e.stopPropagation(); toggleDone(t); }}>
          <Icon name={t.progress === 100 ? 'checkCircle' : t.progress === 50 ? 'half' : 'circle'} size={17} />
        </button>
        <span className="grow">{t.title}</span>
      </div>
      <div className="tcard-meta">
        <span className="meta-chip">
          <span className="side-plan-icon" style={{ background: t.planColor, width: 16, height: 16, fontSize: 9, borderRadius: 4 }}>{t.planIcon}</span>
          {t.planName} · {t.bucketName}
        </span>
      </div>
      <div className="tcard-meta">
        {t.dueDate && <span className={`meta-chip ${isOverdue(t) ? 'late' : ''}`}><Icon name="calendar" size={13} /> {fmtDate(t.dueDate)}</span>}
        {t.priority !== 5 && <span className="meta-chip" style={{ color: prio(t.priority).color }}><Icon name={prio(t.priority).icon} size={14} /> {prio(t.priority).name}</span>}
        {t.checklistTotal > 0 && <span className="meta-chip"><Icon name="checklist" size={13} /> {t.checklistDone}/{t.checklistTotal}</span>}
      </div>
    </div>
  );

  return (
    <div className="page">
      <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>Meine Aufgaben</h1>
      <p className="text2" style={{ margin: '0 0 18px' }}>Alle Aufgaben, die Ihnen in sämtlichen Plänen zugewiesen sind.</p>
      {tasks.length === 0 ? (
        <EmptyState icon="checklist" title="Keine Aufgaben zugewiesen" text="Sobald Ihnen jemand eine Aufgabe zuweist, erscheint sie hier." />
      ) : (
        <div className="board" style={{ padding: 0, overflowY: 'visible' }}>
          {PROGRESS.map((p) => {
            const list = tasks.filter((t) => t.progress === p.value);
            return (
              <div className="column" key={p.value}>
                <div className="column-head">
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                  <span className="grow">{p.name}</span>
                  <span className="count">{list.length}</span>
                </div>
                <div className="column-body">
                  {list.map((t) => <Card key={t.id} t={t} />)}
                  {list.length === 0 && <div className="text2 small" style={{ padding: 8 }}>Keine Aufgaben</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
