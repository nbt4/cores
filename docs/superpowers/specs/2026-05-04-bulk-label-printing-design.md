# Bulk Label Printing — Design Spec

**Datum:** 2026-05-04
**Projekt:** WarehouseCore — LabelDesignerPage
**Ziel:** Nutzer kann beim Klick auf "Drucken" wählen: einzelnes Label, eine Auswahl, oder alle Labels drucken — in einem einzigen Druckvorgang über den Browser-Druckdialog an einen Zebra ZD421.

---

## Kontext

### Aktueller Stand
- `LabelDesignerPage.tsx` (1027 Zeilen) enthält den WYSIWYG Label Designer
- Der **Drucken-Button** (Zeile 1004) ruft `printPreview()` auf, das nur das aktuell im Canvas angezeigte Label druckt
- Labels werden als PNGs unter `/labels/{DEVICE_ID}_label.png` und `/labels/cases/CASE-{ID}_label.png` gespeichert
- `label_path` in `devices` und `cases` Tabellen zeigt an, ob ein Label existiert
- Batch-Generierung existiert bereits (`generateAllLabels`, `generateMissingLabels`), aber nur zum Speichern — nicht zum Drucken
- Drucker: Zebra ZD421, als normaler Systemdrucker installiert, über Browser-Druckdialog erreichbar

### Einschränkungen
- Kein ZPL nötig — Browser `window.print()` reicht
- Label-Dimensionen kommen aus dem aktiven Template (`labelW` × `labelH` mm)
- Nur Items mit vorhandenem `label_path` sind druckbar

---

## Design

### Neuer Drucken-Flow

Der bestehende **Drucken-Button** öffnet statt `printPreview()` einen modalen Dialog `PrintDialog`.

#### Dialog-Aufbau

**Schritt 1 — Modus wählen:**
Drei Buttons/Cards als Auswahloptionen:
1. **Aktuelles Label** — Druckt das gerade im Editor angezeigte Label (bisheriges Verhalten)
2. **Auswahl** — Öffnet eine Checkbox-Liste zur Selektion
3. **Alle** — Druckt alle verfügbaren Labels des gewählten Typs

**Schritt 2 — Typ wählen (nur bei "Auswahl" und "Alle"):**
Zwei Tabs: **Geräte** | **Cases**
- Wechsel zwischen Tabs zeigt die jeweilige Liste
- Zähler zeigt Anzahl verfügbarer Labels pro Typ

**Schritt 3 — Checkbox-Liste (nur bei "Auswahl"):**
- Zeigt Items des gewählten Typs mit: Checkbox, ID, Name
- Items ohne `label_path` sind ausgegraut und nicht auswählbar, mit Hinweis "(kein Label)"
- "Alle auswählen" / "Keine auswählen" Toggle oben
- Zähler: "X von Y ausgewählt"

**Schritt 4 — Drucken:**
- Button "X Labels drucken" (Zahl dynamisch)
- Öffnet neues Browserfenster mit Multi-Page-Dokument
- `window.print()` wird ausgelöst

#### Multi-Page-Druck-Dokument

Das Druckfenster enthält:
```html
<style>
  @page { size: {labelW}mm {labelH}mm; margin: 0; }
  body { margin: 0; }
  img {
    display: block;
    width: {labelW}mm;
    height: {labelH}mm;
    page-break-after: always;
  }
  img:last-child { page-break-after: avoid; }
</style>
<body>
  <img src="/labels/DEV001_label.png" />
  <img src="/labels/DEV002_label.png" />
  <!-- ... -->
</body>
```

Jedes Label wird als `<img>` mit `page-break-after: always` eingefügt. Die `@page`-Regel setzt die physische Seitengröße auf die Label-Dimensionen. Der Zebra ZD421 druckt jede "Seite" als einzelnes Label.

### Datenfluss

```
Drucken-Button → PrintDialog öffnet sich
  → Modus wählen (Einzeln / Auswahl / Alle)
  → Bei "Einzeln": sofort printPreview() wie bisher
  → Bei "Auswahl"/"Alle": Typ wählen (Geräte/Cases)
  → Bei "Auswahl": Checkboxen setzen
  → "Drucken" klicken
  → label_path URLs der ausgewählten Items sammeln
  → Neues Fenster mit Multi-Page-HTML öffnen
  → window.print() → Browser-Druckdialog → Zebra druckt
```

### Komponenten-Struktur

**Neuer Komponent: `PrintDialog`**
- Datei: `warehousecore/web/src/pages/LabelDesignerPage.tsx` (inline, da eng mit dem Designer gekoppelt)
- Props: `open`, `onClose`, `devices`, `cases`, `labelW`, `labelH`, `previewDevice`, `canvasRef`
- State: `mode` ('single' | 'selection' | 'all'), `tab` ('devices' | 'cases'), `selectedIds: Set<string>`

**Änderung am bestehenden Code:**
- `printPreview()` bleibt erhalten für den "Einzeln"-Modus
- Drucken-Button (Zeile 1004) öffnet stattdessen `setPrintDialogOpen(true)`
- Neuer State: `printDialogOpen: boolean`

### Neue Hilfsfunktion: `printBulkLabels`

```typescript
function printBulkLabels(
  labelPaths: string[],
  widthMm: number,
  heightMm: number
) {
  const win = window.open('', '_blank');
  if (!win) return;

  const style = win.document.createElement('style');
  style.textContent = [
    `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`,
    `body { margin: 0; padding: 0; }`,
    `img { display: block; width: ${widthMm}mm; height: ${heightMm}mm; page-break-after: always; }`,
    `img:last-child { page-break-after: avoid; }`,
  ].join('\n');
  win.document.head.appendChild(style);

  let loaded = 0;
  for (const path of labelPaths) {
    const img = win.document.createElement('img');
    img.src = path;
    img.onload = () => { if (++loaded === labelPaths.length) { win.focus(); win.print(); } };
    win.document.body.appendChild(img);
  }
}
```

Wartet bis alle Bilder geladen sind, dann erst `print()`.

---

## Scope

### In Scope
- PrintDialog-Komponent (inline in LabelDesignerPage.tsx)
- Multi-Page-Druckfunktion `printBulkLabels`
- Modus-Auswahl: Einzeln / Auswahl / Alle
- Getrennte Tabs für Geräte und Cases
- Checkbox-Selektion mit Select-All Toggle

### Out of Scope
- Direkte ZPL-Kommunikation mit dem Drucker
- Backend-Änderungen
- Filter nach Status/Zone/Kategorie (kann später ergänzt werden)
- Druck-Warteschlange oder Fortschrittsanzeige
