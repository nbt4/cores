import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth, useConfirm, useToast } from '../providers.jsx';
import Icon from '../icons.jsx';
import { Avatar, Modal, Spinner } from '../components.jsx';

function UserDialog({ existing, onClose, onSaved }) {
  const { toastError } = useToast();
  const [form, setForm] = useState({
    name: existing?.name || '', email: existing?.email || '', password: '', role: existing?.role || 'user',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    try {
      if (existing) {
        await api(`/users/admin/${existing.id}`, {
          method: 'PUT',
          body: { name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) },
        });
      } else {
        await api('/users/admin', { method: 'POST', body: form });
      }
      onSaved();
      onClose();
    } catch (e) { toastError(e); }
  };

  return (
    <Modal title={existing ? 'Benutzer bearbeiten' : 'Benutzer anlegen'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <label className="field"><span>Name</span><input className="input" value={form.name} onChange={set('name')} /></label>
      <label className="field"><span>E-Mail</span><input className="input" type="email" value={form.email} onChange={set('email')} disabled={!!existing} /></label>
      <label className="field"><span>{existing ? 'Neues Passwort (leer = unverändert)' : 'Passwort'}</span>
        <input className="input" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
      </label>
      <label className="field"><span>Rolle</span>
        <select className="input" value={form.role} onChange={set('role')}>
          <option value="user">Benutzer</option>
          <option value="admin">Administrator</option>
        </select>
      </label>
    </Modal>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toastError, toastOk } = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState(null);
  const [dialog, setDialog] = useState(null); // 'new' | user object

  const load = () => api('/users/admin').then(setUsers).catch(toastError);
  useEffect(() => { load(); }, []);

  const del = async (u) => {
    if (!(await confirm('Benutzer löschen', `${u.name} (${u.email}) endgültig löschen? Eigene Pläne werden auf Sie übertragen.`))) return;
    try {
      await api(`/users/admin/${u.id}`, { method: 'DELETE' });
      toastOk('Benutzer gelöscht');
      load();
    } catch (e) { toastError(e); }
  };

  if (!users) return <Spinner />;

  return (
    <div className="page">
      <div className="row gap12 wrap" style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Benutzerverwaltung</h1>
        <span className="grow" />
        <button className="btn btn-primary" onClick={() => setDialog('new')}><Icon name="plus" size={16} /> Benutzer anlegen</button>
      </div>
      <div className="chart-card" style={{ padding: 0 }}>
        {users.map((u) => (
          <div key={u.id} className="row gap12" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <Avatar user={u} size={34} />
            <span className="grow">
              <span className="block"><b>{u.name}</b> {u.id === user.id && <span className="text2 small">(Sie)</span>}</span>
              <span className="text2 small">{u.email} · {u.planCount} Pläne · seit {new Date(u.createdAt).toLocaleDateString('de-DE')}</span>
            </span>
            <span className={`chip-toggle ${u.role === 'admin' ? 'on' : ''}`} style={{ cursor: 'default', margin: 0 }}>
              {u.role === 'admin' ? 'Administrator' : 'Benutzer'}
            </span>
            <button className="iconbtn" onClick={() => setDialog(u)} aria-label="Bearbeiten"><Icon name="edit" size={16} /></button>
            {u.id !== user.id && (
              <button className="iconbtn" onClick={() => del(u)} aria-label="Löschen"><Icon name="trash" size={16} /></button>
            )}
          </div>
        ))}
      </div>
      {dialog && <UserDialog existing={dialog === 'new' ? null : dialog} onClose={() => setDialog(null)} onSaved={load} />}
    </div>
  );
}
