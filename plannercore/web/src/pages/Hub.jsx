import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../providers.jsx';
import Icon from '../icons.jsx';
import { Modal, Spinner, EmptyState } from '../components.jsx';
import { PLAN_COLORS, PLAN_ICONS } from '../util.js';

export function PlanDialog({ plan, onClose, onSaved }) {
  const { toastError } = useToast();
  const [form, setForm] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    color: plan?.color || PLAN_COLORS[0],
    icon: plan?.icon || PLAN_ICONS[0],
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return toastError(new Error('Bitte einen Plannamen angeben'));
    setBusy(true);
    try {
      if (plan) {
        await api(`/plans/${plan.id}`, { method: 'PUT', body: form });
        onSaved?.();
      } else {
        const { id } = await api('/plans', { method: 'POST', body: form });
        onSaved?.(id);
      }
      window.dispatchEvent(new Event('planner:plans-changed'));
      onClose();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={plan ? 'Plan bearbeiten' : 'Neuer Plan'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{plan ? 'Speichern' : 'Plan erstellen'}</button>
        </>
      }
    >
      <label className="field"><span>Planname</span>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus
          onKeyDown={(e) => e.key === 'Enter' && save()} />
      </label>
      <label className="field"><span>Beschreibung</span>
        <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <div className="field">
        <span className="field-label">Farbe</span>
        <div className="color-dots">
          {PLAN_COLORS.map((c) => (
            <button key={c} className={`color-dot ${form.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} aria-label={c} />
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field-label">Symbol</span>
        <div className="row gap4 wrap">
          {PLAN_ICONS.map((ic) => (
            <button key={ic} className={`icon-pick ${form.icon === ic ? 'on' : ''}`} onClick={() => setForm({ ...form, icon: ic })}>{ic}</button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default function HubPage() {
  const [plans, setPlans] = useState(null);
  const [search, setSearch] = useState('');
  const [params, setParams] = useSearchParams();
  const [showNew, setShowNew] = useState(params.get('neu') === '1');
  const navigate = useNavigate();
  const { toastError } = useToast();

  const load = () => api('/plans').then(setPlans).catch(toastError);
  useEffect(() => { load(); }, []);
  useEffect(() => { if (params.get('neu') === '1') { setShowNew(true); setParams({}); } }, [params, setParams]);

  const toggleFav = async (e, plan) => {
    e.stopPropagation();
    await api(`/plans/${plan.id}/favorite`, { method: 'PUT', body: { favorite: !plan.favorite } }).catch(toastError);
    window.dispatchEvent(new Event('planner:plans-changed'));
    load();
  };

  if (!plans) return <Spinner />;
  const filtered = plans.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const favs = filtered.filter((p) => p.favorite);
  const rest = filtered.filter((p) => !p.favorite);

  const Card = ({ plan }) => {
    const done = plan.taskCount ? Math.round((plan.doneCount / plan.taskCount) * 100) : 0;
    return (
      <div className="plan-card" onClick={() => navigate(`/plan/${plan.id}`)}>
        <button className={`iconbtn fav ${plan.favorite ? 'on' : ''}`} onClick={(e) => toggleFav(e, plan)} aria-label="Favorit">
          <Icon name={plan.favorite ? 'starFill' : 'star'} size={17} />
        </button>
        <div className="row gap12">
          <span className="plan-card-icon" style={{ background: plan.color }}>{plan.icon}</span>
          <div className="grow">
            <b className="block ellipsis" style={{ paddingRight: 24 }}>{plan.name}</b>
            <span className="text2 small">{plan.memberCount} {plan.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}</span>
          </div>
        </div>
        <div>
          <div className="row between small text2" style={{ marginBottom: 4 }}>
            <span>{plan.doneCount}/{plan.taskCount} erledigt</span>
            {plan.lateCount > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{plan.lateCount} verspätet</span>}
          </div>
          <div className="progressbar"><i style={{ width: `${done}%`, background: 'var(--primary)' }} /></div>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="row gap12 wrap" style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Planner-Hub</h1>
        <span className="grow" />
        <input className="input" style={{ width: 220 }} placeholder="Pläne durchsuchen" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={16} /> Neuer Plan</button>
      </div>

      {plans.length === 0 ? (
        <EmptyState icon="board" title="Willkommen bei Planner!" text="Erstellen Sie Ihren ersten Plan, um Aufgaben im Team zu organisieren.">
          <button className="btn btn-primary mt8" onClick={() => setShowNew(true)}><Icon name="plus" size={16} /> Ersten Plan erstellen</button>
        </EmptyState>
      ) : (
        <>
          {favs.length > 0 && (
            <>
              <h3 style={{ margin: '0 0 10px' }}>Favoriten</h3>
              <div className="hub-grid" style={{ marginBottom: 24 }}>{favs.map((p) => <Card key={p.id} plan={p} />)}</div>
            </>
          )}
          {rest.length > 0 && (
            <>
              <h3 style={{ margin: '0 0 10px' }}>Alle Pläne</h3>
              <div className="hub-grid">{rest.map((p) => <Card key={p.id} plan={p} />)}</div>
            </>
          )}
        </>
      )}

      {showNew && <PlanDialog onClose={() => setShowNew(false)} onSaved={(id) => id && navigate(`/plan/${id}`)} />}
    </div>
  );
}
