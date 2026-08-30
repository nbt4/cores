# Cores Suite Designsystem

Version 1.0 · verbindlich für Cores Dashboard, RentalCore, WarehouseCore, PlannerCore, ProcurementCore und jeden zukünftigen Core.

## 1. Grundsatz und Quelle der Wahrheit

Alle Cores sind Teile einer Anwendungssuite. Produktlogos, Navigation und Fachdaten unterscheiden die Services; Typografie, Farbpalette, Abstände, Bedienelemente, Tabellen, Sidebars, Zustände und Dashboard-Aufbau unterscheiden sich nicht.

Die technische Quelle der Wahrheit ist [`theme/tsunami-theme.css`](../theme/tsunami-theme.css). Die Datei wird mit `./scripts/sync-design-system.sh` in jeden Webclient kopiert. Generierte `web/src/cores-theme.css`-Dateien und `rentalcore/web/static/css/cores-theme.css` werden nie direkt geändert. `./scripts/check-design-system.sh` ist vor jedem UI-Commit auszuführen.

Neue Werte werden nur dann zum Theme hinzugefügt, wenn ein vorhandener Token die fachliche Bedeutung nicht ausdrücken kann. Service-spezifische Farben, Abstandsleitern oder Schriftgrößen sind nicht zulässig. Fachlich notwendige Visualisierungen dürfen zusätzliche Datenfarben verwenden; sie dürfen nicht als Navigations-, Aktions- oder Dekorationsfarbe auftreten.

## 2. Marken- und Farbregeln

| Rolle | Token | Dunkles Theme | Verwendung |
|---|---|---:|---|
| Anwendungshintergrund | `--surface-0` | `#0B0B0B` | Seitenfläche |
| Sidebar / primäre Karte | `--surface-1` | `#111111` | Navigation, Karten |
| Tabellenkopf / Eingabe | `--surface-2` | `#161616` | erhöhte Flächen |
| Hover / Fokusfläche | `--surface-3` | `#1F1F1F` | Interaktion |
| stärkste erhöhte Fläche | `--surface-4` | `#2A2A2A` | Menüs, Dialogdetails |
| Primärtext | `--text-primary` | `#FFFFFF` | Überschriften, wichtige Werte |
| Sekundärtext | `--text-secondary` | `#AAAAAA` | Fließtext, Beschreibungen |
| Metatext | `--text-muted` | `#888888` | Zeitstempel, Hilfstext |
| Markenakzent | `--color-accent-red` | `#D0021B` | Primäraktion, aktive Navigation, Fokus |
| Erfolg | `--color-success` | `#22C55E` | ausschließlich positiver Status |
| Warnung | `--color-warning` | `#EAB308` | ausschließlich Handlungsbedarf |
| Fehler | `--color-error` | Rot | ausschließlich Fehler / kritisch |
| Information | `--color-info` | `#60A5FA` | neutraler Informationsstatus |

Rot ist der einzige dekorative Akzent. Semantische Farben werden nie zur Produktkennzeichnung eingesetzt. Flächige Verläufe, Glows und bunte Service-Farben sind in Arbeitsoberflächen nicht zulässig. Das helle Theme verwendet die im kanonischen CSS definierten semantischen Gegenwerte.

Logoregeln und Asset-Rollen stehen ergänzend in [`BRANDING.md`](BRANDING.md). Geöffnete Sidebars zeigen das horizontale Produktlogo auf einer Fläche von 176 × 48 px, eingeklappte Sidebars die Bildmarke mit 40 × 40 px. Logos werden nicht verzerrt, beschnitten oder dekorativ gefiltert.

## 3. Typografie

Inter ist die einzige UI-Schrift. Systemschriften sind ausschließlich Fallback. JetBrains Mono ist nur für IDs, technische Referenzen, Code und tabellarische Zahlen vorgesehen.

| Token | Größe | Verwendung |
|---|---:|---|
| `--text-xs` | 12 px | Metadaten, Tabellenkopf, Eyebrow |
| `--text-sm` | 14 px | kompakter Fließtext, Navigation, Controls |
| `--text-base` | 16 px | Standard-Fließtext |
| `--text-lg` | 18 px | Untertitel, Kartenüberschrift |
| `--text-xl` | 20 px | Abschnittsüberschrift |
| `--text-2xl` | 24 px | Seitentitel mobil |
| `--text-3xl` | 30 px | Seitentitel Desktop |
| `--text-4xl` | 36 px | seltene Display-Zahl |

Standardgewicht ist 400, Controls und Labels 600, Überschriften und KPI-Werte 700. 800/900 werden nicht für normale UI-Hierarchie verwendet. Fließtext hat Zeilenhöhe 1,5; Überschriften 1,25. UI-Text bleibt in normaler Groß-/Kleinschreibung. Nur Eyebrows, Tabellenköpfe und kurze Statuslabels sind versal und erhalten `--tracking-wider` oder `--tracking-widest`.

## 4. Raster, Abstände und Radien

Alle Abstände folgen dem 4-px-Raster `--space-1` bis `--space-12`. Standard-Seitengutter sind 16 px mobil und 24 px ab Tablet/Desktop. Inhaltsbreite endet bei 1440 px. Dashboard-Abschnitte haben 24 px vertikalen Abstand, Karten innerhalb eines Rasters 12–16 px.

Radien: 6 px für kleine Elemente, 10 px für Controls, 12 px für Karten und Tabellencontainer, 16 px nur für große Dialoge. Vollrunde Formen sind Avataren, Statuspunkten und echten Pills vorbehalten. Schatten kennzeichnen nur räumlich überlagerte Elemente wie Dialoge, Dropdowns und Toasts; Karten nutzen Linie und Fläche.

## 5. Anwendungsshell und Navigation

Desktop-Sidebars sind in jedem Core 256 px geöffnet und 80 px eingeklappt. Sie starten geöffnet, behalten die Benutzerentscheidung pro Service und verwenden dieselbe 200-ms-Transition. Die Logozeile ist 80 px hoch. Navigationseinträge sind mindestens 40 px hoch, 14 px groß und besitzen 10 px Radius. Aktiv: roter Hintergrund bzw. roter Indikator mit weißem Text. Inaktiv: Sekundärtext, Hover auf `--surface-2`.

Unter 768 px wird die Sidebar zum maximal 320 px breiten Drawer. Oben steht eine 56-px-Leiste, unten eine 64-px-Tabbar inklusive Safe-Area. Berührungsziele sind mindestens 44 × 44 px. Die mobile Kopfzeile enthält kein zusätzliches Logo; das Produktlogo bleibt im Drawer.

Die Reihenfolge ist: produktbezogene Hauptnavigation, fachliche Unterbereiche, Link zum Cores Dashboard, Benutzerkontext, Abmelden. Benennung, Icons und Positionen bleiben innerhalb eines Services stabil.

## 6. Bedienelemente

Eingaben, Textareas und Selects sind 40 px hoch, mobil mindestens 44 px, mit 10 px Radius, `--surface-2`, 1-px-`--border-input` und 14-px-Text. Fokus verwendet Rot plus einen 3-px-Fokusring mit 15 % Deckkraft. Placeholder nutzen `--text-placeholder`. Disabled-Zustände behalten die Struktur, verwenden 50 % Deckkraft und `not-allowed`.

Suchfelder verwenden ausschließlich `.suite-search-field` als Wrapper. Das Lupen-Icon ist dessen direktes erstes Kind; das Eingabefeld folgt direkt danach. Das Primitive reserviert links 40 px und verhindert damit in allen Breakpoints eine Überlagerung von Icon, Placeholder und eingegebenem Text. Service-spezifische `left`-/`padding-left`-Korrekturen sind nicht zulässig.

Native Selects erhalten in jedem Core denselben Chevron, 40 px Mindesthöhe und explizit gestylte `option`-Elemente. Optionen sind `--surface-2`/`--text-primary`, ausgewählte oder fokussierte Optionen `--surface-3`. Browser-Standardfarben sind nicht zulässig.

Buttons: sekundär `--surface-1` plus Linie; primär ausschließlich roter Vollton; destruktiv Fehlerfarbe; Icon-only quadratisch. Text und Icon haben 8 px Abstand. Primäraktionen stehen rechts bzw. im mobilen Flow zuerst. Pro Abschnitt gibt es höchstens eine Primäraktion.

## 7. Tabellen, Karten, Menüs und Scrollbars

Tabellen liegen in `.suite-table-wrap`: 1-px-Linie, 12-px-Radius, horizontales Scrollen auf kleinen Screens. Tabellenköpfe sind 12 px, 600, versal, `--surface-2`, mit 12 × 16 px Innenabstand. Zellen sind 14 px, 12 × 16 px, mit subtiler unterer Linie. Zeilen-Hover verwendet `--surface-2`; Zebra-Streifen werden nicht verwendet. Zahlen sind rechtsbündig und tabellarisch, Aktionen rechts. Leere Zustände ersetzen niemals die Tabellenstruktur durch dekorative Illustrationen.

Karten verwenden `--surface-1`, 1-px-`--border-default` und 12 px Radius. Standard-Padding ist 20 px. Verschachtelte Karten werden vermieden; innerhalb einer Karte trennen Linien oder 16–24 px Abstand die Inhalte.

Dropdown-Menüs sind `--surface-3`, 10 px Radius, 1-px-Linie und `--shadow-dropdown`; Einträge sind mindestens 40 px hoch. Scrollbars sind suite-weit 8 px, sekundäre Scrollbereiche 6 px. Track, Thumb, Hover und Active stammen ausschließlich aus den Scrollbar-Tokens.

## 8. Dashboard-Vertrag

Jeder Core besitzt ein fachlich angepasstes Dashboard, folgt aber derselben Informationsreihenfolge:

1. Header mit rotem/live-semantischem Eyebrow, zeitabhängiger Begrüßung, genau einem Erklärungssatz und optional Zeitstempel/Aktion.
2. Vier primäre KPI-Karten im 4/2/1-Spaltenraster.
3. Bereich „Jetzt bearbeiten“ mit priorisierten Vorgängen; daneben Schnellstart oder Systemzustand.
4. Fachlicher Hauptbereich (z. B. Termine, Materialfluss, Aufgaben, Beschaffungsablauf).
5. Letzte Aktivitäten oder kommende Ereignisse.

Begrüßungen lauten ausschließlich `Guten Morgen, <Anzeigename>.`, `Guten Tag, <Anzeigename>.` oder `Guten Abend, <Anzeigename>.`; Grenzwerte sind 11:00 und 18:00 Uhr. Wenn kein Anzeigename vorhanden ist, entfällt nur Name und Komma. Ein Anzeigename aus `user_profiles.display_name` bzw. Vor-/Nachname hat Vorrang vor dem Benutzernamen. Umgangssprachliche oder service-spezifische Varianten wie „Moin“ sind nicht zulässig.

Dashboards nutzen `.suite-dashboard`, `.suite-dashboard-header`, `.suite-dashboard-*`, `.suite-kpi-grid` und die zugehörigen Karten-Primitives. Fachdaten und Aktionen variieren, visuelle Hierarchie und Reihenfolge nicht.

## 9. Zustände, Bewegung und Barrierefreiheit

Loading-Zustände halten das spätere Layout als Skeleton stabil. Leere Zustände erklären kurz den Zustand und bieten höchstens eine passende Aktion. Fehler erscheinen beim betroffenen Bereich und bieten bei wiederholbaren Ladevorgängen „Erneut versuchen“. Toasts ergänzen, ersetzen aber keine dauerhafte Fehlermeldung.

Transitions dauern 150 ms für Hover/Fokus, 250 ms für Layout und 350 ms nur für größere Overlays. Bewegung verschiebt Elemente höchstens 2 px. `prefers-reduced-motion` wird global respektiert. Tastaturfokus ist immer sichtbar. Text und Bedienelemente erfüllen mindestens WCAG AA; Information darf nie nur über Farbe vermittelt werden.

## 10. Responsive Regeln

Die verbindlichen Breakpoints sind 480, 640, 768, 1024, 1280 und 1536 px. Komponenten werden inhaltlich umgebrochen, nicht pauschal verkleinert. Tabellen scrollen horizontal. Formulare wechseln von mehreren Spalten auf eine. KPI-Raster wechseln 4 → 2 → 1. Primäraktionen bleiben erreichbar und wichtige Informationen werden nicht ausschließlich per `display: none` entfernt.

## 11. Regeln für neue und überarbeitete UI

- Vor UI-Arbeit diese Datei und `theme/README.md` lesen.
- Erst vorhandene Tokens und `suite-*`-Primitives nutzen; keine lokale Designpalette anlegen.
- Harte Werte sind nur für mathematisch/fachlich notwendige Visualisierung erlaubt und werden kommentiert.
- Neue generische Muster zuerst kanonisch dokumentieren und im Theme implementieren, dann synchronisieren.
- Bei einer berührten alten Oberfläche sichtbare Abweichungen im gleichen Bereich mitbereinigen.
- Screenshots auf 390, 768, 1280 und 1536 px prüfen; Tastaturbedienung sowie Light/Dark-Kontrast kontrollieren.
- `./scripts/check-design-system.sh`, alle betroffenen Frontend-Builds und Tests müssen vor Veröffentlichung erfolgreich sein.

Ausnahmen benötigen eine dokumentierte fachliche Begründung in der jeweiligen Service-README und dürfen die Shell, Typografie, Farbsemantik, Formulare, Tabellen oder Dashboard-Hierarchie nicht verändern.
