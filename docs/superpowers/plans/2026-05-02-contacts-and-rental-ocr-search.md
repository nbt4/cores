# Contacts + Mietprodukt OCR Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Mietprodukte in OCR InlineSearch suchbar machen; (2) Bestehende `customers`-Tabelle um `is_customer`/`is_supplier` Flags erweitern und UI zu "Kontakte" umbauen.

**Architecture:** Keine neue Tabelle — `is_supplier` und `is_customer` Booleans zur bestehenden `customers`-Tabelle hinzufügen. Alle bestehenden FKs (jobs → customers) bleiben unverändert. Lieferantenauswahl in `rental_equipment` via neuen `supplier_id FK → customers(customerid)`. Pickers filtern per Role-Flag.

**Tech Stack:** Go/GORM, Gin, PostgreSQL, React/TypeScript, Tailwind

---

## Phase A — Mietprodukte im OCR InlineSearch

### Task 1: Backend — SearchRentalEquipment Endpoint

**Files:**
- Modify: `rentalcore/internal/handlers/pdf_handler.go` (nach SearchPackages, ca. Zeile 1175)
- Modify: `rentalcore/cmd/server/main.go` (route registrieren, ca. Zeile 1480 + 1592)

⚠️ **ACHTUNG Modell/DB-Mismatch:** Das GORM-Model `RentalEquipment` nutzt `column:product_name`, `column:supplier_name`, `column:equipment_id`. Die init-SQL und die `CreateRentalEquipmentQuick`-Funktion nutzen `name`, `supplier`, `id`. **Raw SQL verwenden.**

- [ ] **Step 1: SearchRentalEquipment in pdf_handler.go einfügen**

Nach der `SearchPackages`-Funktion (ca. Zeile 1175):

```go
// SearchRentalEquipment searches rental equipment for OCR mapping
// GET /api/v1/pdf/rental-equipment/search?q=term
func (h *PDFHandler) SearchRentalEquipment(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter required"})
		return
	}

	type rentalResult struct {
		ID       int64  `json:"id"`
		Name     string `json:"name"`
		Supplier string `json:"supplier"`
	}

	pattern := "%" + query + "%"
	var results []rentalResult
	if err := h.DB.Raw(
		`SELECT id, name, COALESCE(supplier, '') AS supplier
		 FROM rental_equipment
		 WHERE is_active = true AND (name ILIKE ? OR supplier ILIKE ?)
		 ORDER BY name LIMIT 5`,
		pattern, pattern,
	).Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"rental_equipment": results})
}
```

- [ ] **Step 2: Route in main.go registrieren**

An beiden Stellen in main.go (apiPDF-Gruppe ca. Zeile 1480 und pdfAPI-Gruppe ca. Zeile 1592):

```go
apiPDF.GET("/rental-equipment/search", pdfHandler.SearchRentalEquipment)
```

```go
pdfAPI.GET("/rental-equipment/search", pdfHandler.SearchRentalEquipment)
```

- [ ] **Step 3: Manuell testen**

```bash
curl -s "http://localhost:8080/api/pdf/rental-equipment/search?q=kamera" | jq .
```

Erwartung: `{"rental_equipment": [...]}` mit `id`, `name`, `supplier` Feldern.

- [ ] **Step 4: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./...
```

Erwartung: kein Output (kein Fehler).

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores/rentalcore
git add internal/handlers/pdf_handler.go cmd/server/main.go
git commit -m "feat(pdf): add rental-equipment search endpoint for OCR mapping"
```

---

### Task 2: Frontend — Mietprodukte in InlineSearch

**Files:**
- Modify: `rentalcore/web/src/components/MappingModal.tsx` (InlineSearch `search`-Funktion, ca. Zeile 427–454)

- [ ] **Step 1: InlineSearch `search`-Funktion erweitern**

Die bestehende `search`-Funktion (ca. Zeile 431) fetched aktuell nur `products` und `packages`. Dritten Fetch für `rental_equipment` hinzufügen:

```typescript
const search = useCallback((q: string) => {
  if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
  setLoading(true);
  if (timer.current) clearTimeout(timer.current);
  timer.current = setTimeout(async () => {
    try {
      const [pRes, pkgRes, reRes] = await Promise.all([
        fetch(`/api/pdf/products/search?q=${encodeURIComponent(q)}&limit=5`, { credentials: 'include' }),
        fetch(`/api/pdf/packages/search?q=${encodeURIComponent(q)}&limit=3`, { credentials: 'include' }),
        fetch(`/api/pdf/rental-equipment/search?q=${encodeURIComponent(q)}`, { credentials: 'include' }),
      ]);
      const pd = pRes.ok ? await pRes.json() : {};
      const pkd = pkgRes.ok ? await pkgRes.json() : {};
      const red = reRes.ok ? await reRes.json() : {};
      const products: SearchResult[] = (pd.products || []).slice(0, 5).map((p: Record<string, unknown>) => ({
        id: (p.productID || p.ProductID) as number,
        name: (p.name || p.Name) as string,
        type: 'product' as const,
        sub: 'Produkt',
      }));
      const packages: SearchResult[] = (pkd.packages || []).slice(0, 3).map((p: Record<string, unknown>) => ({
        id: (p.package_id || p.PackageID) as number,
        name: (p.name || p.Name) as string,
        type: 'package' as const,
        sub: `Paket${p.package_code ? ' · ' + p.package_code : ''}`,
      }));
      const rentals: SearchResult[] = (red.rental_equipment || []).slice(0, 3).map((r: Record<string, unknown>) => ({
        id: r.id as number,
        name: r.name as string,
        type: 'product' as const,
        sub: `Mietprodukt${r.supplier ? ' · ' + r.supplier : ''}`,
      }));
      setResults([...products, ...packages, ...rentals]);
    } finally { setLoading(false); setSearched(true); }
  }, 300);
}, []);
```

> Hinweis: `type: 'product'` für rentals ist bewusst — das Mapping-System behandelt alle drei gleich. Falls du später unterscheiden willst, muss `SearchResult.type` um `'rental'` erweitert und das finalize-Handling angepasst werden.

- [ ] **Step 2: Placeholder-Text aktualisieren**

Ca. Zeile 467 — Input-Placeholder anpassen:

```tsx
placeholder="Produkt, Paket oder Mietprodukt suchen…"
```

- [ ] **Step 3: Frontend bauen und prüfen**

```bash
cd /opt/dev/cores/rentalcore/web && npm run build
```

Erwartung: `dist/` aktualisiert, kein TypeScript-Fehler.

- [ ] **Step 4: Manuell testen**

InlineSearch im OCR-Mapping öffnen, einen Mietprodukt-Namen eintippen → Ergebnis erscheint mit Badge `Mietprodukt · Lieferant`.

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores/rentalcore
git add web/src/components/MappingModal.tsx web/dist/
git commit -m "feat(mapping): add rental equipment to OCR inline search"
```

---

## Phase B — Kontakte (Customers + Suppliers)

### Task 3: DB-Migration — Role-Flags zur customers-Tabelle

**Files:**
- Modify: `migrations/postgresql/000_combined_init.sql` (customers CREATE TABLE)
- Modify: `migrations/postgresql/001_rentalcore_schema.sql` (customers CREATE TABLE, falls vorhanden)

- [ ] **Step 1: Init-SQL anpassen**

In `000_combined_init.sql`, `CREATE TABLE IF NOT EXISTS customers` Block, zwei Spalten hinzufügen (nach `customertype`-Zeile):

```sql
CREATE TABLE IF NOT EXISTS customers (
    customerid SERIAL PRIMARY KEY,
    name VARCHAR(255),
    companyname VARCHAR(255),
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    street VARCHAR(255),
    housenumber VARCHAR(20),
    zip VARCHAR(20),
    city VARCHAR(100),
    federalstate VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Deutschland',
    phonenumber VARCHAR(50),
    email VARCHAR(255),
    customertype VARCHAR(50),
    is_customer BOOLEAN NOT NULL DEFAULT TRUE,
    is_supplier BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Auf Live-DB anwenden**

```bash
ssh noah@docker03 "docker exec -i tscores-postgres-1 psql -U rentalcore -d rentalcore -c \
  \"ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_customer BOOLEAN NOT NULL DEFAULT TRUE; \
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_supplier BOOLEAN NOT NULL DEFAULT FALSE;\""
```

Erwartung: `ALTER TABLE` (kein Fehler).

- [ ] **Step 3: Prüfen**

```bash
ssh noah@docker03 "docker exec tscores-postgres-1 psql -U rentalcore -d rentalcore -c \
  \"\\d customers\""
```

Erwartung: `is_customer` und `is_supplier` Spalten sichtbar.

- [ ] **Step 4: supplier_id FK zu rental_equipment hinzufügen**

```bash
ssh noah@docker03 "docker exec -i tscores-postgres-1 psql -U rentalcore -d rentalcore -c \
  \"ALTER TABLE rental_equipment \
    ADD COLUMN IF NOT EXISTS supplier_id INT REFERENCES customers(customerid) ON DELETE SET NULL;\""
```

Init-SQL ebenfalls anpassen — in `rental_equipment` Block nach `supplier VARCHAR(255)`:

```sql
supplier_id  INT REFERENCES customers(customerid) ON DELETE SET NULL,
```

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores
git add migrations/postgresql/000_combined_init.sql migrations/postgresql/001_rentalcore_schema.sql
git commit -m "feat(db): add is_customer/is_supplier flags and rental_equipment.supplier_id FK"
```

---

### Task 4: Go-Model und Handler updaten

**Files:**
- Modify: `rentalcore/internal/models/models.go` (Customer struct)
- Modify: `rentalcore/internal/handlers/customer_handler.go` (CRUD + Filter)

- [ ] **Step 1: Customer-Model erweitern**

In `rentalcore/internal/models/models.go`, `Customer`-Struct:

```go
type Customer struct {
	CustomerID   uint    `json:"customer_id" gorm:"primaryKey;column:customerid"`
	CompanyName  *string `json:"companyname" gorm:"column:companyname"`
	LastName     *string `json:"lastname" gorm:"column:lastname"`
	FirstName    *string `json:"firstname" gorm:"column:firstname"`
	Street       *string `json:"street" gorm:"column:street"`
	HouseNumber  *string `json:"housenumber" gorm:"column:housenumber"`
	ZIP          *string `json:"ZIP" gorm:"column:zip"`
	City         *string `json:"city" gorm:"column:city"`
	FederalState *string `json:"federalstate" gorm:"column:federalstate"`
	Country      *string `json:"country" gorm:"column:country"`
	PhoneNumber  *string `json:"phonenumber" gorm:"column:phonenumber"`
	Email        *string `json:"email" gorm:"column:email"`
	CustomerType *string `json:"customertype" gorm:"column:customertype"`
	IsCustomer   bool    `json:"is_customer" gorm:"column:is_customer;default:true"`
	IsSupplier   bool    `json:"is_supplier" gorm:"column:is_supplier;default:false"`
	Notes        *string `json:"notes" gorm:"column:notes"`
	Jobs         []Job   `json:"jobs,omitempty" gorm:"-"`
}
```

- [ ] **Step 2: customer_handler.go finden**

```bash
ls /opt/dev/cores/rentalcore/internal/handlers/customer_handler.go
```

Falls nicht vorhanden:
```bash
grep -rn "func.*Customer\|GetCustomers\|CreateCustomer" /opt/dev/cores/rentalcore/internal/handlers/ | head -20
```

- [ ] **Step 3: Kontakte-API — role-Filter im GET-Endpoint**

In der List/Search-Funktion für Kunden (Handler der `GET /api/customers` oder ähnliche Route), Query-Parameter `role` auswerten:

```go
// role=customer → nur is_customer=true
// role=supplier → nur is_supplier=true
// role leer     → alle
role := c.Query("role")
db := h.DB.Model(&models.Customer{})
switch role {
case "customer":
    db = db.Where("is_customer = true")
case "supplier":
    db = db.Where("is_supplier = true")
}
```

- [ ] **Step 4: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./...
```

- [ ] **Step 5: Commit**

```bash
git add internal/models/models.go internal/handlers/customer_handler.go
git commit -m "feat(contacts): add is_customer/is_supplier to Customer model and role filter"
```

---

### Task 5: Frontend — Kontakte Admin-UI

**Files:**
- Identify: Wo liegt die Kunden-Listenseite? Suchen mit `grep -rn "Kunden\|customers" rentalcore/web/src/ | grep -v node_modules | head -20`
- Modify: Kunden-Formular (Create/Edit) — Checkboxen für `is_customer`/`is_supplier`
- Modify: Kunden-Liste — Rolle als Badge anzeigen
- Optional Modify: Navigation — "Kunden" → "Kontakte" umbenennen

- [ ] **Step 1: Kunden-Formular — Checkboxen hinzufügen**

Im Create/Edit-Formular für Kunden zwei Checkboxen ergänzen:

```tsx
<div className="flex gap-4">
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={form.is_customer ?? true}
      onChange={e => setForm(f => ({ ...f, is_customer: e.target.checked }))}
    />
    Kunde
  </label>
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={form.is_supplier ?? false}
      onChange={e => setForm(f => ({ ...f, is_supplier: e.target.checked }))}
    />
    Lieferant
  </label>
</div>
```

- [ ] **Step 2: Kontaktliste — Rollen-Badges**

In der Tabellenzeile / Karte pro Kontakt:

```tsx
<div className="flex gap-1">
  {contact.is_customer && (
    <span className="rc-badge rc-badge-blue text-xs">Kunde</span>
  )}
  {contact.is_supplier && (
    <span className="rc-badge rc-badge-green text-xs">Lieferant</span>
  )}
</div>
```

- [ ] **Step 3: Filter-Tabs in der Kontakte-Liste**

Oberhalb der Liste drei Tabs: `Alle | Kunden | Lieferanten`.
Tab-Auswahl → API-Call mit `?role=customer` bzw. `?role=supplier`.

```tsx
const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'supplier'>('all');
// ...
const url = roleFilter === 'all'
  ? '/api/customers'
  : `/api/customers?role=${roleFilter}`;
```

- [ ] **Step 4: Frontend bauen**

```bash
cd /opt/dev/cores/rentalcore/web && npm run build
```

- [ ] **Step 5: Manuell testen**

- Kontakt öffnen → Checkboxen sichtbar
- Checkbox "Lieferant" anklicken → Badge erscheint
- Tab "Lieferanten" → nur Kontakte mit `is_supplier=true`

- [ ] **Step 6: Commit**

```bash
cd /opt/dev/cores/rentalcore
git add web/src/ web/dist/
git commit -m "feat(contacts): add role badges, filter tabs, and is_customer/is_supplier checkboxes"
```

---

### Task 6: Supplier-Picker in Mietprodukt-Formular

**Files:**
- Modify: `rentalcore/web/src/components/MappingModal.tsx` (FullCreateModal, Mietprodukt-Tab)
- Modify: Mietprodukt-Formular in Admin-UI (falls separate Datei)

Ziel: Statt freies Textfeld `Lieferant` → Autocomplete-Picker der auf `GET /api/customers?role=supplier` sucht.

- [ ] **Step 1: SupplierPicker-Komponente im MappingModal**

Im `FullCreateModal`, Mietprodukt-Tab, `supplier`-Input ersetzen mit:

```tsx
// State
const [supplierQuery, setSupplierQuery] = useState('');
const [supplierResults, setSupplierResults] = useState<{id: number; name: string}[]>([]);
const [selectedSupplier, setSelectedSupplier] = useState<{id: number; name: string} | null>(null);

// Search
const searchSupplier = async (q: string) => {
  if (q.length < 2) { setSupplierResults([]); return; }
  const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}&role=supplier`, { credentials: 'include' });
  const d = res.ok ? await res.json() : {};
  setSupplierResults((d.customers || []).map((c: Record<string, unknown>) => ({
    id: c.customer_id as number,
    name: c.companyname || `${c.firstname} ${c.lastname}`,
  })));
};

// JSX
<div className="relative">
  <input
    value={selectedSupplier ? selectedSupplier.name : supplierQuery}
    onChange={e => { setSelectedSupplier(null); setSupplierQuery(e.target.value); searchSupplier(e.target.value); }}
    placeholder="Lieferant suchen…"
    className="rc-input rc-input-sm w-full"
  />
  {supplierResults.length > 0 && !selectedSupplier && (
    <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50"
      style={{ background: 'var(--rc-bg-card)', border: '1px solid var(--rc-border)' }}>
      {supplierResults.map(s => (
        <button key={s.id} type="button" onClick={() => { setSelectedSupplier(s); setSupplierResults([]); }}
          className="w-full px-3 py-2 text-sm text-left hover:bg-rc-bg-secondary">
          {s.name}
        </button>
      ))}
    </div>
  )}
</div>
```

Beim Submit `supplier_id: selectedSupplier?.id` mitschicken (neben `supplier: selectedSupplier?.name` für Rückwärtskompatibilität mit dem TEXT-Feld).

- [ ] **Step 2: Backend — CreateRentalEquipmentQuick supplier_id speichern**

In `pdf_handler.go`, `CreateRentalEquipmentQuick`-Funktion, `supplier_id` aus Request lesen und in INSERT aufnehmen:

```go
type rentalEquipmentQuickRequest struct {
    Name         string  `json:"name" binding:"required"`
    Supplier     string  `json:"supplier"`
    SupplierID   *int64  `json:"supplier_id"`
    RentalPrice  float64 `json:"rental_price"`
    CustomerPrice float64 `json:"customer_price"`
    Category     string  `json:"category"`
    Description  string  `json:"description"`
    Notes        string  `json:"notes"`
}
```

SQL anpassen:
```go
h.DB.Exec(
    `INSERT INTO rental_equipment (name, supplier, supplier_id, rental_price, customer_price, category, description, notes, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)`,
    req.Name, req.Supplier, req.SupplierID, req.RentalPrice, req.CustomerPrice, req.Category, req.Description, req.Notes,
)
```

- [ ] **Step 3: customer_handler.go — `GET /api/customers/search?role=` unterstützen**

Falls noch nicht: Such-Endpoint um `role`-Filter erweitern (wie in Task 4 Step 3).

- [ ] **Step 4: Build + Test**

```bash
cd /opt/dev/cores/rentalcore && go build ./...
cd web && npm run build
```

- [ ] **Step 5: Commit**

```bash
cd /opt/dev/cores/rentalcore
git add internal/handlers/pdf_handler.go web/src/components/MappingModal.tsx web/dist/
git commit -m "feat(contacts): supplier picker in rental equipment form with FK to contacts"
```

---

## Deployment (nach allen Tasks)

- [ ] README version bump in `rentalcore/README.md`
- [ ] GitLab push: `git push origin main`
- [ ] Docker build: `docker build -t nobentie/rentalcore:5.3.32 rentalcore/`
- [ ] Docker push: `docker push nobentie/rentalcore:5.3.32 && docker tag nobentie/rentalcore:5.3.32 nobentie/rentalcore:latest && docker push nobentie/rentalcore:latest`
- [ ] Auf docker03: `docker pull nobentie/rentalcore:latest` + Container restart (durch Nutzer via Komodo)

---

## Self-Review

**Spec-Abdeckung:**
- ✅ Mietprodukte im OCR InlineSearch suchbar
- ✅ Kontakte mit is_customer/is_supplier Flags
- ✅ Bestehende Jobs-FK unverändert
- ✅ Lieferant-Picker im Mietprodukt-Formular mit FK
- ✅ Admin-UI Filter-Tabs
- ⚠️ Navigation "Kunden" → "Kontakte" umbenennen: in Task 5 erwähnt aber kein exakter Dateipfad — `grep -rn '"Kunden"\|Kunden</' rentalcore/web/src/` vor Task 5 ausführen

**Bekannte Risiken:**
- `rental_equipment` Modell/DB-Spalten-Mismatch: Tasks 1+6 nutzen raw SQL, kein GORM-Model
- `customers/search` Endpoint: muss `role`-Parameter vor Task 6 unterstützen (Task 4)
