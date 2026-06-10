import { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from './api.js';
import { useConfirm, useToast } from './providers.jsx';
import Icon from './icons.jsx';
import { Avatar, BlurInput, Menu, MenuItem, LabelChip } from './components.jsx';
import {
  PRIORITIES, PROGRESS, prio, prog, DUE_GROUPS, dueCategory, todayStr,
  orderBetween, fmtDate, isOverdue, labelName, LABEL_COLORS,
} from './util.js';

// Fälligkeits-Spalte -> konkretes Datum beim Ablegen/Anlegen
function dueForGroup(key) {
  const now = new Date(todayStr() + 'T00:00:00');
  const day = (now.getDay() + 6) % 7;
  switch (key) {
    case 'late': return todayStr(-1);
    case 'today': return todayStr();
    case 'tomorrow': return todayStr(1);
    case 'thisweek': return todayStr(6 - day);
    case 'nextweek': return todayStr(13 - day);
    case 'future': return todayStr(30);
    default: return null;
  }
}

function buildColumns(groupBy, plan, tasks) {
  const sorted = [...tasks].sort((a, b) => a.orderIndex - b.orderIndex);
  if (groupBy === 'bucket') {
    return plan.buckets.map((b) => ({
      key: `b${b.id}`, title: b.name, bucket: b,
      tasks: sorted.filter((t) => t.bucketId === b.id),
      defaults: { bucketId: b.id },
    }));
  }
  if (groupBy === 'progress') {
    return PROGRESS.map((p) => ({
      key: `p${p.value}`, title: p.name, color: p.color,
      tasks: sorted.filter((t) => t.progress === p.value),
      defaults: { progress: p.value },
    }));
  }
  if (groupBy === 'priority') {
    return PRIORITIES.map((p) => ({
      key: `r${p.value}`, title: p.name, color: p.color,
      tasks: sorted.filter((t) => t.priority === p.value),
      defaults: { priority: p.value },
    }));
  }
  if (groupBy === 'due') {
    return DUE_GROUPS.map(([key, name]) => ({
      key: `d${key}`, title: name,
      tasks: sorted.filter((t) => dueCategory(t) === key),
      defaults: { dueDate: dueForGroup(key) },
    }));
  }
  if (groupBy === 'assignee') {
    return [
      ...plan.members.map((m) => ({
        key: `u${m.id}`, title: m.name, member: m,
        tasks: sorted.filter((t) => t.assignees.includes(m.id)),
        defaults: { assignees: [m.id] },
      })),
      { key: 'u0', title: 'Nicht zugewiesen', tasks: sorted.filter((t) => !t.assignees.length), defaults: {} },
    ];
  }
  // Bezeichnungen: nur benannte oder verwendete Labels anzeigen
  const usedIdx = LABEL_COLORS.map((_, idx) => idx).filter(
    (idx) => plan.labels.some((l) => l.idx === idx) || tasks.some((t) => t.labels.includes(idx))
  );
  return [
    ...usedIdx.map((idx) => ({
      key: `l${idx}`, title: labelName(plan, idx), color: LABEL_COLORS[idx][1],
      tasks: sorted.filter((t) => t.labels.includes(idx)),
      defaults: { labels: [idx] },
    })),
    { key: 'l-1', title: 'Keine Bezeichnung', tasks: sorted.filter((t) => !t.labels.length), defaults: {} },
  ];
}

export function TaskCard({ task, plan, onOpen, updateTask }) {
  const assignees = plan.members.filter((m) => task.assignees.includes(m.id));
  const pr = prio(task.priority);
  const late = isOverdue(task);
  const toggleDone = (e) => {
    e.stopPropagation();
    updateTask(task.id, { progress: task.progress === 100 ? 0 : 100 });
  };
  return (
    <div className={`tcard ${task.progress === 100 ? 'done' : ''}`} onClick={() => onOpen(task.id)}>
      {task.labels.length > 0 && (
        <div className="tcard-labels">
          {task.labels.map((idx) => <LabelChip key={idx} plan={plan} idx={idx} small />)}
        </div>
      )}
      <div className="tcard-title">
        <button className={`tcard-check ${task.progress === 100 ? 'done' : ''}`} onClick={toggleDone}
          title={task.progress === 100 ? 'Als nicht erledigt markieren' : 'Als erledigt markieren'}>
          <Icon name={task.progress === 100 ? 'checkCircle' : task.progress === 50 ? 'half' : 'circle'} size={17}
            style={task.progress === 50 ? { color: 'var(--blue)' } : null} />
        </button>
        <span className="grow">{task.title}</span>
      </div>
      {(task.dueDate || task.priority !== 5 || task.checklistTotal > 0 || task.hasDescription || task.commentCount > 0 || task.attachmentCount > 0) && (
        <div className="tcard-meta">
          {task.dueDate && (
            <span className={`meta-chip ${late ? 'late' : ''}`}><Icon name="calendar" size={13} /> {fmtDate(task.dueDate)}</span>
          )}
          {task.priority !== 5 && (
            <span className="meta-chip" style={{ color: pr.color }} title={pr.name}><Icon name={pr.icon} size={14} /></span>
          )}
          {task.checklistTotal > 0 && (
            <span className="meta-chip"><Icon name="checklist" size={13} /> {task.checklistDone}/{task.checklistTotal}</span>
          )}
          {task.hasDescription && <span className="meta-chip" title="Enthält Notizen"><Icon name="grid" size={13} /></span>}
          {task.commentCount > 0 && <span className="meta-chip"><Icon name="comment" size={13} /> {task.commentCount}</span>}
          {task.attachmentCount > 0 && <span className="meta-chip"><Icon name="attach" size={13} /> {task.attachmentCount}</span>}
        </div>
      )}
      {assignees.length > 0 && (
        <div className="tcard-foot">
          <span />
          <span className="avatar-stack">{assignees.slice(0, 4).map((m) => <Avatar key={m.id} user={m} size={24} />)}</span>
        </div>
      )}
    </div>
  );
}

function QuickAdd({ column, groupBy, plan, createTask }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const submit = async () => {
    if (!title.trim()) return setOpen(false);
    const fields = { title: title.trim(), bucketId: plan.buckets[0]?.id, ...column.defaults };
    setTitle('');
    await createTask(fields);
  };
  if (!open) {
    return (
      <button className="add-card" onClick={() => setOpen(true)}><Icon name="plus" size={15} /> Aufgabe hinzufügen</button>
    );
  }
  return (
    <div className="quick-add">
      <input className="input" placeholder="Aufgabenname eingeben" autoFocus value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false); }} />
      <div className="row gap8 mt8">
        <button className="btn btn-primary btn-sm" onClick={submit}>Hinzufügen</button>
        <button className="btn btn-subtle btn-sm" onClick={() => setOpen(false)}>Abbrechen</button>
      </div>
    </div>
  );
}

export default function Board({ plan, tasks, groupBy, reload, updateTask, createTask, openTask, patchTaskLocal }) {
  const { toastError } = useToast();
  const confirm = useConfirm();
  const [addingBucket, setAddingBucket] = useState(false);
  const columns = useMemo(() => buildColumns(groupBy, plan, tasks), [groupBy, plan, tasks]);

  const renameBucket = async (bucket, name) => {
    if (!name.trim()) return;
    try { await api(`/buckets/${bucket.id}`, { method: 'PUT', body: { name } }); reload(); } catch (e) { toastError(e); }
  };
  const deleteBucket = async (bucket) => {
    const n = plan.tasks.filter((t) => t.bucketId === bucket.id).length;
    if (!(await confirm('Bucket löschen', n ? `„${bucket.name}" und ${n} enthaltene Aufgabe(n) löschen?` : `„${bucket.name}" löschen?`))) return;
    try { await api(`/buckets/${bucket.id}`, { method: 'DELETE' }); reload(); } catch (e) { toastError(e); }
  };
  const addBucket = async (name) => {
    setAddingBucket(false);
    if (!name.trim()) return;
    try { await api(`/plans/${plan.id}/buckets`, { method: 'POST', body: { name } }); reload(); } catch (e) { toastError(e); }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;

    if (type === 'COLUMN') {
      if (source.index === destination.index) return;
      const list = plan.buckets.filter((b) => `col-b${b.id}` !== draggableId);
      const moved = plan.buckets.find((b) => `col-b${b.id}` === draggableId);
      const prev = list[destination.index - 1]?.orderIndex ?? null;
      const next = list[destination.index]?.orderIndex ?? null;
      const orderIndex = orderBetween(prev, next);
      try {
        await api(`/buckets/${moved.id}`, { method: 'PUT', body: { orderIndex } });
        reload();
      } catch (e) { toastError(e); }
      return;
    }

    const taskId = Number(draggableId.split('|')[0]);
    const task = plan.tasks.find((t) => t.id === taskId);
    const destCol = columns.find((c) => c.key === destination.droppableId);
    const srcCol = columns.find((c) => c.key === source.droppableId);
    if (!task || !destCol) return;

    // Neue Sortierposition innerhalb der Zielspalte berechnen
    const destList = destCol.tasks.filter((t) => t.id !== taskId);
    const prev = destList[destination.index - 1]?.orderIndex ?? null;
    const next = destList[destination.index]?.orderIndex ?? null;
    const patch = { orderIndex: orderBetween(prev, next) };

    if (destination.droppableId !== source.droppableId) {
      if (groupBy === 'bucket') patch.bucketId = destCol.bucket.id;
      else if (groupBy === 'progress') patch.progress = destCol.defaults.progress;
      else if (groupBy === 'priority') patch.priority = destCol.defaults.priority;
      else if (groupBy === 'due') patch.dueDate = destCol.defaults.dueDate ?? null;
      else if (groupBy === 'assignee') {
        const srcId = Number(srcCol.key.slice(1));
        const destId = Number(destCol.key.slice(1));
        let assignees = task.assignees.filter((id) => id !== srcId);
        if (destId) assignees = [...new Set([...assignees, destId])];
        patch.assignees = assignees;
      } else if (groupBy === 'labels') {
        const srcIdx = Number(srcCol.key.slice(1));
        const destIdx = Number(destCol.key.slice(1));
        let labels = task.labels.filter((i) => i !== srcIdx);
        if (destIdx >= 0) labels = [...new Set([...labels, destIdx])];
        patch.labels = labels;
      }
    }
    updateTask(taskId, patch);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" direction="horizontal" type="COLUMN">
        {(boardProvided) => (
          <div className="board" ref={boardProvided.innerRef} {...boardProvided.droppableProps}>
            {columns.map((col, colIdx) => (
              <Draggable key={col.key} draggableId={`col-${col.key}`} index={colIdx} isDragDisabled={groupBy !== 'bucket'}>
                {(colProvided) => (
                  <div className="column" ref={colProvided.innerRef} {...colProvided.draggableProps}>
                    <div className="column-head" {...colProvided.dragHandleProps}>
                      {col.member && <Avatar user={col.member} size={24} />}
                      {col.color && <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, flexShrink: 0 }} />}
                      {col.bucket ? (
                        <BlurInput
                          className="input"
                          style={{ border: 'none', background: 'transparent', fontWeight: 600, padding: '2px 4px', minHeight: 0, width: 'auto', flex: 1 }}
                          value={col.bucket.name}
                          onSave={(v) => renameBucket(col.bucket, v)}
                        />
                      ) : (
                        <span className="grow ellipsis">{col.title}</span>
                      )}
                      <span className="count">{col.tasks.length}</span>
                      {col.bucket && (
                        <Menu trigger={<button className="iconbtn" style={{ width: 28, height: 28 }} aria-label="Bucketoptionen"><Icon name="dots" size={16} /></button>}>
                          <MenuItem icon="trash" label="Bucket löschen" danger onClick={() => deleteBucket(col.bucket)} />
                        </Menu>
                      )}
                    </div>
                    <Droppable droppableId={col.key} type="TASK">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`column-body ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                        >
                          <QuickAdd column={col} groupBy={groupBy} plan={plan} createTask={createTask} />
                          {col.tasks.map((task, idx) => (
                            <Draggable key={`${task.id}|${col.key}`} draggableId={`${task.id}|${col.key}`} index={idx}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={{ ...dragProvided.draggableProps.style, opacity: dragSnapshot.isDragging ? 0.85 : 1 }}
                                >
                                  <TaskCard task={task} plan={plan} onOpen={openTask} updateTask={updateTask} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )}
              </Draggable>
            ))}
            {boardProvided.placeholder}
            {groupBy === 'bucket' && (
              addingBucket ? (
                <div className="column">
                  <div className="quick-add">
                    <BlurInput className="input" placeholder="Bucket-Name" autoFocus value="" onSave={addBucket} />
                  </div>
                </div>
              ) : (
                <button className="add-column" onClick={() => setAddingBucket(true)}>
                  <Icon name="plus" size={16} /> Neuer Bucket
                </button>
              )
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
