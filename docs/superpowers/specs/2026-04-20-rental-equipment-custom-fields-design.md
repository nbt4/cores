# Design: Dynamische Custom-Felder für Mietprodukte

**Datum:** 2026-04-20  
**Bereich:** RentalCore + Cores-Dashboard  
**Status:** Genehmigt

---

## Übersicht

Mietprodukte (`rental_equipment`) sollen dynamische, produktspezifische Felder erhalten. Eine Bühne braucht z.B. "Breite" und "Tiefe", ein Lautsprecher nicht. Welche Felder es gibt, wird im Cores-Dashboard-Admin verwaltet. Pro Mietprodukt können beliebige dieser Felder hinzugefügt und befüllt werden. In der Job-Ansicht werden die Felder read-only angezeigt.

---

## Datenbank

### Neue Tabelle: `rental_equipment_field_definitions`

Definiert alle verfügbaren Feldtypen — im Cores-Dashboard verwaltbar.

| Spalte             | Typ          | Beschreibung                                      |
|--------------------|--------------|---------------------------------------------------|
| `id`               | SERIAL PK    |                                                   |
| `name`             | VARCHAR(100) | Anzeigename, z.B. "Breite"                        |
| `field_type`       | VARCHAR(20)  | `text`, `number`, `dropdown`                      |
| `unit`             | VARCHAR(20)  | Optional, nur bei `number`, z.B. "m", "kg", "W"  |
| `dropdown_options` | TEXT         | JSON-Array, nur bei `dropdown`, z.B. `["Holz","Stahl","Aluminium"]` |
| `is_active`        | BOOLEAN      | Inaktive Felder erscheinen nicht im Dropdown      |
| `created_at`       | TIMESTAMP    |                                                   |
| `updated_at`       | TIMESTAMP    |                                                   |

### Neue Tabelle: `rental_equipment_field_values`

Speichert die konkreten Feldwerte pro Mietprodukt.

| Spalte                | Typ         | Beschreibung                                    |
|-----------------------|-------------|------------------------------------------------|
| `id`                  | SERIAL PK   |                                                |
| `equipment_id`        | FK → rental_equipment.equipment_id | ON DELETE CASCADE |
| `field_definition_id` | FK → rental_equipment_field_definitions.id | ON DELETE RESTRICT |
| `value`               | VARCHAR(500)| Gespeicherter Wert als String                  |
| `sort_order`          | INT         | Reihenfolge pro Produkt (0-basiert)            |
| UNIQUE                | (equipment_id, field_definition_id) | Pro Produkt jedes Feld max. einmal |

**Hinweis `ON DELETE RESTRICT` auf `field_definition_id`:** Eine Felddefinition kann nicht gelöscht werden, solange Produkte sie nutzen. In diesem Fall wird die Definition nur deaktiviert (`is_active = false`).

---

## Cores-Dashboard: Admin-Tab "Mietprodukt-Felder"

Neuer Tab in `AdminPage.tsx` neben den bestehenden Tabs (Cables, CountTypes, etc.).

### Tabellenansicht
- Spalten: Name, Typ (mit Icon: `#` Zahl, `T` Text, `☰` Dropdown), Einheit, Status
- Aktionen pro Zeile: Bearbeiten, Löschen (nur wenn keine `field_values` existieren, sonst nur deaktivieren)

### Erstellen/Bearbeiten-Modal
- **Name** (Pflichtfeld)
- **Typ**: Segmented Control oder Select → `Text` / `Zahl` / `Auswahlliste`
- **Einheit** (nur sichtbar bei Typ = Zahl): Freitext-Input
- **Optionen** (nur sichtbar bei Typ = Auswahlliste): Tags-Input — Optionen hinzufügen und entfernen
- **Aktiv-Toggle**

### Backend (Cores-Dashboard Go)
- `GET /api/admin/rental-field-definitions` — Liste aller Definitionen
- `POST /api/admin/rental-field-definitions` — Neue Definition anlegen
- `PUT /api/admin/rental-field-definitions/:id` — Definition bearbeiten
- `DELETE /api/admin/rental-field-definitions/:id` — Löschen (schlägt fehl wenn in Verwendung → 409)

---

## RentalCore: Mietprodukt-Formular

### Neue Sektion "Technische Felder"
Unterhalb der bestehenden Felder (Name, Lieferant, Preis etc.) erscheint eine neue Sektion.

### Verhalten
- **"Feld hinzufügen"**-Button öffnet ein Dropdown mit allen aktiven Felddefinitionen
- Bereits hinzugefügte Felder werden im Dropdown nicht mehr angezeigt
- Jedes hinzugefügte Feld zeigt:
  - Label (Feldname) + Einheit rechts am Input (bei Zahl-Feldern)
  - Eingabefeld je nach Typ: Text-Input / Number-Input / Select mit den definierten Optionen
  - Entfernen-Button (×) rechts
- Reihenfolge der Felder = `sort_order` (0, 1, 2, …)

### Backend (RentalCore Go)
- `GET /api/rental-equipment/field-definitions` — Aktive Definitionen für das Dropdown (Proxy oder direkt aus DB)
- Beim `POST /api/rental-equipment` und `PUT /api/rental-equipment/:id`: `field_values`-Array mitschicken
  ```json
  {
    "fieldValues": [
      { "fieldDefinitionId": 1, "value": "6", "sortOrder": 0 },
      { "fieldDefinitionId": 2, "value": "4", "sortOrder": 1 }
    ]
  }
  ```
- `GET /api/rental-equipment/:id` gibt `fieldValues` mit zurück (inkl. Definition)

---

## Job-Ansicht: Read-Only-Anzeige

Wo ein Mietprodukt in einem Job aufgelistet wird, erscheinen die Custom-Felder darunter als kompakte read-only Liste, sortiert nach `sort_order`:

```
Bühne Royal 6×4        120 €/Tag  ×2
  Breite: 6 m  ·  Tiefe: 4 m  ·  Material: Aluminium
```

Kein eigenes Backend-Endpunkt nötig — die Felder kommen beim Laden des Mietprodukts bereits mit.

---

## Migrations-Datei

Neue PostgreSQL-Migration unter `rentalcore/migrations/` (nächste freie Nummer nach 021).

```sql
CREATE TABLE rental_equipment_field_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'number', 'dropdown')),
    unit VARCHAR(20),
    dropdown_options TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rental_equipment_field_values (
    id SERIAL PRIMARY KEY,
    equipment_id INT UNSIGNED NOT NULL,
    field_definition_id INT NOT NULL,
    value VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_equipment_field UNIQUE (equipment_id, field_definition_id),
    FOREIGN KEY (equipment_id) REFERENCES rental_equipment(equipment_id) ON DELETE CASCADE,
    FOREIGN KEY (field_definition_id) REFERENCES rental_equipment_field_definitions(id) ON DELETE RESTRICT
);
```

---

## Betroffene Dateien (Übersicht)

| Bereich | Datei / Verzeichnis |
|---------|---------------------|
| DB-Migration | `rentalcore/migrations/022_rental_equipment_custom_fields.up.sql` |
| Go-Modelle | `rentalcore/internal/models/enhanced_models.go` |
| Go-Repository | `rentalcore/internal/repository/rental_equipment_repository.go` |
| Go-Handler | `rentalcore/internal/handlers/rental_equipment_handler.go` |
| React-Formular | `rentalcore/web/src/` (Mietprodukt-Formular-Komponente) |
| Admin-Tab | `cores-dashboard/web/src/components/admin/RentalFieldDefinitionsTab.tsx` |
| Admin-Backend | `cores-dashboard/internal/handlers/` (neuer Handler) |
| Combined Init | `migrations/postgresql/000_combined_init.sql` |
