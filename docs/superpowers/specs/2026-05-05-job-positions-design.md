# Job-Positionen (Angebots-Ansicht) — Design Spec

**Datum:** 2026-05-05
**Projekt:** RentalCore + WarehouseCore
**Ziel:** Jobs erhalten eine vollwertige Positionen-Tabelle wie bei einem Angebot/Kostenvoranschlag. Produkte mit Devices, Dienstleistungen, Einzel-/Gesamtpreise, Rabatte, Netto/Brutto. WarehouseCore nutzt die Produktpositionen als Picklist und meldet gescannte Devices live zurück.

---

## Kontext

### Aktueller Stand
- Jobs haben `job_product_requirements` (Produkt + Anzahl) und `jobdevices` (Device-Zuweisungen mit optionalem Einzelpreis)
- Keine Einheiten, kein Folgetag-Faktor, kein Positions-Rabatt, keine Dienstleistungen direkt am Job
- Preisberechnung rudimentär: `itemcostperday × Tage` mit globalem Job-Rabatt
- WarehouseCore hat keinen Picklist-Modus für Jobs

### Was sich ändert
- Neue zentrale `job_positions` Tabelle ersetzt `job_product_requirements`
- Neue `job_position_devices` Tabelle ersetzt `jobdevices` für die Geräte-Zuordnung
- Job-Detailseite zeigt Positionen als Hauptansicht (wie ein Angebot)
- WarehouseCore liest Positionen als Picklist, scannt Devices dagegen

---

## Datenmodell

### Neue Tabelle: `job_positions`

```sql
CREATE TABLE job_positions (
    position_id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(jobID) ON DELETE CASCADE,
    position_type VARCHAR(20) NOT NULL CHECK (position_type IN ('product', 'service')),
    product_id INT REFERENCES products(productID) ON DELETE SET NULL,
    service_item_id INT REFERENCES service_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL DEFAULT '',
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(50) NOT NULL DEFAULT 'Stück',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    follow_day_factor DECIMAL(4,2) NOT NULL DEFAULT 0.50,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_positions_job_id ON job_positions(job_id);
CREATE INDEX idx_job_positions_product_id ON job_positions(product_id);
```

### Neue Tabelle: `job_position_devices`

```sql
CREATE TABLE job_position_devices (
    id BIGSERIAL PRIMARY KEY,
    position_id BIGINT NOT NULL REFERENCES job_positions(position_id) ON DELETE CASCADE,
    device_id VARCHAR(50) NOT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scanned_by VARCHAR(100) DEFAULT ''
);

CREATE INDEX idx_job_position_devices_position ON job_position_devices(position_id);
CREATE INDEX idx_job_position_devices_device ON job_position_devices(device_id);
CREATE UNIQUE INDEX idx_job_position_devices_unique ON job_position_devices(position_id, device_id);
```

### Bestehende Tabelle: `jobs` (unverändert)
- `discount` und `discount_type` bleiben als globaler Job-Rabatt
- `revenue` / `final_revenue` werden aus Positionen berechnet (kann gespeichert oder dynamisch sein)

### Unit-Optionen
Feste Liste + Freitext:
- `Stück`
- `Stunde`
- `Tag`
- `km`
- `Pauschale`
- Freitext (beliebiger Wert erlaubt)

---

## Preisberechnung

### Veranstaltungstage
```
event_days = endDate - startDate
```
Beispiel: 16.05. bis 18.05. = 2 Tage (nicht 3!)

### Positions-Preis
```
day_factor = 1 + (event_days - 1) × follow_day_factor
line_total = quantity × unit_price × day_factor
position_discount = discount_amount + (line_total × discount_percent / 100)
position_net = line_total - position_discount
```

Beispiel: 2 Beamer à 120 €, 2 Veranstaltungstage, Faktor 0.5:
- day_factor = 1 + (2-1) × 0.5 = 1.5
- line_total = 2 × 120 × 1.5 = 360 €

### Gesamtsumme
```
subtotal = Σ aller position_net
global_discount = jobs.discount (% oder EUR je nach discount_type)
netto = subtotal - global_discount
brutto = netto × (1 + tax_rate)
```

Standard tax_rate: 19% (MwSt)

---

## Frontend: Job-Detailseite

### Layout
Die Job-Detailseite zeigt als Hauptbereich die Positionen-Tabelle:

**Header-Bereich:**
- Job-Info (Code, Kunde, Datum, Veranstaltungstage)
- Bearbeiten-Button

**Produkte-Block:**
- Tabelle: Pos | Produkt | Anz | Einheit | EP | Folgetag-Faktor | Rabatt | Gesamt
- Unter jeder Produkt-Zeile: zugewiesene Devices (Device-ID, Scan-Zeitpunkt, Status-Icon ✓)
- Fortschrittsanzeige: "2 von 3 Devices gescannt"
- Button: "+ Produkt hinzufügen" (Produkt-Picker mit Autocomplete)

**Dienstleistungen-Block:**
- Tabelle: Pos | Dienstleistung | Anz | Einheit | EP | Rabatt | Gesamt
- Button: "+ Dienstleistung hinzufügen" (Service-Picker)
- Dienstleistungen haben keinen Folgetag-Faktor (wird auf 1.0 gesetzt / nicht angezeigt)

**Summen-Block:**
- Netto (Positionen)
- Globaler Rabatt (editierbar)
- Netto nach Rabatt
- MwSt (19%)
- Brutto

### Bearbeitungsmodus
- Inline-Editing: Klick auf Feld → editierbar (Anzahl, EP, Rabatt, Faktor)
- Positionen per Drag & Drop sortierbar (sort_order)
- Löschen: X-Button pro Position
- Änderungen werden sofort gespeichert (optimistic UI mit API-Call)

---

## WarehouseCore-Integration

### Picklist-Ansicht
WarehouseCore erhält einen neuen API-Endpunkt / View für Job-Positionen:
- Liest `job_positions WHERE position_type = 'product'` für einen Job
- Zeigt: Produkt, benötigte Menge, bereits gescannte Menge, fehlende Menge
- Optik: Einkaufsliste zum Abhaken

### Scan-Flow
1. WarehouseCore scannt ein Device (Barcode/QR)
2. Prüft: Welcher Job ist aktiv? Welches Produkt gehört zu diesem Device?
3. Findet passende `job_positions` Zeile (gleicher `product_id`, Menge noch nicht erfüllt)
4. Erstellt Eintrag in `job_position_devices`
5. RentalCore zeigt das Device live unter der Position an

### Austausch-Logik
- Wenn ein Device gescannt wird, das bereits zugewiesen ist → nichts passiert (idempotent)
- Wenn WarehouseCore ein Device entfernt (z.B. defekt) → Eintrag aus `job_position_devices` löschen
- Wenn ein anderes Device des gleichen Produkttyps gescannt wird → neuer Eintrag, kein Problem

### Kommunikation
- Über die gemeinsame Datenbank (beide lesen/schreiben `job_positions` + `job_position_devices`)
- Optional: MQTT-Notification bei Scan-Events für Live-Updates im RentalCore-Frontend

---

## API-Endpunkte (RentalCore)

### Positionen CRUD
```
GET    /api/v1/jobs/:id/positions          → alle Positionen mit Devices
POST   /api/v1/jobs/:id/positions          → Position hinzufügen
PUT    /api/v1/jobs/:id/positions/:posId   → Position bearbeiten
DELETE /api/v1/jobs/:id/positions/:posId   → Position löschen
PATCH  /api/v1/jobs/:id/positions/reorder  → Sortierung ändern
```

### Device-Zuweisungen (für WarehouseCore-Scans)
```
POST   /api/v1/jobs/:id/positions/:posId/devices       → Device zuweisen (scan)
DELETE /api/v1/jobs/:id/positions/:posId/devices/:devId → Device entfernen
GET    /api/v1/jobs/:id/picklist                       → Picklist-Ansicht für WarehouseCore
```

### Summen
```
GET    /api/v1/jobs/:id/totals             → Berechnete Netto/Brutto/Rabatt
```

---

## Migration

### Schritt 1: Neue Tabellen erstellen
- `job_positions` und `job_position_devices` anlegen

### Schritt 2: Daten migrieren
- `job_product_requirements` → `job_positions` (position_type = 'product')
  - quantity übernehmen, unit_price aus products.itemcostperday
- `jobdevices` → `job_position_devices`
  - Über `jobdevices.deviceID → device.productID → job_positions.product_id` zuordnen
  - `custom_price` von jobdevices wird zu `unit_price` Override in der Position

### Schritt 3: Frontend umstellen
- Neue Positionen-Ansicht auf Job-Detailseite
- Alter Product-Requirements-Code deaktivieren

### Schritt 4: WarehouseCore Picklist
- Neuer Picklist-View basierend auf `job_positions`

### Schritt 5: Alte Tabellen deprecaten
- `job_product_requirements` und `jobdevices` bleiben vorerst als Fallback
- Können nach Verifikation entfernt werden

---

## Scope

### In Scope
- `job_positions` und `job_position_devices` Tabellen
- RentalCore: Positionen-CRUD API + Frontend
- RentalCore: Summen-Berechnung mit Folgetag-Faktor
- WarehouseCore: Picklist-View + Scan-Zuordnung
- Datenmigration von bestehenden Requirements/Devices
- Globaler Rabatt bleibt zusätzlich zu Positions-Rabatten

### Out of Scope
- PDF-Generierung aus Positionen (kommt später, nutzt invoice_line_items)
- Automatische Rechnungserstellung aus Positionen
- Drag & Drop Sortierung (kann als Enhancement nachgezogen werden)
- MQTT-Live-Updates (initial Polling, MQTT als Enhancement)
- Paket-Logik (`job_packages`) — bleibt vorerst parallel bestehen
