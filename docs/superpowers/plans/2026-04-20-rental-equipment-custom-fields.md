# Rental Equipment Custom Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dynamische Custom-Felder für Mietprodukte (rental_equipment) — definierbar im Cores-Dashboard, pro Produkt frei wählbar, im Job read-only angezeigt.

**Architecture:** Zwei neue Tabellen in WarehouseCore (field_definitions + field_values). WarehouseCore besitzt alle Backends. Cores-Dashboard proxied über `warehouseApi` (kein eigener Backend-Code nötig). RentalCore zeigt Werte read-only via WarehouseCore-Client.

**Tech Stack:** Go (net/http + gorilla/mux), PostgreSQL, React + TypeScript, lucide-react, axios

---

## Betroffene Dateien

| Datei | Aktion |
|-------|--------|
| `warehousecore/migrations/024_rental_equipment_custom_fields.sql` | NEU — DB-Tabellen |
| `migrations/postgresql/000_combined_init.sql` | MODIFY — neue Tabellen anhängen |
| `warehousecore/internal/handlers/rental_equipment_field_handlers.go` | NEU — CRUD für Felddefinitionen |
| `warehousecore/internal/handlers/rental_equipment_handlers.go` | MODIFY — field_values in GET/POST/PUT |
| `warehousecore/cmd/server/main.go` | MODIFY — neue Routen registrieren |
| `cores-dashboard/web/src/components/admin/RentalFieldsTab.tsx` | NEU — Admin-Tab |
| `cores-dashboard/web/src/pages/AdminPage.tsx` | MODIFY — Tab registrieren |
| `cores-dashboard/web/src/components/Layout.tsx` | MODIFY — Nav-Eintrag |
| `warehousecore/web/src/components/admin/RentedProductsTab.tsx` | MODIFY — Custom Fields UI |
| `rentalcore/internal/services/warehousecore/client.go` | MODIFY — FieldValues im Struct |
| `rentalcore/web/templates/job_form.html` | MODIFY — Felder read-only anzeigen |
| `rentalcore/web/templates/job_detail.html` | MODIFY — Felder read-only anzeigen |

---

## Task 1: DB-Migration erstellen

**Files:**
- Create: `warehousecore/migrations/024_rental_equipment_custom_fields.sql`
- Modify: `migrations/postgresql/000_combined_init.sql`

- [ ] **Schritt 1: Migration-Datei anlegen**

```sql
-- warehousecore/migrations/024_rental_equipment_custom_fields.sql

CREATE TABLE IF NOT EXISTS rental_equipment_field_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'number', 'dropdown')),
    unit VARCHAR(20),
    dropdown_options TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rental_equipment_field_values (
    id SERIAL PRIMARY KEY,
    equipment_id INT NOT NULL,
    field_definition_id INT NOT NULL,
    value VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_equipment_field UNIQUE (equipment_id, field_definition_id),
    FOREIGN KEY (equipment_id) REFERENCES rental_equipment(equipment_id) ON DELETE CASCADE,
    FOREIGN KEY (field_definition_id) REFERENCES rental_equipment_field_definitions(id) ON DELETE RESTRICT
);
```

- [ ] **Schritt 2: Tabellen in 000_combined_init.sql anhängen**

Nach dem `rental_equipment`-Block (nach Zeile 640) in `migrations/postgresql/000_combined_init.sql` folgendes einfügen:

```sql
-- Custom fields for rental equipment
CREATE TABLE IF NOT EXISTS rental_equipment_field_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'number', 'dropdown')),
    unit VARCHAR(20),
    dropdown_options TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rental_equipment_field_values (
    id SERIAL PRIMARY KEY,
    equipment_id INT NOT NULL,
    field_definition_id INT NOT NULL,
    value VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_equipment_field UNIQUE (equipment_id, field_definition_id),
    FOREIGN KEY (equipment_id) REFERENCES rental_equipment(equipment_id) ON DELETE CASCADE,
    FOREIGN KEY (field_definition_id) REFERENCES rental_equipment_field_definitions(id) ON DELETE RESTRICT
);
```

- [ ] **Schritt 3: Migration auf Produktions-DB anwenden**

```bash
ssh noah@docker03.nt.local "docker exec -i tscores-postgres-1 psql -U warehousecore -d warehousecore" < warehousecore/migrations/024_rental_equipment_custom_fields.sql
```

- [ ] **Schritt 4: Commit**

```bash
git add warehousecore/migrations/024_rental_equipment_custom_fields.sql migrations/postgresql/000_combined_init.sql
git commit -m "feat: add rental equipment custom field tables"
```

---

## Task 2: WarehouseCore — Field Definition CRUD Handler

**Files:**
- Create: `warehousecore/internal/handlers/rental_equipment_field_handlers.go`

- [ ] **Schritt 1: Datei anlegen**

```go
package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"

	"warehousecore/internal/repository"
)

type RentalFieldDefinition struct {
	ID              int       `json:"id"`
	Name            string    `json:"name"`
	FieldType       string    `json:"field_type"`
	Unit            *string   `json:"unit"`
	DropdownOptions *string   `json:"dropdown_options"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type RentalFieldDefinitionRequest struct {
	Name            string  `json:"name"`
	FieldType       string  `json:"field_type"`
	Unit            *string `json:"unit"`
	DropdownOptions *string `json:"dropdown_options"`
	IsActive        bool    `json:"is_active"`
}

type RentalFieldValue struct {
	ID                int                    `json:"id"`
	EquipmentID       int                    `json:"equipment_id"`
	FieldDefinitionID int                    `json:"field_definition_id"`
	Value             string                 `json:"value"`
	SortOrder         int                    `json:"sort_order"`
	Definition        *RentalFieldDefinition `json:"definition,omitempty"`
}

type RentalFieldValueInput struct {
	FieldDefinitionID int    `json:"field_definition_id"`
	Value             string `json:"value"`
	SortOrder         int    `json:"sort_order"`
}

func GetRentalFieldDefinitions(w http.ResponseWriter, r *http.Request) {
	db := repository.GetSQLDB()
	activeOnly := r.URL.Query().Get("active_only") == "true"

	query := `SELECT id, name, field_type, unit, dropdown_options, is_active, created_at, updated_at
	          FROM rental_equipment_field_definitions`
	if activeOnly {
		query += ` WHERE is_active = true`
	}
	query += ` ORDER BY name`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("Failed to query field definitions: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to fetch field definitions"})
		return
	}
	defer rows.Close()

	var defs []RentalFieldDefinition
	for rows.Next() {
		var d RentalFieldDefinition
		if err := rows.Scan(&d.ID, &d.Name, &d.FieldType, &d.Unit, &d.DropdownOptions, &d.IsActive, &d.CreatedAt, &d.UpdatedAt); err != nil {
			log.Printf("Failed to scan field definition: %v", err)
			continue
		}
		defs = append(defs, d)
	}
	if defs == nil {
		defs = []RentalFieldDefinition{}
	}
	respondJSON(w, http.StatusOK, defs)
}

func CreateRentalFieldDefinition(w http.ResponseWriter, r *http.Request) {
	db := repository.GetSQLDB()
	var req RentalFieldDefinitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}
	if req.Name == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Name is required"})
		return
	}
	if req.FieldType != "text" && req.FieldType != "number" && req.FieldType != "dropdown" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "field_type must be text, number, or dropdown"})
		return
	}

	var id int
	err := db.QueryRow(`
		INSERT INTO rental_equipment_field_definitions (name, field_type, unit, dropdown_options, is_active)
		VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		req.Name, req.FieldType, req.Unit, req.DropdownOptions, req.IsActive,
	).Scan(&id)
	if err != nil {
		log.Printf("Failed to create field definition: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create field definition"})
		return
	}

	var def RentalFieldDefinition
	db.QueryRow(`SELECT id, name, field_type, unit, dropdown_options, is_active, created_at, updated_at
	             FROM rental_equipment_field_definitions WHERE id = $1`, id).
		Scan(&def.ID, &def.Name, &def.FieldType, &def.Unit, &def.DropdownOptions, &def.IsActive, &def.CreatedAt, &def.UpdatedAt)
	respondJSON(w, http.StatusCreated, def)
}

func UpdateRentalFieldDefinition(w http.ResponseWriter, r *http.Request) {
	db := repository.GetSQLDB()
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
		return
	}

	var req RentalFieldDefinitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}
	if req.Name == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Name is required"})
		return
	}

	result, err := db.Exec(`
		UPDATE rental_equipment_field_definitions
		SET name=$1, field_type=$2, unit=$3, dropdown_options=$4, is_active=$5, updated_at=NOW()
		WHERE id=$6`,
		req.Name, req.FieldType, req.Unit, req.DropdownOptions, req.IsActive, id,
	)
	if err != nil {
		log.Printf("Failed to update field definition: %v", err)
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to update field definition"})
		return
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Field definition not found"})
		return
	}

	var def RentalFieldDefinition
	db.QueryRow(`SELECT id, name, field_type, unit, dropdown_options, is_active, created_at, updated_at
	             FROM rental_equipment_field_definitions WHERE id = $1`, id).
		Scan(&def.ID, &def.Name, &def.FieldType, &def.Unit, &def.DropdownOptions, &def.IsActive, &def.CreatedAt, &def.UpdatedAt)
	respondJSON(w, http.StatusOK, def)
}

func DeleteRentalFieldDefinition(w http.ResponseWriter, r *http.Request) {
	db := repository.GetSQLDB()
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid ID"})
		return
	}

	var count int
	db.QueryRow(`SELECT COUNT(*) FROM rental_equipment_field_values WHERE field_definition_id = $1`, id).Scan(&count)
	if count > 0 {
		_, err := db.Exec(`UPDATE rental_equipment_field_definitions SET is_active=false, updated_at=NOW() WHERE id=$1`, id)
		if err != nil {
			respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to deactivate field definition"})
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"message": "Field definition deactivated (in use by products)", "action": "deactivated"})
		return
	}

	result, err := db.Exec(`DELETE FROM rental_equipment_field_definitions WHERE id=$1`, id)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to delete field definition"})
		return
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Field definition not found"})
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Field definition deleted", "action": "deleted"})
}

// fetchFieldValues returns all field values for the given equipment IDs, with definitions attached.
func fetchFieldValues(db *sql.DB, equipmentIDs []int) (map[int][]RentalFieldValue, error) {
	if len(equipmentIDs) == 0 {
		return map[int][]RentalFieldValue{}, nil
	}

	// Build $1,$2,... placeholder
	placeholders := ""
	args := make([]interface{}, len(equipmentIDs))
	for i, id := range equipmentIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += "$" + strconv.Itoa(i+1)
		args[i] = id
	}

	rows, err := db.Query(`
		SELECT v.id, v.equipment_id, v.field_definition_id, v.value, v.sort_order,
		       d.id, d.name, d.field_type, d.unit, d.dropdown_options, d.is_active, d.created_at, d.updated_at
		FROM rental_equipment_field_values v
		JOIN rental_equipment_field_definitions d ON d.id = v.field_definition_id
		WHERE v.equipment_id IN (`+placeholders+`)
		ORDER BY v.equipment_id, v.sort_order`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int][]RentalFieldValue)
	for rows.Next() {
		var v RentalFieldValue
		var d RentalFieldDefinition
		if err := rows.Scan(
			&v.ID, &v.EquipmentID, &v.FieldDefinitionID, &v.Value, &v.SortOrder,
			&d.ID, &d.Name, &d.FieldType, &d.Unit, &d.DropdownOptions, &d.IsActive, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			continue
		}
		v.Definition = &d
		result[v.EquipmentID] = append(result[v.EquipmentID], v)
	}
	return result, nil
}

// saveFieldValues replaces all field values for the given equipment.
func saveFieldValues(db *sql.DB, equipmentID int, inputs []RentalFieldValueInput) error {
	_, err := db.Exec(`DELETE FROM rental_equipment_field_values WHERE equipment_id = $1`, equipmentID)
	if err != nil {
		return err
	}
	for _, inp := range inputs {
		_, err := db.Exec(`
			INSERT INTO rental_equipment_field_values (equipment_id, field_definition_id, value, sort_order)
			VALUES ($1, $2, $3, $4)`,
			equipmentID, inp.FieldDefinitionID, inp.Value, inp.SortOrder,
		)
		if err != nil {
			return err
		}
	}
	return nil
}
```

- [ ] **Schritt 2: Kompilieren prüfen**

```bash
cd warehousecore && go build ./...
```

Erwartete Ausgabe: kein Output (erfolgreich)

- [ ] **Schritt 3: Commit**

```bash
git add warehousecore/internal/handlers/rental_equipment_field_handlers.go
git commit -m "feat(warehousecore): add rental field definition CRUD handlers"
```

---

## Task 3: WarehouseCore — Rental Equipment GET/POST/PUT mit field_values

**Files:**
- Modify: `warehousecore/internal/handlers/rental_equipment_handlers.go`

- [ ] **Schritt 1: `RentalEquipment` Struct um FieldValues erweitern**

In `rental_equipment_handlers.go` das `RentalEquipment` Struct (Zeile 17) erweitern:

```go
type RentalEquipment struct {
	EquipmentID   int        `json:"equipment_id"`
	ProductName   string     `json:"product_name"`
	SupplierName  string     `json:"supplier_name"`
	RentalPrice   float64    `json:"rental_price"`
	CustomerPrice float64    `json:"customer_price"`
	Category      *string    `json:"category"`
	Description   *string    `json:"description"`
	Notes         *string    `json:"notes"`
	IsActive      bool       `json:"is_active"`
	CreatedBy     *int       `json:"created_by"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	FieldValues   []RentalFieldValue `json:"field_values"`
}
```

- [ ] **Schritt 2: `RentalEquipmentCreateRequest` um field_values erweitern**

```go
type RentalEquipmentCreateRequest struct {
	ProductName   string                  `json:"product_name"`
	SupplierName  string                  `json:"supplier_name"`
	RentalPrice   float64                 `json:"rental_price"`
	CustomerPrice float64                 `json:"customer_price"`
	Category      *string                 `json:"category"`
	Description   *string                 `json:"description"`
	Notes         *string                 `json:"notes"`
	IsActive      *bool                   `json:"is_active"`
	FieldValues   []RentalFieldValueInput `json:"field_values"`
}
```

- [ ] **Schritt 3: `GetRentalEquipment` anpassen — field_values mit laden**

In `GetRentalEquipment` nach dem Befüllen der `equipment`-Liste (nach dem `rows.Close()`-Block) folgendes einfügen:

```go
	// Collect equipment IDs
	ids := make([]int, len(equipment))
	for i, e := range equipment {
		ids[i] = e.EquipmentID
	}
	fieldMap, err := fetchFieldValues(db, ids)
	if err != nil {
		log.Printf("Failed to fetch field values: %v", err)
	} else {
		for i := range equipment {
			if vals, ok := fieldMap[equipment[i].EquipmentID]; ok {
				equipment[i].FieldValues = vals
			} else {
				equipment[i].FieldValues = []RentalFieldValue{}
			}
		}
	}
```

- [ ] **Schritt 4: `GetRentalEquipmentByID` anpassen**

Nach dem Scan der einzelnen Zeile in `GetRentalEquipmentByID` folgendes einfügen:

```go
	fieldMap, err := fetchFieldValues(db, []int{e.EquipmentID})
	if err != nil {
		log.Printf("Failed to fetch field values: %v", err)
	} else if vals, ok := fieldMap[e.EquipmentID]; ok {
		e.FieldValues = vals
	} else {
		e.FieldValues = []RentalFieldValue{}
	}
```

- [ ] **Schritt 5: `CreateRentalEquipment` — field_values speichern**

Am Ende von `CreateRentalEquipment`, nach dem `RETURNING equipment_id`-Scan, folgendes einfügen:

```go
	if len(req.FieldValues) > 0 {
		if err := saveFieldValues(db, equipmentID, req.FieldValues); err != nil {
			log.Printf("Failed to save field values for new equipment %d: %v", equipmentID, err)
		}
	}
```

- [ ] **Schritt 6: `UpdateRentalEquipment` — field_values speichern**

Am Ende von `UpdateRentalEquipment`, nach dem erfolgreichen UPDATE, folgendes einfügen:

```go
	if err := saveFieldValues(db, id, req.FieldValues); err != nil {
		log.Printf("Failed to save field values for equipment %d: %v", id, err)
	}
```

Dafür muss `req` ebenfalls `FieldValues []RentalFieldValueInput` haben — denselben Typ wie `RentalEquipmentCreateRequest`.

- [ ] **Schritt 7: Kompilieren prüfen**

```bash
cd warehousecore && go build ./...
```

- [ ] **Schritt 8: Commit**

```bash
git add warehousecore/internal/handlers/rental_equipment_handlers.go
git commit -m "feat(warehousecore): include field_values in rental equipment CRUD"
```

---

## Task 4: WarehouseCore — Neue Routen in main.go registrieren

**Files:**
- Modify: `warehousecore/cmd/server/main.go`

- [ ] **Schritt 1: Routen zum `adminRead`-Router hinzufügen**

Nach Zeile `adminRead.HandleFunc("/rental-equipment/{id}", handlers.GetRentalEquipmentByID).Methods("GET")` einfügen:

```go
	adminRead.HandleFunc("/rental-field-definitions", handlers.GetRentalFieldDefinitions).Methods("GET")
```

- [ ] **Schritt 2: Routen zum `admin`-Router hinzufügen**

Nach der `admin.HandleFunc("/rental-equipment/{id}", handlers.DeleteRentalEquipment)` Zeile einfügen:

```go
	admin.HandleFunc("/rental-field-definitions", handlers.CreateRentalFieldDefinition).Methods("POST")
	admin.HandleFunc("/rental-field-definitions/{id}", handlers.UpdateRentalFieldDefinition).Methods("PUT")
	admin.HandleFunc("/rental-field-definitions/{id}", handlers.DeleteRentalFieldDefinition).Methods("DELETE")
```

Außerdem öffentliche GET-Route für RentalCore-Client (nach `api.HandleFunc("/rental-equipment/{id}", ...)`) einfügen:

```go
	api.HandleFunc("/rental-field-definitions", handlers.GetRentalFieldDefinitions).Methods("GET")
```

- [ ] **Schritt 3: Kompilieren und starten prüfen**

```bash
cd warehousecore && go build ./...
```

- [ ] **Schritt 4: Commit**

```bash
git add warehousecore/cmd/server/main.go
git commit -m "feat(warehousecore): register rental field definition routes"
```

---

## Task 5: Cores-Dashboard — `RentalFieldsTab.tsx` erstellen

**Files:**
- Create: `cores-dashboard/web/src/components/admin/RentalFieldsTab.tsx`

- [ ] **Schritt 1: Datei anlegen**

```tsx
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { warehouseApi as api } from '../../lib/api';

interface FieldDefinition {
  id: number;
  name: string;
  field_type: 'text' | 'number' | 'dropdown';
  unit: string | null;
  dropdown_options: string | null;
  is_active: boolean;
}

interface FormData {
  name: string;
  field_type: 'text' | 'number' | 'dropdown';
  unit: string;
  dropdown_options: string; // comma-separated for editing
  is_active: boolean;
}

const EMPTY_FORM: FormData = {
  name: '',
  field_type: 'text',
  unit: '',
  dropdown_options: '',
  is_active: true,
};

function fieldTypeLabel(t: string) {
  if (t === 'text') return 'Text';
  if (t === 'number') return 'Zahl';
  if (t === 'dropdown') return 'Auswahlliste';
  return t;
}

function fieldTypeIcon(t: string) {
  if (t === 'number') return '#';
  if (t === 'dropdown') return '☰';
  return 'T';
}

export function RentalFieldsTab() {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<FieldDefinition[]>('/admin/rental-field-definitions');
      setFields(data || []);
    } catch {
      setMessage('Felder konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setMessage('');
  };

  const startEdit = (f: FieldDefinition) => {
    setEditing(f.id);
    setFormData({
      name: f.name,
      field_type: f.field_type,
      unit: f.unit ?? '',
      dropdown_options: f.dropdown_options
        ? JSON.parse(f.dropdown_options).join(', ')
        : '',
      is_active: f.is_active,
    });
    setMessage('');
  };

  const buildPayload = () => {
    const opts = formData.field_type === 'dropdown' && formData.dropdown_options.trim()
      ? JSON.stringify(formData.dropdown_options.split(',').map(s => s.trim()).filter(Boolean))
      : null;
    return {
      name: formData.name.trim(),
      field_type: formData.field_type,
      unit: formData.field_type === 'number' && formData.unit.trim() ? formData.unit.trim() : null,
      dropdown_options: opts,
      is_active: formData.is_active,
    };
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setMessage('Name ist erforderlich.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      if (editing === 'new') {
        await api.post('/admin/rental-field-definitions', buildPayload());
      } else {
        await api.put(`/admin/rental-field-definitions/${editing}`, buildPayload());
      }
      await load();
      resetForm();
      setMessage('Feld gespeichert.');
    } catch (e: any) {
      setMessage(e?.response?.data?.error || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Felddefinition löschen? (Bei Verwendung wird sie deaktiviert.)')) return;
    setMessage('');
    try {
      const { data } = await api.delete<{ message: string; action: string }>(`/admin/rental-field-definitions/${id}`);
      await load();
      setMessage(data.action === 'deactivated' ? 'Feld deaktiviert (wird noch verwendet).' : 'Feld gelöscht.');
    } catch {
      setMessage('Löschen fehlgeschlagen.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Mietprodukt-Felder</h2>
          <p className="text-sm text-gray-400 mt-0.5">Dynamische Zusatzfelder für Mietprodukte (z.B. Breite, Tiefe, Material)</p>
        </div>
        {editing === null && (
          <button
            onClick={() => { setEditing('new'); setFormData(EMPTY_FORM); setMessage(''); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-accent-red hover:bg-red-600 text-white transition-colors"
          >
            <Plus size={16} /> Feld anlegen
          </button>
        )}
      </div>

      {message && (
        <div className="text-sm px-3 py-2 rounded-lg bg-white/5 text-gray-300">{message}</div>
      )}

      {/* Form */}
      {editing !== null && (
        <div className="rounded-xl p-4 space-y-4" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold text-white">{editing === 'new' ? 'Neues Feld' : 'Feld bearbeiten'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name *</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm bg-black/40 border border-white/10 text-white focus:outline-none focus:border-accent-red"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="z.B. Breite"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Typ *</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm bg-black/40 border border-white/10 text-white focus:outline-none focus:border-accent-red"
                value={formData.field_type}
                onChange={e => setFormData(p => ({ ...p, field_type: e.target.value as FormData['field_type'] }))}
              >
                <option value="text">Text</option>
                <option value="number">Zahl</option>
                <option value="dropdown">Auswahlliste</option>
              </select>
            </div>
            {formData.field_type === 'number' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Einheit (optional)</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm bg-black/40 border border-white/10 text-white focus:outline-none focus:border-accent-red"
                  value={formData.unit}
                  onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
                  placeholder="z.B. m, kg, W"
                />
              </div>
            )}
            {formData.field_type === 'dropdown' && (
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Optionen (kommagetrennt)</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm bg-black/40 border border-white/10 text-white focus:outline-none focus:border-accent-red"
                  value={formData.dropdown_options}
                  onChange={e => setFormData(p => ({ ...p, dropdown_options: e.target.value }))}
                  placeholder="z.B. Holz, Stahl, Aluminium"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                className="accent-red-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-300">Aktiv</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-accent-red hover:bg-red-600 text-white transition-colors disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={14} /> Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-500">Lädt…</p>
      ) : fields.length === 0 ? (
        <p className="text-sm text-gray-500">Noch keine Felder definiert.</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#1a1a1a' }}>
              <tr className="text-left text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Einheit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fields.map(f => (
                <tr key={f.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300">
                      {fieldTypeIcon(f.field_type)} {fieldTypeLabel(f.field_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-gray-400">{f.unit ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.is_active ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {f.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => startEdit(f)} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Schritt 2: Commit**

```bash
git add cores-dashboard/web/src/components/admin/RentalFieldsTab.tsx
git commit -m "feat(cores-dashboard): add RentalFieldsTab for managing field definitions"
```

---

## Task 6: Cores-Dashboard — Tab in AdminPage + Layout verdrahten

**Files:**
- Modify: `cores-dashboard/web/src/pages/AdminPage.tsx`
- Modify: `cores-dashboard/web/src/components/Layout.tsx`

- [ ] **Schritt 1: `AdminPage.tsx` — Import und Eintrag hinzufügen**

Import hinzufügen (nach dem letzten Import):
```tsx
import { RentalFieldsTab } from '../components/admin/RentalFieldsTab';
```

In `tabComponents` einfügen (z.B. nach `cables`):
```tsx
  rentalfields: RentalFieldsTab,
```

- [ ] **Schritt 2: `Layout.tsx` — Nav-Eintrag hinzufügen**

Import von `ShoppingCart` aus lucide-react hinzufügen (in der bestehenden Import-Zeile):
```tsx
import {
  Home, Settings, LogOut, User, ExternalLink, Menu, X, ChevronDown,
  Users, Shield, Layers, Lightbulb, Cpu, FolderTree, Tag, Ruler,
  Database, KeyRound, Download, Cable, ShoppingCart,
} from 'lucide-react';
```

In `ADMIN_ITEMS` einfügen (nach dem `cables`-Eintrag):
```tsx
  { path: '/admin/rentalfields', label: 'Mietprodukt-Felder', icon: ShoppingCart },
```

- [ ] **Schritt 3: Cores-Dashboard bauen und prüfen**

```bash
cd cores-dashboard/web && npm run build
```

Erwartete Ausgabe: Build-Dateien in `dist/`, keine TypeScript-Fehler.

- [ ] **Schritt 4: Commit**

```bash
git add cores-dashboard/web/src/pages/AdminPage.tsx cores-dashboard/web/src/components/Layout.tsx
git commit -m "feat(cores-dashboard): wire RentalFieldsTab into admin nav"
```

---

## Task 7: WarehouseCore Frontend — Custom Fields in `RentedProductsTab.tsx`

**Files:**
- Modify: `warehousecore/web/src/components/admin/RentedProductsTab.tsx`

- [ ] **Schritt 1: Typen ergänzen**

Nach den bestehenden Interfaces (nach `RentalEquipmentFormData`) einfügen:

```tsx
interface FieldDefinition {
  id: number;
  name: string;
  field_type: 'text' | 'number' | 'dropdown';
  unit: string | null;
  dropdown_options: string | null;
  is_active: boolean;
}

interface FieldValueInput {
  field_definition_id: number;
  value: string;
  sort_order: number;
}

interface FieldValue {
  id: number;
  field_definition_id: number;
  value: string;
  sort_order: number;
  definition?: FieldDefinition;
}
```

`RentalEquipment` Interface erweitern um:
```tsx
  field_values?: FieldValue[];
```

`RentalEquipmentFormData` Interface erweitern um:
```tsx
  field_values: FieldValueInput[];
```

`initialFormData` erweitern um:
```tsx
  field_values: [],
```

- [ ] **Schritt 2: State für Felddefinitionen**

In der Komponente nach den bestehenden useState-Calls einfügen:
```tsx
  const [fieldDefs, setFieldDefs] = useState<FieldDefinition[]>([]);
```

Im `useEffect` (oder in einem separaten useEffect) die Definitionen laden:
```tsx
  useEffect(() => {
    api.get<FieldDefinition[]>('/admin/rental-field-definitions?active_only=true')
      .then(r => setFieldDefs(r.data || []))
      .catch(() => {});
  }, []);
```

- [ ] **Schritt 3: Beim Bearbeiten field_values aus Produkt laden**

In der `startEdit`-Funktion (oder wo `formData` beim Öffnen des Edit-Modals befüllt wird), `field_values` setzen:

```tsx
setFormData({
  product_name: eq.product_name,
  supplier_name: eq.supplier_name,
  rental_price: eq.rental_price,
  customer_price: eq.customer_price,
  category: eq.category ?? '',
  description: eq.description ?? '',
  notes: eq.notes ?? '',
  is_active: eq.is_active,
  field_values: (eq.field_values ?? []).map(v => ({
    field_definition_id: v.field_definition_id,
    value: v.value,
    sort_order: v.sort_order,
  })),
});
```

- [ ] **Schritt 4: Custom-Fields-Abschnitt im Formular**

Im Create/Edit-Modal-Formular vor dem Submit-Button einfügen:

```tsx
{/* Custom Fields */}
<div className="mt-4">
  <div className="flex items-center justify-between mb-2">
    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Technische Felder</label>
    <select
      className="text-xs rounded px-2 py-1 bg-black/40 border border-white/10 text-gray-300"
      value=""
      onChange={e => {
        const defId = Number(e.target.value);
        if (!defId) return;
        const def = fieldDefs.find(d => d.id === defId);
        if (!def) return;
        const alreadyAdded = formData.field_values.some(v => v.field_definition_id === defId);
        if (alreadyAdded) return;
        setFormData(prev => ({
          ...prev,
          field_values: [...prev.field_values, {
            field_definition_id: defId,
            value: '',
            sort_order: prev.field_values.length,
          }],
        }));
      }}
    >
      <option value="">+ Feld hinzufügen</option>
      {fieldDefs
        .filter(d => !formData.field_values.some(v => v.field_definition_id === d.id))
        .map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
    </select>
  </div>
  <div className="space-y-2">
    {formData.field_values.map((fv, idx) => {
      const def = fieldDefs.find(d => d.id === fv.field_definition_id);
      if (!def) return null;
      return (
        <div key={fv.field_definition_id} className="flex items-center gap-2">
          <span className="text-sm text-gray-300 w-28 flex-shrink-0">{def.name}</span>
          {def.field_type === 'dropdown' && def.dropdown_options ? (
            <select
              className="flex-1 rounded px-2 py-1 text-sm bg-black/40 border border-white/10 text-white"
              value={fv.value}
              onChange={e => {
                const updated = [...formData.field_values];
                updated[idx] = { ...updated[idx], value: e.target.value };
                setFormData(prev => ({ ...prev, field_values: updated }));
              }}
            >
              <option value="">— wählen —</option>
              {JSON.parse(def.dropdown_options).map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type={def.field_type === 'number' ? 'number' : 'text'}
              className="flex-1 rounded px-2 py-1 text-sm bg-black/40 border border-white/10 text-white"
              value={fv.value}
              onChange={e => {
                const updated = [...formData.field_values];
                updated[idx] = { ...updated[idx], value: e.target.value };
                setFormData(prev => ({ ...prev, field_values: updated }));
              }}
            />
          )}
          {def.unit && <span className="text-xs text-gray-500 flex-shrink-0">{def.unit}</span>}
          <button
            type="button"
            onClick={() => {
              const updated = formData.field_values.filter((_, i) => i !== idx)
                .map((v, i) => ({ ...v, sort_order: i }));
              setFormData(prev => ({ ...prev, field_values: updated }));
            }}
            className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
          >
            ×
          </button>
        </div>
      );
    })}
  </div>
</div>
```

- [ ] **Schritt 5: field_values in Detail-Ansicht anzeigen**

In der Detail-View (`viewEquipment`) nach den bestehenden Feldern einfügen:

```tsx
{viewEquipment.field_values && viewEquipment.field_values.length > 0 && (
  <div>
    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Technische Felder</p>
    <div className="space-y-1">
      {viewEquipment.field_values.map(fv => (
        <div key={fv.field_definition_id} className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">{fv.definition?.name ?? `Feld ${fv.field_definition_id}`}:</span>
          <span className="text-white">{fv.value}{fv.definition?.unit ? ` ${fv.definition.unit}` : ''}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Schritt 6: WarehouseCore bauen und prüfen**

```bash
cd warehousecore/web && npm run build
```

Erwartete Ausgabe: Keine TypeScript-Fehler.

- [ ] **Schritt 7: Commit**

```bash
git add warehousecore/web/src/components/admin/RentedProductsTab.tsx
git commit -m "feat(warehousecore): add custom fields UI to RentedProductsTab"
```

---

## Task 8: RentalCore — Client + Job-Template mit field_values

**Files:**
- Modify: `rentalcore/internal/services/warehousecore/client.go`
- Modify: `rentalcore/web/templates/job_form.html`
- Modify: `rentalcore/web/templates/job_detail.html`

- [ ] **Schritt 1: Client-Typen erweitern**

In `client.go` nach `RentalEquipmentItem` einfügen:

```go
// RentalFieldDef is a field definition from WarehouseCore
type RentalFieldDef struct {
	Name      string  `json:"name"`
	FieldType string  `json:"field_type"`
	Unit      *string `json:"unit"`
}

// RentalFieldValue is a custom field value attached to a rental item
type RentalFieldValue struct {
	FieldDefinitionID int             `json:"field_definition_id"`
	Value             string          `json:"value"`
	SortOrder         int             `json:"sort_order"`
	Definition        *RentalFieldDef `json:"definition"`
}
```

`RentalEquipmentItem` erweitern:
```go
type RentalEquipmentItem struct {
	EquipmentID   uint               `json:"equipment_id"`
	ProductName   string             `json:"product_name"`
	SupplierName  string             `json:"supplier_name"`
	RentalPrice   float64            `json:"rental_price"`
	CustomerPrice float64            `json:"customer_price"`
	Category      string             `json:"category"`
	Description   string             `json:"description"`
	IsActive      bool               `json:"is_active"`
	FieldValues   []RentalFieldValue `json:"field_values"`
}
```

- [ ] **Schritt 2: Go-Build prüfen**

```bash
cd rentalcore && go build ./...
```

- [ ] **Schritt 3: job_form.html — Felder unter jedem Rental-Item anzeigen**

In `job_form.html` nach der Zeile wo `{{.RentalPrice}}` angezeigt wird (innerhalb der Rental-Equipment-Tabelle, ca. Zeile 411), unterhalb der `<tr>` für das Gerät eine conditional Row einfügen.

Suche den Block der Rental-Item-Zeile und füge nach der letzten `</tr>` des Items ein:

```html
{{if .FieldValues}}
<tr>
  <td colspan="6" class="px-3 pb-2 pt-0">
    <div class="flex flex-wrap gap-2 text-xs text-gray-400">
      {{range .FieldValues}}
      <span class="bg-black/20 rounded px-2 py-0.5">
        {{if .Definition}}{{.Definition.Name}}{{else}}Feld{{end}}: {{.Value}}{{if and .Definition .Definition.Unit}} {{.Definition.Unit}}{{end}}
      </span>
      {{end}}
    </div>
  </td>
</tr>
{{end}}
```

- [ ] **Schritt 4: job_detail.html — Felder anzeigen**

In `job_detail.html`, im Block wo Job-Rental-Equipment angezeigt wird, nach dem Produktnamen einfügen:

```html
{{if .RentalEquipment}}
  {{if .RentalEquipment.FieldValues}}
  <div class="text-xs text-gray-400 mt-0.5">
    {{range .RentalEquipment.FieldValues}}
    <span>{{if .Definition}}{{.Definition.Name}}{{else}}Feld{{end}}: {{.Value}}{{if and .Definition .Definition.Unit}} {{.Definition.Unit}}{{end}}</span>
    {{end}}
  </div>
  {{end}}
{{end}}
```

**Hinweis:** Die genaue Position in `job_detail.html` hängt von der Template-Struktur ab. Der Block mit `jobRentalEquipment` suchen und die Felder dort unterhalb des Produktnamens einfügen.

- [ ] **Schritt 5: Go-Build und Template-Check**

```bash
cd rentalcore && go build ./...
```

- [ ] **Schritt 6: Commit**

```bash
git add rentalcore/internal/services/warehousecore/client.go rentalcore/web/templates/job_form.html rentalcore/web/templates/job_detail.html
git commit -m "feat(rentalcore): display rental equipment field values in job views"
```

---

## Task 9: Build & Push — WarehouseCore + Cores-Dashboard

**Files:**
- `warehousecore/` — Docker Build
- `cores-dashboard/` — Docker Build

- [ ] **Schritt 1: Aktuelle Versionen prüfen**

```bash
# WarehouseCore
grep -m1 "version\|Version\|VERSION" /opt/dev/cores/warehousecore/README.md | head -5
# Cores-Dashboard
grep -m1 "version\|Version" /opt/dev/cores/cores-dashboard/README.md | head -5
```

- [ ] **Schritt 2: WarehouseCore Docker-Image bauen und pushen**

Version erhöhen (aktuelle Version + 1 Patch, z.B. `5.8.9` → `5.8.10`):

```bash
cd /opt/dev/cores/warehousecore
docker build -t nobentie/warehousecore:X.Y.Z .
docker push nobentie/warehousecore:X.Y.Z
docker tag nobentie/warehousecore:X.Y.Z nobentie/warehousecore:latest
docker push nobentie/warehousecore:latest
```

- [ ] **Schritt 3: Cores-Dashboard Docker-Image bauen und pushen**

```bash
cd /opt/dev/cores/cores-dashboard
docker build -t nobentie/cores-dashboard:X.Y.Z .
docker push nobentie/cores-dashboard:X.Y.Z
docker tag nobentie/cores-dashboard:X.Y.Z nobentie/cores-dashboard:latest
docker push nobentie/cores-dashboard:latest
```

- [ ] **Schritt 4: README-Versionen aktualisieren und final committen**

```bash
git add warehousecore/README.md cores-dashboard/README.md
git commit -m "chore: bump versions after rental equipment custom fields feature"
git push
```

- [ ] **Schritt 5: Migration auf Produktions-DB anwenden** *(falls nicht in Task 1 geschehen)*

```bash
ssh noah@docker03.nt.local "docker exec -i tscores-postgres-1 psql -U warehousecore -d warehousecore" < warehousecore/migrations/024_rental_equipment_custom_fields.sql
```

---

## Selbst-Review

**Spec-Abdeckung:**
- ✅ Custom Fields pro Mietprodukt frei wählbar (Task 7 — Dropdown im Formular)
- ✅ Felddefinitionen im Cores-Dashboard anlegen/bearbeiten/löschen (Tasks 2, 4, 5, 6)
- ✅ Typen: Text, Zahl (mit Einheit), Dropdown (Tasks 2, 5)
- ✅ Löschen mit Fallback auf Deaktivierung (Task 2 — `DeleteRentalFieldDefinition`)
- ✅ Job-Ansicht read-only (Task 8 — job_form.html + job_detail.html)
- ✅ Reihenfolge via sort_order (Tasks 2, 7)
- ✅ DB-Migration + combined_init (Task 1)

**Typ-Konsistenz:**
- `RentalFieldValue` in Go (warehousecore) entspricht `FieldValue` in TypeScript
- `RentalFieldValueInput` / `FieldValueInput` konsistent zwischen Handlers und Frontend
- `fetchFieldValues` / `saveFieldValues` helper werden in Tasks 3 korrekt verwendet
- `warehouseApi` (nicht `api`) in `RentalFieldsTab.tsx` — korrekt, da Proxy zu WarehouseCore
