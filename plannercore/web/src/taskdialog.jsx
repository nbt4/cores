import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useAuth, useConfirm, useToast } from './providers.jsx';
import Icon from './icons.jsx';
import { Avatar, BlurInput, LabelChip, Menu, Modal, UserPicker, LabelPicker } from './components.jsx';
import { PRIORITIES, PROGRESS, timeAgo, fmtSize } from './util.js';

export default function TaskDialog({ taskId, plan, onClose, reloadPlan }) {
  const { user } = useAuth();
  const { toastError, toastOk } = useToast();
  const confirm = useConfirm();
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState('');
  const [checkText, setCheckText] = useState('');
  const fileRef = useRef(null);

  const load = () => api(`/tasks/${taskId}`).then(setTask).catch((e) => { toastError(e); onClose(); });
  useEffect(() => { setTask(null); load(); }, [taskId]);

  if (!task) return null;

  // Feld speichern: lokal aktualisieren + an Server senden
  const save = async (patch) => {
    setTask((t) => ({ ...t, ...patch }));
    try {
      await api(`/tasks/${taskId}`, { method: 'PUT', body: patch });
    } catch (e) { toastError(e); load(); }
  };

  const del = async () => {
    if (!(await confirm('Aufgabe löschen', `„${task.title}" endgültig löschen?`))) return;
    try {
      await api(`/tasks/${taskId}`, { method: 'DELETE' });
      onClose();
    } catch (e) { toastError(e); }
  };

  const copy = async () => {
    try {
      await api(`/tasks/${taskId}/copy`, { method: 'POST', body: {} });
      toastOk('Aufgabe wurde kopiert');
      reloadPlan();
    } catch (e) { toastError(e); }
  };

  const addCheck = async () => {
    if (!checkText.trim()) return;
    try {
      const item = await api(`/tasks/${taskId}/checklist`, { method: 'POST', body: { title: checkText } });
      setTask((t) => ({ ...t, checklist: [...t.checklist, item] }));
      setCheckText('');
    } catch (e) { toastError(e); }
  };
  const toggleCheck = async (item) => {
    setTask((t) => ({ ...t, checklist: t.checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)) }));
    try { await api(`/checklist/${item.id}`, { method: 'PUT', body: { done: !item.done } }); } catch (e) { toastError(e); load(); }
  };
  const delCheck = async (item) => {
    setTask((t) => ({ ...t, checklist: t.checklist.filter((c) => c.id !== item.id) }));
    try { await api(`/checklist/${item.id}`, { method: 'DELETE' }); } catch (e) { toastError(e); load(); }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    try {
      const c = await api(`/tasks/${taskId}/comments`, { method: 'POST', body: { body: comment } });
      setTask((t) => ({ ...t, comments: [c, ...t.comments] }));
      setComment('');
    } catch (e) { toastError(e); }
  };
  const delComment = async (c) => {
    if (!(await confirm('Kommentar löschen', 'Diesen Kommentar löschen?'))) return;
    setTask((t) => ({ ...t, comments: t.comments.filter((x) => x.id !== c.id) }));
    try { await api(`/comments/${c.id}`, { method: 'DELETE' }); } catch (e) { toastError(e); load(); }
  };

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const a = await api(`/tasks/${taskId}/attachments`, { method: 'POST', formData: fd });
      setTask((t) => ({ ...t, attachments: [a, ...t.attachments] }));
    } catch (e) { toastError(e); }
  };
  const download = async (a) => {
    try {
      const res = await fetch(`/api/attachments/${a.id}/download`, { credentials: 'include' });
      if (!res.ok) throw new Error('Download fehlgeschlagen');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const el = Object.assign(document.createElement('a'), { href: url, download: a.name });
      el.click();
      URL.revokeObjectURL(url);
    } catch (e) { toastError(e); }
  };
  const delAttachment = async (a) => {
    if (!(await confirm('Anhang löschen', `„${a.name}" löschen?`))) return;
    setTask((t) => ({ ...t, attachments: t.attachments.filter((x) => x.id !== a.id) }));
    try { await api(`/attachments/${a.id}`, { method: 'DELETE' }); } catch (e) { toastError(e); load(); }
  };

  const assignedMembers = plan.members.filter((m) => task.assignees.includes(m.id));
  const doneCount = task.checklist.filter((c) => c.done).length;

  return (
    <Modal
      wide
      title={
        <span className="row gap8">
          <button
            className={`tcard-check ${task.progress === 100 ? 'done' : ''}`}
            onClick={() => save({ progress: task.progress === 100 ? 0 : 100 })}
            title="Erledigt umschalten"
          >
            <Icon name={task.progress === 100 ? 'checkCircle' : 'circle'} size={20} />
          </button>
          <span>Aufgabendetails</span>
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={copy}><Icon name="copy" size={15} /> Kopieren</button>
          <button className="btn btn-danger" onClick={del}><Icon name="trash" size={15} /> Löschen</button>
        </>
      }
    >
      <BlurInput
        className="input"
        style={{ fontSize: 17, fontWeight: 600 }}
        value={task.title}
        onSave={(v) => v.trim() && save({ title: v.trim() })}
      />
      <div className="text2 small mt8">
        {task.createdByName ? `Erstellt von ${task.createdByName}` : 'Erstellt'} {timeAgo(task.createdAt)}
        {' · '}Bucket: {plan.buckets.find((b) => b.id === task.bucketId)?.name}
      </div>

      <div className="task-grid">
        <div>
          <div className="field-label mt16">Zugewiesen zu</div>
          <div className="row gap4 wrap">
            {assignedMembers.map((m) => (
              <span key={m.id} className="assignee-chip">
                <Avatar user={m} size={24} /> {m.name}
                <button className="chip-x" style={{ color: 'var(--text2)' }}
                  onClick={() => save({ assignees: task.assignees.filter((id) => id !== m.id) })}>
                  <Icon name="close" size={12} />
                </button>
              </span>
            ))}
            <Menu width={290} align="left"
              trigger={<button className="btn btn-subtle btn-sm"><Icon name="plus" size={14} /> Zuweisen</button>}>
              <div onClick={(e) => e.stopPropagation()} style={{ padding: 8 }}>
                <UserPicker members={plan.members} selected={task.assignees} onChange={(ids) => save({ assignees: ids })} />
              </div>
            </Menu>
          </div>

          <div className="field-label mt16">Bezeichnungen</div>
          <div className="row gap4 wrap">
            {task.labels.map((idx) => (
              <LabelChip key={idx} plan={plan} idx={idx} onRemove={() => save({ labels: task.labels.filter((i) => i !== idx) })} />
            ))}
            <Menu width={260} align="left"
              trigger={<button className="btn btn-subtle btn-sm"><Icon name="label" size={14} /> Hinzufügen</button>}>
              <div onClick={(e) => e.stopPropagation()} style={{ padding: 4 }}>
                <LabelPicker plan={plan} selected={task.labels} onChange={(labels) => save({ labels })} />
              </div>
            </Menu>
          </div>

          <label className="field mt16"><span>Bucket</span>
            <select className="input" value={task.bucketId} onChange={(e) => save({ bucketId: Number(e.target.value) })}>
              {plan.buckets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        </div>
        <div>
          <label className="field mt16"><span>Status</span>
            <select className="input" value={task.progress} onChange={(e) => save({ progress: Number(e.target.value) })}>
              {PROGRESS.map((p) => <option key={p.value} value={p.value}>{p.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Priorität</span>
            <select className="input" value={task.priority} onChange={(e) => save({ priority: Number(e.target.value) })}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.name}</option>)}
            </select>
          </label>
          <div className="row gap8">
            <label className="field grow"><span>Startdatum</span>
              <input type="date" className="input" value={task.startDate || ''} onChange={(e) => save({ startDate: e.target.value || null })} />
            </label>
            <label className="field grow"><span>Fälligkeitsdatum</span>
              <input type="date" className="input" value={task.dueDate || ''} onChange={(e) => save({ dueDate: e.target.value || null })} />
            </label>
          </div>
        </div>
      </div>

      <div className="task-section">
        <h4><Icon name="edit" size={15} /> Notizen</h4>
        <BlurInput textarea className="input" rows={3} placeholder="Hier Notizen eingeben…"
          value={task.description} onSave={(v) => save({ description: v })} />
      </div>

      <div className="task-section">
        <h4><Icon name="checklist" size={15} /> Checkliste {task.checklist.length > 0 && <span className="text2">({doneCount}/{task.checklist.length})</span>}</h4>
        {task.checklist.map((item) => (
          <div key={item.id} className={`check-item ${item.done ? 'done' : ''}`}>
            <input type="checkbox" checked={item.done} onChange={() => toggleCheck(item)} />
            <span className="grow ci-title">{item.title}</span>
            <button className="iconbtn" onClick={() => delCheck(item)} aria-label="Element löschen"><Icon name="trash" size={14} /></button>
          </div>
        ))}
        <div className="row gap8 mt8">
          <input className="input" placeholder="Element hinzufügen" value={checkText}
            onChange={(e) => setCheckText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCheck()} />
          <button className="btn" onClick={addCheck} disabled={!checkText.trim()}><Icon name="plus" size={15} /></button>
        </div>
      </div>

      <div className="task-section">
        <h4><Icon name="attach" size={15} /> Anlagen</h4>
        {task.attachments.map((a) => (
          <div key={a.id} className="attachment-row">
            <Icon name="attach" size={16} />
            <span className="grow">
              <a href="#" className="block ellipsis" onClick={(e) => { e.preventDefault(); download(a); }}>{a.name}</a>
              <span className="text2 small">{fmtSize(a.size)} · {a.uploadedBy || ''} · {timeAgo(a.createdAt)}</span>
            </span>
            <button className="iconbtn" onClick={() => download(a)} aria-label="Herunterladen"><Icon name="download" size={15} /></button>
            <button className="iconbtn" onClick={() => delAttachment(a)} aria-label="Löschen"><Icon name="trash" size={15} /></button>
          </div>
        ))}
        <input ref={fileRef} type="file" hidden onChange={(e) => { if (e.target.files[0]) uploadFile(e.target.files[0]); e.target.value = ''; }} />
        <button className="btn" onClick={() => fileRef.current.click()}><Icon name="plus" size={15} /> Datei anfügen</button>
      </div>

      <div className="task-section">
        <h4><Icon name="comment" size={15} /> Kommentare</h4>
        <div className="row gap8" style={{ alignItems: 'flex-start' }}>
          <Avatar user={user} size={30} />
          <div className="grow">
            <textarea className="input" rows={2} placeholder="Kommentar eingeben" value={comment} onChange={(e) => setComment(e.target.value)} />
            <button className="btn btn-primary btn-sm mt8" onClick={sendComment} disabled={!comment.trim()}>Senden</button>
          </div>
        </div>
        <div className="mt8">
          {task.comments.map((c) => (
            <div key={c.id} className="comment">
              <Avatar user={{ name: c.name || 'Gelöscht', avatarColor: c.avatarColor }} size={30} />
              <div className="grow">
                <div className="row gap8">
                  <b>{c.name || 'Gelöschter Benutzer'}</b>
                  <span className="text2 small">{timeAgo(c.createdAt)}</span>
                  <span className="grow" />
                  {(c.userId === user.id || user.role === 'admin') && (
                    <button className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => delComment(c)} aria-label="Kommentar löschen">
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
