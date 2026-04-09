# Product Mapping: Auto-Zuordnung & Verwaltung

**Datum:** 2026-04-09  
**Projekt:** RentalCore  
**Scope:** OCR-Extraktion → Produkt-Mapping im Job-Workflow + globale Mapping-Verwaltungsseite

---

## Übersicht

Wenn eine Rechnung per OCR verarbeitet wird, sollen die extrahierten Positionen automatisch mit echten Produkten (oder Paketen) aus der Datenbank verknüpft werden. Gelingt die automatische Zuordnung nicht, muss der Nutzer manuell mappen — direkt im Workflow, inline pro Zeile. Alle Mappings (automatisch wie manuell) werden global persistent gespeichert und sind über eine dedizierte Verwaltungsseite einsehbar und editierbar.

---

## Entscheidungen

| Entscheidung | Gewählt |
|---|---|
| Wo Mappings verwalten? | Dedizierte Seite `/settings/mappings` + Link aus dem Workflow |
| Workflow-Mappings → global? | Ja, immer automatisch gespeichert |
| Blocker bei unmapped Items? | Hard-Block: "Job erstellen" deaktiviert bis alle gemappt |
| Manual-Mapping UX | Inline Search per Zeile (Suchfeld + Vorschläge direkt in der Tabellenzeile) |
| Edit auf Management-Seite | Inline (kein Modal), soft Delete (`is_active = false`) |

---

## Komponenten

### 1. Mapping-Flow (pro Extraktion) — `pdf_mapping.html`

**Änderungen am bestehenden Template:**

- Unmapped-Zeilen zeigen direkt ein Suchfeld (debounced, 300ms) anstatt eines "Zuordnen"-Buttons
- Unter dem Suchfeld erscheinen bis zu 3 Vorschläge (Produkt-Name + Konfidenz %) aus `/api/v1/pdf/products/search`
- Klick auf Vorschlag: Item gemappt, Zeile wird grün, Vorschläge verschwinden
- Fortschrittsbalken oben: `X / Y gemappt`
- Warning-Banner solange Items unmapped sind: "X Positionen noch nicht gemappt — Job kann erst danach erstellt werden."
- "Job erstellen"-Button: `disabled` + visuell ausgegraut bis alle Items gemappt sind
- Link unten links: "🗂 Globale Mappings verwalten →" → `/settings/mappings`

**Datenfluss:**
1. Nutzer tippt im Suchfeld → `GET /api/v1/pdf/products/search?q=...`
2. Nutzer wählt Produkt → `POST /api/v1/pdf/manual-map/:item_id` (existiert bereits)
3. Handler ruft intern `ProductMapper.SaveMapping()` auf → persistiert global in `pdf_product_mappings`

### 2. Auto-Save-Garantie

`SaveManualMapping` in `pdf_handler.go` muss sicherstellen, dass nach dem Setzen des Item-Mappings auch `ProductMapper.SaveMapping()` aufgerufen wird. Prüfen ob das bereits passiert — falls nicht, ergänzen.

### 3. Globale Mapping-Verwaltung — `/settings/mappings`

**Neue Route (UI):**
```
GET /settings/mappings → PDFHandler.ShowMappingManagement
```

**Neues Template:** `mapping_management.html`

Inhalt:
- Suchfeld (filtert OCR-Text und Produktname, clientseitig)
- Filter-Dropdown: Alle / manual / fuzzy / auto
- Tabelle: OCR-Text | → Produkt/Paket | Typ | Verwendet (usage_count) | Aktionen
- Edit-Aktion: klappt die Produkt-Zelle inline auf (Suchfeld + Bestätigen/Abbrechen)
- Delete-Aktion: setzt `is_active = false` via `DELETE /api/v1/pdf/mappings/:id` (existiert bereits)
- Zähler: "X Einträge" (product + package mappings kombiniert)

**Neue API-Endpoints:**
```
GET  /api/v1/pdf/mappings          → GetAllMappingsAPI (product + package, kombiniert)
PUT  /api/v1/pdf/mappings/:id      → UpdateMapping (Produkt/Paket für ein Mapping ändern)
```

`GET /api/v1/pdf/mappings` Response-Format:
```json
{
  "product_mappings": [
    { "mapping_id": 1, "pdf_product_text": "Mikrofon Sennheiser e935",
      "product_id": 12, "product_name": "Sennheiser e935",
      "mapping_type": "manual", "usage_count": 23, "is_active": true }
  ],
  "package_mappings": [
    { "mapping_id": 5, "pdf_package_text": "PA Paket klein",
      "package_id": 3, "package_name": "PA Set S",
      "mapping_type": "fuzzy", "usage_count": 4, "is_active": true }
  ]
}
```

`PUT /api/v1/pdf/mappings/:id` Request-Body:
```json
{ "type": "product", "target_id": 15 }
```
`type` ist `"product"` oder `"package"`, `target_id` ist die neue Produkt- bzw. Paket-ID.

`DELETE /api/v1/pdf/mappings/:id` existiert bereits (`DeleteMapping`). Nimmt Query-Parameter `type=product` oder `type=package` um die richtige Tabelle zu bestimmen.

**Handler-Methoden (neu):**
- `ShowMappingManagement(c *gin.Context)` — rendert Template, lädt alle Mappings
- `GetAllMappingsAPI(c *gin.Context)` — JSON-Liste beider Mapping-Tabellen
- `UpdateMapping(c *gin.Context)` — ändert `product_id` oder `package_id` für ein Mapping

---

## Was existiert bereits

| Komponente | Status |
|---|---|
| `ProductMapper.FindBestMatch()` — fuzzy + gespeicherte Lookups | ✓ existiert |
| `ProductMapper.SaveMapping()` — persistiert in `pdf_product_mappings` | ✓ existiert |
| `ProductMapper.GetAllMappings()` / `DeleteMapping()` | ✓ existiert |
| `PackageMapper` — analoges System für Pakete | ✓ existiert |
| `/api/v1/pdf/products/search` und `/api/v1/pdf/packages/search` | ✓ existiert |
| `/api/v1/pdf/manual-map/:item_id` | ✓ existiert |
| `/api/v1/pdf/mappings/:id` DELETE | ✓ existiert |
| `RunAutoMapping` Endpoint | ✓ existiert |
| Inline-Search UX in `pdf_mapping.html` | ⚠ partiell — braucht Überarbeitung |
| Hard-Blocker "Job erstellen" bis alles gemappt | ⚠ partiell — braucht Verstärkung |
| `GET /settings/mappings` Route + Template | ✗ fehlt |
| `PUT /api/v1/pdf/mappings/:id` | ✗ fehlt |
| `ShowMappingManagement` Handler | ✗ fehlt |

---

## Datenbankschema

Keine neuen Tabellen. Genutzte Tabellen:
- `pdf_product_mappings` (pdf_product_text, normalized_text, product_id, mapping_type, confidence_score, usage_count, last_used_at, is_active)
- `pdf_package_mappings` (analog für Pakete)

---

## Navigation

- Settings-Menü erhält Link "Produkt-Mappings" → `/settings/mappings`
- Mapping-Workflow-Seite erhält Footer-Link "Globale Mappings verwalten →"

---

## Out of Scope

- Bulk-Import von Mappings
- Export der Mapping-Tabelle
- Versionshistorie von Mappings
