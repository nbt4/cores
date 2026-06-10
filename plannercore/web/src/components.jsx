import { useEffect, useRef, useState } from 'react';
import Icon from './icons.jsx';
import { initials, LABEL_COLORS, labelName } from './util.js';

export function Avatar({ user, size = 30 }) {
  if (!user) return null;
  return (
    <span
      className="avatar"
      title={user.name}
      style={{ width: size, height: size, fontSize: size * 0.38, background: user.avatarColor || '#888' }}
    >
      {initials(user.name)}
    </span>
  );
}

export function AvatarStack({ users, max = 3, size = 26 }) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map((u) => <Avatar key={u.id} user={u} size={size} />)}
      {rest > 0 && (
        <span className="avatar avatar-rest" style={{ width: size, height: size, fontSize: size * 0.36 }}>+{rest}</span>
      )}
    </span>
  );
}

export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Schließen"><Icon name="close" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// Dropdown-Menü, das sich bei Klick außerhalb schließt
export function Menu({ trigger, children, align = 'right', width }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      <span onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>{trigger}</span>
      {open && (
        <div className={`menu menu-${align}`} style={width ? { width } : null} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button className={`menu-item ${danger ? 'danger' : ''}`} onClick={onClick}>
      {icon && <Icon name={icon} size={16} />}
      <span>{label}</span>
    </button>
  );
}

export function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

export function EmptyState({ icon = 'inbox', title, text, children }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={40} /></div>
      <h3>{title}</h3>
      {text && <p className="text2">{text}</p>}
      {children}
    </div>
  );
}

// Mehrfachauswahl von Personen (Planmitglieder)
export function UserPicker({ members, selected, onChange, placeholder = 'Personen suchen' }) {
  const [q, setQ] = useState('');
  const list = members.filter(
    (m) => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="picker">
      <input className="input" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="picker-list">
        {list.map((m) => {
          const active = selected.includes(m.id);
          return (
            <button
              key={m.id}
              className={`picker-item ${active ? 'active' : ''}`}
              onClick={() => onChange(active ? selected.filter((id) => id !== m.id) : [...selected, m.id])}
            >
              <Avatar user={m} size={28} />
              <span className="grow">
                <span className="block">{m.name}</span>
                <span className="text2 small">{m.email}</span>
              </span>
              {active && <Icon name="check" size={16} />}
            </button>
          );
        })}
        {!list.length && <div className="text2 small pad8">Keine Personen gefunden</div>}
      </div>
    </div>
  );
}

// Auswahl der 25 Bezeichnungen
export function LabelPicker({ plan, selected, onChange }) {
  return (
    <div className="label-picker">
      {LABEL_COLORS.map(([, color], idx) => {
        const active = selected.includes(idx);
        return (
          <button
            key={idx}
            className={`label-row ${active ? 'active' : ''}`}
            onClick={() => onChange(active ? selected.filter((i) => i !== idx) : [...selected, idx])}
          >
            <span className="label-swatch" style={{ background: color }} />
            <span className="grow left">{labelName(plan, idx)}</span>
            {active && <Icon name="check" size={16} />}
          </button>
        );
      })}
    </div>
  );
}

export function LabelChip({ plan, idx, small, onRemove }) {
  const color = LABEL_COLORS[idx]?.[1] || '#888';
  return (
    <span className={`label-chip ${small ? 'small' : ''}`} style={{ background: color }}>
      {labelName(plan, idx)}
      {onRemove && (
        <button className="chip-x" onClick={onRemove} aria-label="Entfernen"><Icon name="close" size={11} /></button>
      )}
    </span>
  );
}

// Eingabefeld, das beim Verlassen speichert (für Inline-Bearbeitung)
export function BlurInput({ value, onSave, className = 'input', textarea, placeholder, ...rest }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  const commit = () => { if (v !== (value ?? '')) onSave(v); };
  const Comp = textarea ? 'textarea' : 'input';
  return (
    <Comp
      className={className}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !textarea) e.target.blur();
        if (e.key === 'Escape') { setV(value ?? ''); setTimeout(() => e.target.blur()); }
      }}
      {...rest}
    />
  );
}
