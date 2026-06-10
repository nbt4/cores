import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth, useTheme, useToast } from './providers.jsx';
import { api } from './api.js';
import Icon from './icons.jsx';
import { Avatar, Menu, Modal, Spinner } from './components.jsx';
import { timeAgo, PLAN_COLORS } from './util.js';
import AuthPage from './pages/Auth.jsx';
import HubPage from './pages/Hub.jsx';
import PlanPage from './pages/Plan.jsx';
import MyTasksPage from './pages/MyTasks.jsx';
import AdminPage from './pages/Admin.jsx';

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="rgba(255,255,255,.22)" />
      <rect x="6" y="8" width="6" height="17" rx="1.5" fill="currentColor" opacity=".95" />
      <rect x="13" y="8" width="6" height="12" rx="1.5" fill="currentColor" opacity=".8" />
      <rect x="20" y="8" width="6" height="8" rx="1.5" fill="currentColor" opacity=".65" />
    </svg>
  );
}

const NOTIF_TEXT = {
  task_assigned: (p) => `${p.by} hat Ihnen „${p.taskTitle}" zugewiesen`,
  comment: (p) => `${p.by} hat „${p.taskTitle}" kommentiert`,
  plan_added: (p) => `${p.by} hat Sie zum Plan „${p.planName}" hinzugefügt`,
  task_due: (p) => `„${p.taskTitle}" ist bald fällig`,
  task_overdue: (p) => `„${p.taskTitle}" ist überfällig`,
};
const NOTIF_ICON = { task_assigned: 'user', comment: 'comment', plan_added: 'users', task_due: 'clock', task_overdue: 'alert' };

function NotificationBell() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const navigate = useNavigate();
  const load = useCallback(() => api('/notifications').then(setData).catch(() => {}), []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const open = (n) => {
    api('/notifications/read', { method: 'PUT', body: { ids: [n.id] } }).then(load);
    if (n.payload.planId) {
      navigate(`/plan/${n.payload.planId}${n.payload.taskId ? `?task=${n.payload.taskId}` : ''}`);
    }
  };

  return (
    <Menu
      width={340}
      trigger={
        <button className="iconbtn" aria-label="Benachrichtigungen">
          <Icon name="bell" size={19} />
          {data.unread > 0 && <span className="badge">{data.unread > 9 ? '9+' : data.unread}</span>}
        </button>
      }
    >
      <div className="row between" style={{ padding: '6px 10px' }}>
        <b>Benachrichtigungen</b>
        {data.unread > 0 && (
          <button className="btn btn-subtle btn-sm" onClick={(e) => { e.stopPropagation(); api('/notifications/read', { method: 'PUT', body: {} }).then(load); }}>
            Alle gelesen
          </button>
        )}
      </div>
      <div className="menu-sep" />
      {data.items.length === 0 && <div className="text2 small" style={{ padding: 14, textAlign: 'center' }}>Keine Benachrichtigungen</div>}
      {data.items.slice(0, 15).map((n) => (
        <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => open(n)}>
          <span className="notif-icon"><Icon name={NOTIF_ICON[n.type] || 'bell'} size={17} /></span>
          <span className="grow">
            <span className="block" style={{ lineHeight: 1.35 }}>{(NOTIF_TEXT[n.type] || (() => n.type))(n.payload)}</span>
            <span className="text2 small">{n.payload.planName || ''} · {timeAgo(n.createdAt)}</span>
          </span>
        </div>
      ))}
    </Menu>
  );
}

function ProfileDialog({ onClose }) {
  const { user, updateMe } = useAuth();
  const { mode, setMode } = useTheme();
  const { toastOk, toastError } = useToast();
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const save = async () => {
    try {
      await updateMe({ ...(newPw ? { password: newPw, currentPassword: curPw } : {}) });
      toastOk('Profil gespeichert');
      onClose();
    } catch (e) { toastError(e); }
  };

  return (
    <Modal title="Mein Profil" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <label className="field"><span>Benutzername</span><input className="input" value={user.username} disabled /></label>
      {user.email && (
        <label className="field"><span>E-Mail</span><input className="input" value={user.email} disabled /></label>
      )}
      <div className="field">
        <span className="field-label">Darstellung</span>
        <div className="row gap8">
          {[['light', 'Hell', 'sun'], ['dark', 'Dunkel', 'moon'], ['system', 'System', 'settings']].map(([v, l, ic]) => (
            <button key={v} className={`btn ${mode === v ? 'btn-primary' : ''}`} onClick={() => setMode(v)}><Icon name={ic} size={15} />{l}</button>
          ))}
        </div>
      </div>
      <div className="field-label" style={{ marginTop: 18 }}>Passwort ändern (optional)</div>
      <label className="field"><span>Aktuelles Passwort</span><input className="input" type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} autoComplete="current-password" /></label>
      <label className="field"><span>Neues Passwort</span><input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" /></label>
    </Modal>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const { toggle } = useTheme();
  const [plans, setPlans] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const loadPlans = useCallback(() => api('/plans').then(setPlans).catch(() => setPlans([])), []);
  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { setSideOpen(false); }, [location.pathname]);
  useEffect(() => {
    const h = () => loadPlans();
    window.addEventListener('planner:plans-changed', h);
    return () => window.removeEventListener('planner:plans-changed', h);
  }, [loadPlans]);

  const favorites = (plans || []).filter((p) => p.favorite);
  const others = (plans || []).filter((p) => !p.favorite);

  return (
    <div className="shell">
      <header className="topbar">
        <button className="iconbtn only-mobile" onClick={() => setSideOpen(!sideOpen)} aria-label="Menü"><Icon name="menu" size={20} /></button>
        <NavLink to="/" className="topbar-logo"><Logo /> <span className="hide-mobile">Planner</span></NavLink>
        <span className="grow" />
        <button className="iconbtn" onClick={toggle} aria-label="Design umschalten">
          <Icon name={document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
        <NotificationBell />
        <Menu
          trigger={<button className="iconbtn" aria-label="Konto" style={{ width: 'auto', padding: '0 4px' }}><Avatar user={user} size={30} /></button>}
        >
          <div style={{ padding: '8px 12px' }}>
            <b className="block">{user.username}</b>
            {user.email && <span className="text2 small">{user.email}</span>}
          </div>
          <div className="menu-sep" />
          <button className="menu-item" onClick={() => setShowProfile(true)}><Icon name="user" size={16} /><span>Mein Profil</span></button>
          {user.isAdmin && (
            <button className="menu-item" onClick={() => navigate('/admin')}><Icon name="settings" size={16} /><span>Benutzerverwaltung</span></button>
          )}
          <div className="menu-sep" />
          <button className="menu-item" onClick={logout}><Icon name="logout" size={16} /><span>Abmelden</span></button>
        </Menu>
      </header>
      <div className="main">
        <div className={`sidebar-backdrop ${sideOpen ? 'show' : ''}`} onClick={() => setSideOpen(false)} />
        <nav className={`sidebar ${sideOpen ? 'open' : ''}`}>
          <NavLink to="/" end className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
            <Icon name="home" size={18} /> Planner-Hub
          </NavLink>
          <NavLink to="/mytasks" className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
            <Icon name="checklist" size={18} /> Meine Aufgaben
          </NavLink>
          {favorites.length > 0 && <div className="side-section">Favoriten</div>}
          {favorites.map((p) => <PlanLink key={p.id} plan={p} />)}
          <div className="side-section">Alle Pläne</div>
          {plans === null && <div className="text2 small" style={{ padding: '4px 10px' }}>Laden…</div>}
          {others.map((p) => <PlanLink key={p.id} plan={p} />)}
          {plans?.length === 0 && <div className="text2 small" style={{ padding: '4px 10px' }}>Noch keine Pläne</div>}
          <button className="side-item" style={{ marginTop: 8 }} onClick={() => { navigate('/?neu=1'); }}>
            <Icon name="plus" size={18} /> Neuer Plan
          </button>
        </nav>
        <div className="content">
          <Routes>
            <Route path="/" element={<HubPage />} />
            <Route path="/mytasks" element={<MyTasksPage />} />
            <Route path="/plan/:id" element={<PlanPage />} />
            <Route path="/admin" element={user.isAdmin ? <AdminPage /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
      {showProfile && <ProfileDialog onClose={() => setShowProfile(false)} />}
    </div>
  );
}

function PlanLink({ plan }) {
  return (
    <NavLink to={`/plan/${plan.id}`} className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
      <span className="side-plan-icon" style={{ background: plan.color }}>{plan.icon}</span>
      <span className="ellipsis">{plan.name}</span>
    </NavLink>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <AuthPage />;
  return <Shell />;
}
