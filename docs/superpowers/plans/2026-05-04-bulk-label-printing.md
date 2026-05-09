# Bulk Label Printing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Drucken-Button im Label Designer öffnet einen Dialog, in dem der Nutzer wählen kann: einzelnes Label, eine Checkbox-Auswahl, oder alle Labels drucken — als Multi-Page-Dokument in einem einzigen Druckvorgang.

**Architecture:** Rein Frontend-seitig. Ein neuer `PrintDialog` wird inline in `LabelDesignerPage.tsx` implementiert. Eine `printBulkLabels`-Hilfsfunktion erzeugt ein Multi-Page-HTML-Dokument in einem neuen Browserfenster mit `@page`-Regeln für die Zebra-Label-Dimensionen. Bestehende `printPreview()`-Funktion bleibt für den "Einzeln"-Modus erhalten.

**Tech Stack:** React, TypeScript, CSS, Browser Print API (`window.print()`)

**Spec:** `docs/superpowers/specs/2026-05-04-bulk-label-printing-design.md`

---

## File Map

| Datei | Aktion | Zweck |
|-------|--------|-------|
| `warehousecore/web/src/pages/LabelDesignerPage.tsx` | Modify | PrintDialog inline, State, Button-Umbau |
| `warehousecore/web/src/pages/LabelDesignerPage.css` | Modify | CSS für PrintDialog |

---

### Task 1: PrintDialog State und Button-Umbau

**Files:**
- Modify: `warehousecore/web/src/pages/LabelDesignerPage.tsx:1-9` (imports)
- Modify: `warehousecore/web/src/pages/LabelDesignerPage.tsx:81-93` (state)
- Modify: `warehousecore/web/src/pages/LabelDesignerPage.tsx:1004` (button)

- [ ] **Step 1: Import `X` icon aus lucide-react hinzufügen**

In `LabelDesignerPage.tsx` Zeile 3, `X` zum Import hinzufügen:

```typescript
  Trash2, Download, Printer, QrCode, Barcode, Type, Save,
  Image as ImageIcon, Lock, Unlock, Grid3x3, Eye, EyeOff, X,
```

- [ ] **Step 2: PrintDialog State hinzufügen**

Nach Zeile 99 (`const [imgCache, setImgCache] = ...`) neuen State einfügen:

```typescript
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
```

- [ ] **Step 3: Drucken-Button umbauen**

In Zeile 1004 den bestehenden Button ändern von:

```tsx
<button onClick={printPreview} disabled={!previewDevice} className="btn-action">
  <Printer size={15} /> Drucken
</button>
```

zu:

```tsx
<button onClick={() => setPrintDialogOpen(true)} className="btn-action">
  <Printer size={15} /> Drucken
</button>
```

- [ ] **Step 4: Build prüfen**

Run: `cd /opt/dev/cores/warehousecore/web && npm run build`
Expected: Erfolgreich (PrintDialog wird noch nicht referenziert im JSX, nur State existiert)

---

### Task 2: printBulkLabels Hilfsfunktion

**Files:**
- Modify: `warehousecore/web/src/pages/LabelDesignerPage.tsx:74-77` (nach `snapVal`, vor Component)

- [ ] **Step 1: printBulkLabels Funktion einfügen**

Nach der `snapVal`-Funktion (Zeile 77), vor dem `/* ── Component ──` Kommentar einfügen:

```typescript
function printBulkLabels(labelPaths: string[], widthMm: number, heightMm: number) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.title = `${labelPaths.length} Labels drucken`;
  const style = win.document.createElement('style');
  style.textContent = [
    `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`,
    `body { margin: 0; padding: 0; background: white; }`,
    `img { display: block; width: ${widthMm}mm; height: ${heightMm}mm; page-break-after: always; }`,
    `img:last-child { page-break-after: avoid; }`,
  ].join('\n');
  win.document.head.appendChild(style);
  let loaded = 0;
  for (const path of labelPaths) {
    const img = win.document.createElement('img');
    img.src = path;
    img.onload = img.onerror = () => {
      if (++loaded === labelPaths.length) { win.focus(); win.print(); }
    };
    win.document.body.appendChild(img);
  }
}
```

- [ ] **Step 2: Build prüfen**

Run: `cd /opt/dev/cores/warehousecore/web && npm run build`
Expected: Erfolgreich

---

### Task 3: PrintDialog Komponent

**Files:**
- Modify: `warehousecore/web/src/pages/LabelDesignerPage.tsx` (vor `export default function LabelDesignerPage`)

- [ ] **Step 1: PrintDialog Komponent einfügen**

Nach der `printBulkLabels`-Funktion, vor dem `/* ── Component ──` Kommentar, einfügen:

```tsx
type PrintMode = 'single' | 'selection' | 'all';
type PrintTab  = 'devices' | 'cases';

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
  devices: Device[];
  cases: CaseSummary[];
  labelW: number;
  labelH: number;
  onPrintSingle: () => void;
}

function PrintDialog({ open, onClose, devices, cases, labelW, labelH, onPrintSingle }: PrintDialogProps) {
  const [mode, setMode]         = useState<PrintMode | null>(null);
  const [tab, setTab]           = useState<PrintTab>('devices');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!open) return null;

  const devicesWithLabel = devices.filter(d => d.label_path);
  const casesWithLabel   = cases.filter(c => c.label_path);
  const currentList      = tab === 'devices' ? devicesWithLabel : casesWithLabel;
  const currentAll       = tab === 'devices' ? devices : cases;

  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const ids = currentList.map(i => tab === 'devices' ? (i as Device).device_id : `CASE-${(i as CaseSummary).case_id}`);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const handlePrint = () => {
    let paths: string[] = [];
    if (mode === 'all') {
      if (tab === 'devices') paths = devicesWithLabel.map(d => d.label_path!);
      else                   paths = casesWithLabel.map(c => c.label_path!);
    } else {
      if (tab === 'devices') {
        paths = devicesWithLabel
          .filter(d => selected.has(d.device_id))
          .map(d => d.label_path!);
      } else {
        paths = casesWithLabel
          .filter(c => selected.has(`CASE-${c.case_id}`))
          .map(c => c.label_path!);
      }
    }
    if (paths.length === 0) return;
    printBulkLabels(paths, labelW, labelH);
    onClose();
  };

  const printCount = mode === 'all'
    ? currentList.length
    : [...selected].filter(id =>
        tab === 'devices'
          ? devicesWithLabel.some(d => d.device_id === id)
          : casesWithLabel.some(c => `CASE-${c.case_id}` === id)
      ).length;

  return (
    <div className="pd-overlay" onClick={onClose}>
      <div className="pd-dialog" onClick={e => e.stopPropagation()}>
        <div className="pd-header">
          <h2>Labels drucken</h2>
          <button onClick={onClose} className="pd-close"><X size={18} /></button>
        </div>

        {/* Step 1: Mode selection */}
        {!mode && (
          <div className="pd-modes">
            <button className="pd-mode-card" onClick={() => { onPrintSingle(); onClose(); }}>
              <Printer size={24} />
              <span className="pd-mode-title">Aktuelles Label</span>
              <span className="pd-mode-desc">Nur das angezeigte Label drucken</span>
            </button>
            <button className="pd-mode-card" onClick={() => setMode('selection')}>
              <Printer size={24} />
              <span className="pd-mode-title">Auswahl</span>
              <span className="pd-mode-desc">Bestimmte Labels auswählen</span>
            </button>
            <button className="pd-mode-card" onClick={() => setMode('all')}>
              <Printer size={24} />
              <span className="pd-mode-title">Alle</span>
              <span className="pd-mode-desc">Alle Labels eines Typs drucken</span>
            </button>
          </div>
        )}

        {/* Step 2+3: Tab selection + list */}
        {mode && (
          <>
            <div className="pd-tabs">
              <button
                className={`pd-tab${tab === 'devices' ? ' active' : ''}`}
                onClick={() => { setTab('devices'); setSelected(new Set()); }}
              >
                Geräte ({devicesWithLabel.length})
              </button>
              <button
                className={`pd-tab${tab === 'cases' ? ' active' : ''}`}
                onClick={() => { setTab('cases'); setSelected(new Set()); }}
              >
                Cases ({casesWithLabel.length})
              </button>
            </div>

            {mode === 'selection' && (
              <div className="pd-list-container">
                <div className="pd-list-header">
                  <label className="pd-checkbox-row">
                    <input
                      type="checkbox"
                      checked={currentList.length > 0 && currentList.every(i => {
                        const id = tab === 'devices' ? (i as Device).device_id : `CASE-${(i as CaseSummary).case_id}`;
                        return selected.has(id);
                      })}
                      onChange={toggleAll}
                    />
                    <span>Alle auswählen</span>
                  </label>
                  <span className="pd-count">{printCount} von {currentList.length}</span>
                </div>
                <div className="pd-list">
                  {(currentAll as (Device | CaseSummary)[]).map(item => {
                    const isDevice = tab === 'devices';
                    const id = isDevice ? (item as Device).device_id : `CASE-${(item as CaseSummary).case_id}`;
                    const name = isDevice ? (item as Device).product_name ?? (item as Device).device_id : (item as CaseSummary).name;
                    const hasLabel = isDevice ? !!(item as Device).label_path : !!(item as CaseSummary).label_path;
                    return (
                      <label key={id} className={`pd-checkbox-row${!hasLabel ? ' disabled' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          onChange={() => toggleItem(id)}
                          disabled={!hasLabel}
                        />
                        <span className="pd-item-id">{id}</span>
                        <span className="pd-item-name">{name}</span>
                        {!hasLabel && <span className="pd-no-label">(kein Label)</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {mode === 'all' && (
              <div className="pd-all-summary">
                <p>{currentList.length} {tab === 'devices' ? 'Geräte' : 'Cases'} mit Label werden gedruckt.</p>
                {currentList.length === 0 && (
                  <p className="pd-warning">Keine Labels vorhanden. Bitte erst Labels generieren.</p>
                )}
              </div>
            )}

            <div className="pd-footer">
              <button className="btn-action" onClick={() => { setMode(null); setSelected(new Set()); }}>
                ← Zurück
              </button>
              <button
                className="btn-action btn-primary"
                onClick={handlePrint}
                disabled={printCount === 0}
              >
                <Printer size={15} /> {printCount} Label{printCount !== 1 ? 's' : ''} drucken
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build prüfen**

Run: `cd /opt/dev/cores/warehousecore/web && npm run build`
Expected: Erfolgreich (Komponent ist definiert, aber noch nicht im JSX eingebunden)

---

### Task 4: PrintDialog im JSX einbinden

**Files:**
- Modify: `warehousecore/web/src/pages/LabelDesignerPage.tsx:1023-1025` (Ende des JSX)

- [ ] **Step 1: PrintDialog vor dem schließenden `</div>` der Seite einfügen**

In `LabelDesignerPage.tsx`, direkt vor dem letzten `</div>` der Komponente (Zeile 1024, vor `);`), einfügen:

```tsx
      <PrintDialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        devices={devices}
        cases={cases}
        labelW={labelW}
        labelH={labelH}
        onPrintSingle={printPreview}
      />
```

Das vollständige Ende sieht dann so aus:

```tsx
        </div>
      </div>

      <PrintDialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        devices={devices}
        cases={cases}
        labelW={labelW}
        labelH={labelH}
        onPrintSingle={printPreview}
      />
    </div>
  );
}
```

- [ ] **Step 2: Build prüfen**

Run: `cd /opt/dev/cores/warehousecore/web && npm run build`
Expected: Erfolgreich, keine TypeScript-Fehler

---

### Task 5: CSS für PrintDialog

**Files:**
- Modify: `warehousecore/web/src/pages/LabelDesignerPage.css` (am Ende, vor den Media Queries)

- [ ] **Step 1: PrintDialog CSS einfügen**

Am Ende von `LabelDesignerPage.css`, vor der Zeile `@media (max-width: 1400px)` (ca. Zeile 657), einfügen:

```css
/* ── Print Dialog ────────────────────────────────── */

.pd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.pd-dialog {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  width: min(520px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.pd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.pd-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #e0e0e0;
}

.pd-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}

.pd-close:hover { color: #fff; }

.pd-modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding: 1.5rem;
}

.pd-mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #ccc;
  cursor: pointer;
  transition: all 0.15s;
}

.pd-mode-card:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  color: #fff;
}

.pd-mode-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.pd-mode-desc {
  font-size: 0.72rem;
  opacity: 0.6;
  text-align: center;
}

.pd-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0 1.5rem;
}

.pd-tab {
  padding: 0.75rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.pd-tab.active {
  color: #818cf8;
  border-bottom-color: #818cf8;
}

.pd-tab:hover { color: #fff; }

.pd-list-container {
  padding: 0 1.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.pd-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.pd-count {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.4);
}

.pd-list {
  overflow-y: auto;
  max-height: 320px;
  padding: 0.25rem 0;
}

.pd-checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.25rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.82rem;
  color: #ccc;
  transition: background 0.1s;
}

.pd-checkbox-row:hover { background: rgba(255, 255, 255, 0.04); }

.pd-checkbox-row.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pd-checkbox-row input[type="checkbox"] {
  accent-color: #818cf8;
  width: 15px;
  height: 15px;
  cursor: inherit;
}

.pd-item-id {
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  color: #818cf8;
  min-width: 90px;
}

.pd-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pd-no-label {
  font-size: 0.72rem;
  color: rgba(255, 100, 100, 0.6);
  font-style: italic;
}

.pd-all-summary {
  padding: 2rem 1.5rem;
  text-align: center;
  color: #ccc;
  font-size: 0.9rem;
}

.pd-warning {
  color: rgba(255, 180, 50, 0.8);
  font-size: 0.82rem;
  margin-top: 0.5rem;
}

.pd-footer {
  display: flex;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
```

- [ ] **Step 2: Build prüfen**

Run: `cd /opt/dev/cores/warehousecore/web && npm run build`
Expected: Erfolgreich

---

### Task 6: Manuell im Browser testen

- [ ] **Step 1: Dev-Server starten und PrintDialog testen**

Run: `cd /opt/dev/cores/warehousecore/web && npm run dev`

Manuelle Tests:
1. Label Designer öffnen
2. "Drucken" klicken → Dialog erscheint mit 3 Modus-Karten
3. "Aktuelles Label" → normaler Einzeldruck wie bisher
4. "Auswahl" → Tab-Auswahl (Geräte/Cases) + Checkbox-Liste
5. Items ohne Label sind ausgegraut
6. "Alle auswählen" Toggle funktioniert
7. Zähler zeigt korrekte Anzahl
8. "X Labels drucken" → neues Fenster mit Multi-Page-Dokument
9. "Alle" → Tab-Auswahl + Summary-Ansicht + Drucken
10. "← Zurück" bringt zum Modus-Auswahl-Schritt zurück
11. Overlay-Klick schließt Dialog

---

### Task 7: Commit und Deployment

- [ ] **Step 1: Commit**

```bash
cd /opt/dev/cores/warehousecore
git add web/src/pages/LabelDesignerPage.tsx web/src/pages/LabelDesignerPage.css
git commit -m "feat(labels): add bulk print dialog with single/selection/all modes"
```

- [ ] **Step 2: Push zu GitLab**

```bash
git push origin main
```

- [ ] **Step 3: README-Version prüfen und Docker Image builden + pushen**

Version in README prüfen, dann:

```bash
docker build -t nobentie/warehousecore:5.9.X .
docker push nobentie/warehousecore:5.9.X
docker tag nobentie/warehousecore:5.9.X nobentie/warehousecore:latest
docker push nobentie/warehousecore:latest
```
