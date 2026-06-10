// Konstanten und Hilfsfunktionen (Prioritäten/Status wie in Microsoft Planner)

export const PRIORITIES = [
  { value: 1, name: 'Dringend', color: '#d13438', icon: 'urgent' },
  { value: 3, name: 'Wichtig', color: '#d13438', icon: 'important' },
  { value: 5, name: 'Mittel', color: '#797775', icon: 'medium' },
  { value: 9, name: 'Niedrig', color: '#0078d4', icon: 'low' },
];
export const prio = (v) => PRIORITIES.find((p) => p.value === v) || PRIORITIES[2];

export const PROGRESS = [
  { value: 0, name: 'Nicht begonnen', color: '#8a8886', icon: 'circle' },
  { value: 50, name: 'In Arbeit', color: '#0078d4', icon: 'half' },
  { value: 100, name: 'Erledigt', color: '#107c10', icon: 'check' },
];
export const prog = (v) => PROGRESS.find((p) => p.value === v) || PROGRESS[0];

// 25 Bezeichnungsfarben wie in Planner; Namen sind pro Plan umbenennbar.
export const LABEL_COLORS = [
  ['Rosa', '#e74c8e'], ['Rot', '#d13438'], ['Gelb', '#eaa300'], ['Grün', '#107c10'], ['Blau', '#0078d4'],
  ['Lila', '#8764b8'], ['Bronze', '#a74f01'], ['Limette', '#73aa24'], ['Aqua', '#00b7c3'], ['Grau', '#69797e'],
  ['Silber', '#859599'], ['Braun', '#8e562e'], ['Cranberry', '#c50f1f'], ['Orange', '#ca5010'], ['Pfirsich', '#ff8c42'],
  ['Ringelblume', '#c19c00'], ['Hellgrün', '#13a10e'], ['Dunkelgrün', '#0b6a0b'], ['Blaugrün', '#038387'], ['Hellblau', '#3a96dd'],
  ['Dunkelblau', '#004e8c'], ['Lavendel', '#7160e8'], ['Pflaume', '#77004d'], ['Hellgrau', '#7a8a8e'], ['Dunkelgrau', '#394146'],
];

export function labelName(plan, idx) {
  const custom = plan?.labels?.find((l) => l.idx === idx)?.name;
  return custom || LABEL_COLORS[idx]?.[0] || `Label ${idx + 1}`;
}

export const PLAN_COLORS = ['#31752f', '#0078d4', '#8764b8', '#ca5010', '#c50f1f', '#038387', '#986f0b', '#004e8c', '#77004d', '#394146'];
export const PLAN_ICONS = ['📋', '🚀', '🎯', '📦', '🛠️', '📣', '💡', '🧪', '🏠', '🎨', '📚', '⚙️', '🌱', '🔬', '🎉', '🧭'];

// ---- Datums-Helfer (Datumswerte sind 'YYYY-MM-DD'-Strings) ----

export function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('sv-SE'); // ergibt YYYY-MM-DD in lokaler Zeit
}

export function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y.slice(2)}`;
}

export function fmtDateLong(s) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export const isOverdue = (t) => t.dueDate && t.progress < 100 && t.dueDate < todayStr();

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  if (diff < 604800) return `vor ${Math.floor(diff / 86400)} Tg.`;
  return new Date(iso).toLocaleDateString('de-DE');
}

// Kategorie für Gruppierung/Filter nach Fälligkeit
export function dueCategory(t) {
  if (!t.dueDate) return 'none';
  const today = todayStr();
  if (t.dueDate < today && t.progress < 100) return 'late';
  if (t.dueDate === today) return 'today';
  if (t.dueDate === todayStr(1)) return 'tomorrow';
  const d = new Date(t.dueDate + 'T00:00:00');
  const now = new Date(todayStr() + 'T00:00:00');
  const day = (now.getDay() + 6) % 7; // Montag=0
  const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + (6 - day));
  const endOfNextWeek = new Date(endOfWeek); endOfNextWeek.setDate(endOfWeek.getDate() + 7);
  if (d < now) return 'today'; // überfällig aber erledigt -> wie vergangen behandeln
  if (d <= endOfWeek) return 'thisweek';
  if (d <= endOfNextWeek) return 'nextweek';
  return 'future';
}

export const DUE_GROUPS = [
  ['late', 'Verspätet'], ['today', 'Heute'], ['tomorrow', 'Morgen'], ['thisweek', 'Diese Woche'],
  ['nextweek', 'Nächste Woche'], ['future', 'Zukünftig'], ['none', 'Kein Datum'],
];

// Sortierreihenfolge per Drag & Drop: Mittelwert zwischen Nachbarn
export function orderBetween(prev, next) {
  if (prev == null && next == null) return 1000;
  if (prev == null) return next - 1000;
  if (next == null) return prev + 1000;
  return (prev + next) / 2;
}

export function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
