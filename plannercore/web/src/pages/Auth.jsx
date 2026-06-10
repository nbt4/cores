import { useState } from 'react';
import { useAuth, useToast } from '../providers.jsx';

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#31752f" />
      <rect x="6" y="8" width="6" height="17" rx="1.5" fill="#fff" opacity=".95" />
      <rect x="13" y="8" width="6" height="12" rx="1.5" fill="#fff" opacity=".8" />
      <rect x="20" y="8" width="6" height="8" rx="1.5" fill="#fff" opacity=".65" />
    </svg>
  );
}

export default function AuthPage() {
  const { login } = useAuth();
  const { toastError } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo"><Logo /> Planner</div>
        <h2 style={{ margin: '0 0 18px' }}>Anmelden</h2>
        <label className="field"><span>Benutzername</span>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
        </label>
        <label className="field"><span>Passwort</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={busy}>
          {busy ? 'Bitte warten…' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}
