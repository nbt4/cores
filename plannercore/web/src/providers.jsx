import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api } from './api.js';

// ---------- Auth ----------
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/v1/planner/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    await api('/v1/auth/login', { method: 'POST', body: { username, password } });
    await checkAuth();
  };
  const checkAuth = async () => {
    const u = await api('/v1/planner/me');
    setUser(u);
  };
  const logout = async () => {
    try {
      await api('/v1/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
  };
  const updateMe = async (patch) => {
    const u = await api('/v1/planner/me', { method: 'PUT', body: patch });
    setUser(u);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, updateMe }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ---------- Theme ----------
const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(localStorage.getItem('planner_theme') || 'system');

  useEffect(() => {
    localStorage.setItem('planner_theme', mode);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const isDark = () => document.documentElement.dataset.theme === 'dark';
  const toggle = () => setMode(isDark() ? 'light' : 'dark');

  return <ThemeCtx.Provider value={{ mode, setMode, toggle }}>{children}</ThemeCtx.Provider>;
}

// ---------- Toasts ----------
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((message, kind = 'error') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const toastError = useCallback((e) => push(e?.message || String(e), 'error'), [push]);
  const toastOk = useCallback((m) => push(m, 'ok'), [push]);

  return (
    <ToastCtx.Provider value={{ toastError, toastOk }}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Bestätigungsdialog ----------
const ConfirmCtx = createContext(null);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((title, text, actionLabel = 'Löschen') => {
    return new Promise((resolve) => setState({ title, text, actionLabel, resolve }));
  }, []);

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div className="modal-backdrop" onMouseDown={() => close(false)}>
          <div className="modal modal-sm" onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px' }}>{state.title}</h3>
            <p className="text2" style={{ margin: '0 0 20px' }}>{state.text}</p>
            <div className="row gap8 end">
              <button className="btn" onClick={() => close(false)}>Abbrechen</button>
              <button className="btn btn-danger" onClick={() => close(true)}>{state.actionLabel}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
