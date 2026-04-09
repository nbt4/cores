# Product Mapping: Auto-Link & Verwaltung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OCR-extrahierte Rechnungspositionen werden automatisch mit DB-Produkten verknüpft; bei Fehlschlag muss der Nutzer manuell mappen (inline, mit Hard-Block bis alles gemappt ist); alle Mappings sind über `/settings/mappings` global einsehbar und editierbar.

**Architecture:** Die Mapping-Infrastruktur (ProductMapper, PackageMapper, SaveMapping, pdf_product_mappings-Tabelle) existiert bereits vollständig. Es fehlen drei Dinge: (1) der Hard-Block im UI ("Create Job" gesperrt bis alle Items gemappt), (2) HTTP-Endpoints für die globale Mapping-Verwaltung (GET list, PUT edit, DELETE), (3) Template + Route für `/settings/mappings`. SaveManualMapping ruft SaveMapping bereits auf — die Auto-Save-Kette ist intakt.

**Tech Stack:** Go 1.21+, Gin, GORM, PostgreSQL, Go HTML Templates, Vanilla JS

---

## File Map

| Datei | Aktion | Zweck |
|---|---|---|
| `rentalcore/web/templates/pdf_mapping.html` | Modify | Hard-Block + Warning Banner + Management-Link |
| `rentalcore/internal/handlers/pdf_handler.go` | Modify | 4 neue Handler-Methoden |
| `rentalcore/internal/handlers/pdf_mapping_admin_test.go` | Create | Unit-Tests für Helper-Funktion |
| `rentalcore/cmd/server/main.go` | Modify | Route-Registrierung (4 neue Routes) |
| `rentalcore/web/templates/mapping_management.html` | Create | Verwaltungsseite Template |
| `rentalcore/web/templates/navbar.html` | Modify | Navigation-Link hinzufügen |

---

## Task 1: Hard-Block "Create Job" wenn Items noch pending sind

**Files:**
- Modify: `rentalcore/web/templates/pdf_mapping.html`

Die `updateStats()`-Funktion (ca. Zeile 230) aktualisiert bereits den Fortschrittsbalken, deaktiviert aber `finishMappingsBtn` nicht. `finishMappingsBtn` ist an `finishMapping()` gebunden, welches `finalizeMappings(true)` aufruft — ohne Pending-Check.

- [ ] **Step 1: Warning-Banner HTML hinzufügen**

Suche in `pdf_mapping.html` nach dem `mappingContainer` div (ca. Zeile 1397). Füge direkt davor ein Warning-Banner ein:

```html
<!-- Pending-Warning Banner — direkt vor <div id="mappingContainer" ...> -->
<div id="pendingWarningBanner" style="display:none; margin-bottom: 12px;">
    <div class="rc-alert rc-alert-warning" style="display:flex; align-items:center; gap:10px;">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span><strong id="pendingWarningCount">0</strong> Position(en) noch nicht gemappt — Job kann erst erstellt werden wenn alle Positionen zugeordnet sind.</span>
    </div>
</div>
```

- [ ] **Step 2: `updateStats()` erweitern um Button-Sperre und Banner**

In `pdf_mapping.html`, suche die Funktion `updateStats()` (ca. Zeile 228). Füge am Ende der Funktion (nach der letzten `if (bar)` Zeile) folgendes hinzu:

```javascript
    // Hard-block finalize button and show warning when items are pending
    const finishBtn = document.getElementById('finishMappingsBtn');
    const warningBanner = document.getElementById('pendingWarningBanner');
    const warningCount = document.getElementById('pendingWarningCount');
    if (finishBtn) {
        finishBtn.disabled = pending > 0;
        finishBtn.title = pending > 0 ? (pending + ' Position(en) noch nicht gemappt') : '';
        finishBtn.style.opacity = pending > 0 ? '0.45' : '';
        finishBtn.style.cursor = pending > 0 ? 'not-allowed' : '';
    }
    if (warningBanner) {
        warningBanner.style.display = pending > 0 ? '' : 'none';
    }
    if (warningCount) {
        warningCount.textContent = pending;
    }
```

- [ ] **Step 3: Button-State beim Laden der Seite initialisieren**

Suche in `pdf_mapping.html` nach dem `DOMContentLoaded`-Listener mit Ctrl+F. Falls `updateStats()` dort bereits aufgerufen wird, ist dieser Schritt erledigt. Falls nicht, füge am Ende des `DOMContentLoaded`-Blocks hinzu:

```javascript
    updateStats();
```

- [ ] **Step 4: Management-Link im Footer ergänzen**

Suche in `pdf_mapping.html` die Zeile mit `id="finishMappingsBtn"` (ca. Zeile 1554). Die Footer-Section hat eine `justify-content: space-between`-Div mit einem "Back to Review"-Button links. Ändere den linken Teil:

Alt:
```html
                <button onclick="window.location.href='/pdf/review/{{.upload.UploadID}}'" class="rc-btn rc-btn-secondary">
                    <i class="bi bi-arrow-left"></i> Back to Review
                </button>
```

Neu:
```html
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button onclick="window.location.href='/pdf/review/{{.upload.UploadID}}'" class="rc-btn rc-btn-secondary">
                        <i class="bi bi-arrow-left"></i> Back to Review
                    </button>
                    <a href="/settings/mappings" class="rc-btn rc-btn-outline rc-btn-sm" style="font-size:12px;">
                        <i class="bi bi-database-gear"></i> Globale Mappings
                    </a>
                </div>
```

- [ ] **Step 5: Visuell testen**

Öffne eine Extraction mit pending Items. Prüfe:
- Warning-Banner sichtbar mit korrekter Anzahl
- "Create Job & Open Editor" Button ausgegraut und nicht klickbar
- Wenn alle Items gemappt: Banner verschwindet, Button wird aktiv
- "Globale Mappings" Link sichtbar (führt noch zu 404 — wird in Task 3 behoben)

- [ ] **Step 6: Commit**

```bash
cd rentalcore
git add web/templates/pdf_mapping.html
git commit -m "feat: block job creation until all PDF items are mapped"
```

---

## Task 2: Handler-Methoden für Mapping-Verwaltung

**Files:**
- Modify: `rentalcore/internal/handlers/pdf_handler.go`
- Create: `rentalcore/internal/handlers/pdf_mapping_admin_test.go`

Füge 4 neue Methoden am Ende von `pdf_handler.go` hinzu.

- [ ] **Step 1: Hilfsstruct `MappingRow` und `buildMappingRows` definieren**

Füge am Ende von `pdf_handler.go` hinzu:

```go
// MappingRow is the enriched view model for the mapping management page and API.
type MappingRow struct {
	MappingID   uint64 `json:"mapping_id"`
	OCRText     string `json:"ocr_text"`
	TargetName  string `json:"target_name"`
	TargetType  string `json:"target_type"` // "product" or "package"
	TargetID    int    `json:"target_id"`
	MappingType string `json:"mapping_type"`
	UsageCount  int    `json:"usage_count"`
}

// buildMappingRows combines product and package mappings into enriched MappingRows.
// productNames and packageNames are lookup maps (id -> name) used to resolve target names.
func buildMappingRows(
	productMappings []models.PDFProductMapping,
	packageMappings []models.PDFPackageMapping,
	productNames map[int]string,
	packageNames map[int]string,
) []MappingRow {
	rows := make([]MappingRow, 0, len(productMappings)+len(packageMappings))
	for _, m := range productMappings {
		name, ok := productNames[m.ProductID]
		if !ok {
			name = fmt.Sprintf("Product #%d", m.ProductID)
		}
		rows = append(rows, MappingRow{
			MappingID:   m.MappingID,
			OCRText:     m.PDFProductText,
			TargetName:  name,
			TargetType:  "product",
			TargetID:    m.ProductID,
			MappingType: m.MappingType,
			UsageCount:  m.UsageCount,
		})
	}
	for _, m := range packageMappings {
		name, ok := packageNames[m.PackageID]
		if !ok {
			name = fmt.Sprintf("Package #%d", m.PackageID)
		}
		rows = append(rows, MappingRow{
			MappingID:   m.MappingID,
			OCRText:     m.PDFPackageText,
			TargetName:  name,
			TargetType:  "package",
			TargetID:    m.PackageID,
			MappingType: m.MappingType,
			UsageCount:  m.UsageCount,
		})
	}
	return rows
}
```

- [ ] **Step 2: Test für `buildMappingRows` schreiben**

Erstelle `rentalcore/internal/handlers/pdf_mapping_admin_test.go`:

```go
package handlers

import (
	"testing"

	"go-barcode-webapp/internal/models"
)

func TestBuildMappingRows_ProductsAndPackages(t *testing.T) {
	productMappings := []models.PDFProductMapping{
		{MappingID: 1, PDFProductText: "Mikrofon e935", ProductID: 10, MappingType: "manual", UsageCount: 5},
		{MappingID: 2, PDFProductText: "DI-Box passiv", ProductID: 99, MappingType: "fuzzy", UsageCount: 1},
	}
	packageMappings := []models.PDFPackageMapping{
		{MappingID: 3, PDFPackageText: "PA Paket klein", PackageID: 7, MappingType: "manual", UsageCount: 2},
	}
	productNames := map[int]string{10: "Sennheiser e935"}
	packageNames := map[int]string{7: "PA Set S"}

	rows := buildMappingRows(productMappings, packageMappings, productNames, packageNames)

	if len(rows) != 3 {
		t.Fatalf("expected 3 rows, got %d", len(rows))
	}

	// First row: known product
	if rows[0].TargetType != "product" || rows[0].TargetName != "Sennheiser e935" || rows[0].TargetID != 10 {
		t.Errorf("row[0] unexpected: %+v", rows[0])
	}

	// Second row: unknown product ID falls back to "Product #99"
	if rows[1].TargetName != "Product #99" {
		t.Errorf("row[1] fallback name: got %q, want %q", rows[1].TargetName, "Product #99")
	}

	// Third row: package
	if rows[2].TargetType != "package" || rows[2].TargetName != "PA Set S" || rows[2].TargetID != 7 {
		t.Errorf("row[2] unexpected: %+v", rows[2])
	}
}

func TestBuildMappingRows_Empty(t *testing.T) {
	rows := buildMappingRows(nil, nil, nil, nil)
	if len(rows) != 0 {
		t.Errorf("expected empty, got %d rows", len(rows))
	}
}
```

- [ ] **Step 3: Test ausführen — muss FAIL sein**

```bash
cd rentalcore
go test ./internal/handlers/ -run TestBuildMappingRows -v
```

Erwartete Ausgabe: `FAIL` — `buildMappingRows` noch nicht definiert.

- [ ] **Step 4: `buildMappingRows` + `MappingRow` aus Step 1 in `pdf_handler.go` eintragen**

Füge den Code aus Step 1 am Ende von `pdf_handler.go` ein.

- [ ] **Step 5: Test ausführen — muss PASS sein**

```bash
cd rentalcore
go test ./internal/handlers/ -run TestBuildMappingRows -v
```

Erwartete Ausgabe:
```
=== RUN   TestBuildMappingRows_ProductsAndPackages
--- PASS: TestBuildMappingRows_ProductsAndPackages
=== RUN   TestBuildMappingRows_Empty
--- PASS: TestBuildMappingRows_Empty
PASS
```

- [ ] **Step 6: `GetAllMappingsAPI` Handler hinzufügen**

Füge nach `buildMappingRows` in `pdf_handler.go` hinzu:

```go
// GetAllMappingsAPI returns all active product and package mappings as JSON.
// GET /api/v1/pdf/mappings
func (h *PDFHandler) GetAllMappingsAPI(c *gin.Context) {
	productMappings, err := h.Mapper.GetAllMappings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load product mappings"})
		return
	}

	var packageMappings []models.PDFPackageMapping
	if h.PackageMapper != nil {
		packageMappings, err = h.PackageMapper.GetAllMappings()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load package mappings"})
			return
		}
	}

	productIDSet := make(map[int]struct{})
	for _, m := range productMappings {
		productIDSet[m.ProductID] = struct{}{}
	}
	packageIDSet := make(map[int]struct{})
	for _, m := range packageMappings {
		packageIDSet[m.PackageID] = struct{}{}
	}

	productNames := make(map[int]string)
	if len(productIDSet) > 0 {
		ids := make([]int, 0, len(productIDSet))
		for id := range productIDSet {
			ids = append(ids, id)
		}
		var products []models.Product
		h.DB.Select("productid, name").Where("productid IN ?", ids).Find(&products)
		for _, p := range products {
			productNames[int(p.ProductID)] = p.Name
		}
	}

	packageNames := make(map[int]string)
	if len(packageIDSet) > 0 {
		ids := make([]int, 0, len(packageIDSet))
		for id := range packageIDSet {
			ids = append(ids, id)
		}
		var packages []models.ProductPackage
		h.DB.Select("package_id, name").Where("package_id IN ?", ids).Find(&packages)
		for _, p := range packages {
			packageNames[p.PackageID] = p.Name
		}
	}

	rows := buildMappingRows(productMappings, packageMappings, productNames, packageNames)
	c.JSON(http.StatusOK, gin.H{"mappings": rows})
}
```

- [ ] **Step 7: `DeleteMappingAPI` Handler hinzufügen**

Füge nach `GetAllMappingsAPI` hinzu:

```go
// DeleteMappingAPI soft-deletes a mapping (sets is_active = false).
// DELETE /api/v1/pdf/mappings/:id?type=product|package
func (h *PDFHandler) DeleteMappingAPI(c *gin.Context) {
	idParam := c.Param("id")
	mappingID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid mapping ID"})
		return
	}

	mappingType := strings.ToLower(c.DefaultQuery("type", "product"))

	switch mappingType {
	case "product":
		if err := h.Mapper.DeleteMapping(mappingID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete mapping"})
			return
		}
	case "package":
		if h.PackageMapper == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Package mapper not available"})
			return
		}
		if err := h.PackageMapper.DeleteMapping(mappingID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete mapping"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'product' or 'package'"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
```

- [ ] **Step 8: `UpdateMappingAPI` Handler hinzufügen**

Füge nach `DeleteMappingAPI` hinzu:

```go
// UpdateMappingAPI changes the target product or package for an existing mapping.
// PUT /api/v1/pdf/mappings/:id
// Body: { "type": "product"|"package", "target_id": 15 }
func (h *PDFHandler) UpdateMappingAPI(c *gin.Context) {
	idParam := c.Param("id")
	mappingID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid mapping ID"})
		return
	}

	var req struct {
		Type     string `json:"type" binding:"required"`
		TargetID int    `json:"target_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type and target_id are required"})
		return
	}

	switch strings.ToLower(req.Type) {
	case "product":
		var product models.Product
		if err := h.DB.First(&product, req.TargetID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}
		if err := h.DB.Model(&models.PDFProductMapping{}).
			Where("mapping_id = ?", mappingID).
			Updates(map[string]interface{}{
				"product_id":   req.TargetID,
				"mapping_type": "manual",
				"is_active":    true,
			}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update mapping"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "target_name": product.Name})

	case "package":
		var pkg models.ProductPackage
		if err := h.DB.First(&pkg, req.TargetID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Package not found"})
			return
		}
		if err := h.DB.Model(&models.PDFPackageMapping{}).
			Where("mapping_id = ?", mappingID).
			Updates(map[string]interface{}{
				"package_id":   req.TargetID,
				"mapping_type": "manual",
				"is_active":    true,
			}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update mapping"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "target_name": pkg.Name})

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'product' or 'package'"})
	}
}
```

- [ ] **Step 9: `ShowMappingManagement` Handler hinzufügen**

Füge nach `UpdateMappingAPI` hinzu:

```go
// ShowMappingManagement renders the global mapping management page.
// GET /settings/mappings
func (h *PDFHandler) ShowMappingManagement(c *gin.Context) {
	productMappings, err := h.Mapper.GetAllMappings()
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{"error": err.Error()})
		return
	}

	var packageMappings []models.PDFPackageMapping
	if h.PackageMapper != nil {
		packageMappings, err = h.PackageMapper.GetAllMappings()
		if err != nil {
			c.HTML(http.StatusInternalServerError, "error.html", gin.H{"error": err.Error()})
			return
		}
	}

	productIDSet := make(map[int]struct{})
	for _, m := range productMappings {
		productIDSet[m.ProductID] = struct{}{}
	}
	productNames := make(map[int]string)
	if len(productIDSet) > 0 {
		ids := make([]int, 0, len(productIDSet))
		for id := range productIDSet {
			ids = append(ids, id)
		}
		var products []models.Product
		h.DB.Select("productid, name").Where("productid IN ?", ids).Find(&products)
		for _, p := range products {
			productNames[int(p.ProductID)] = p.Name
		}
	}

	packageIDSet := make(map[int]struct{})
	for _, m := range packageMappings {
		packageIDSet[m.PackageID] = struct{}{}
	}
	packageNames := make(map[int]string)
	if len(packageIDSet) > 0 {
		ids := make([]int, 0, len(packageIDSet))
		for id := range packageIDSet {
			ids = append(ids, id)
		}
		var packages []models.ProductPackage
		h.DB.Select("package_id, name").Where("package_id IN ?", ids).Find(&packages)
		for _, p := range packages {
			packageNames[p.PackageID] = p.Name
		}
	}

	rows := buildMappingRows(productMappings, packageMappings, productNames, packageNames)

	user, _ := c.Get("user")
	c.HTML(http.StatusOK, "mapping_management.html", gin.H{
		"mappings":    rows,
		"title":       "Produkt-Mappings",
		"currentPage": "mappings",
		"user":        user,
	})
}
```

- [ ] **Step 10: Kompilieren prüfen**

```bash
cd rentalcore
go build ./...
```

Erwartete Ausgabe: keine Fehler. Bei Fehlern `strconv not imported`: Prüfen ob `strconv` bereits in den Imports von `pdf_handler.go` steht — falls nicht, zum Import-Block hinzufügen.

- [ ] **Step 11: Alle Tests ausführen**

```bash
cd rentalcore
go test ./internal/handlers/ -v 2>&1 | tail -20
```

Erwartete Ausgabe: alle bestehenden Tests PASS, neue `TestBuildMappingRows` Tests PASS.

- [ ] **Step 12: Commit**

```bash
cd rentalcore
git add internal/handlers/pdf_handler.go internal/handlers/pdf_mapping_admin_test.go
git commit -m "feat: add mapping management handlers (list, update, delete, show page)"
```

---

## Task 3: Neue Routes in `main.go` registrieren

**Files:**
- Modify: `rentalcore/cmd/server/main.go`

- [ ] **Step 1: UI-Route für Management-Seite in `settings`-Gruppe hinzufügen**

Suche in `main.go` nach der `settings`-Gruppe (ca. Zeile 1129):

```go
settings.GET("/company", func(c *gin.Context) {
```

Füge in der `settings`-Gruppe direkt nach `/company`-Routen hinzu:

```go
settings.GET("/mappings", pdfHandler.ShowMappingManagement)
```

- [ ] **Step 2: API-Routes in `apiPDF`-Gruppe hinzufügen**

Suche in `main.go` nach:

```go
apiPDF.POST("/from-pool/:documentID", pdfHandler.ProcessPoolDocument)
apiPDF.GET("/pool-documents", pdfHandler.GetPoolDocumentsForOCR)
```

Füge direkt darunter hinzu:

```go
apiPDF.GET("/mappings", pdfHandler.GetAllMappingsAPI)
apiPDF.DELETE("/mappings/:id", pdfHandler.DeleteMappingAPI)
apiPDF.PUT("/mappings/:id", pdfHandler.UpdateMappingAPI)
```

- [ ] **Step 3: API-Routes im Legacy-`pdfAPI`-Block wiederholen**

Suche in `main.go` nach:

```go
pdfAPI.POST("/from-pool/:documentID", pdfHandler.ProcessPoolDocument)
pdfAPI.GET("/pool-documents", pdfHandler.GetPoolDocumentsForOCR)
```

Füge direkt darunter hinzu:

```go
pdfAPI.GET("/mappings", pdfHandler.GetAllMappingsAPI)
pdfAPI.DELETE("/mappings/:id", pdfHandler.DeleteMappingAPI)
pdfAPI.PUT("/mappings/:id", pdfHandler.UpdateMappingAPI)
```

- [ ] **Step 4: Kompilieren prüfen**

```bash
cd rentalcore
go build ./...
```

Erwartete Ausgabe: keine Fehler.

- [ ] **Step 5: Commit**

```bash
cd rentalcore
git add cmd/server/main.go
git commit -m "feat: register mapping management routes"
```

---

## Task 4: `mapping_management.html` Template erstellen

**Files:**
- Create: `rentalcore/web/templates/mapping_management.html`

Das Template nutzt Go-Template-Syntax und den bestehenden `base`-Layout. Alle DOM-Manipulationen im JavaScript verwenden `textContent` und `createElement` statt `innerHTML` (XSS-sicher).

- [ ] **Step 1: Prüfen welches base-Template die Settings-Seiten nutzen**

```bash
cd rentalcore
grep -h 'template "' web/templates/settings*.html web/templates/*company*.html 2>/dev/null | head -5
```

Merke dir den Template-Namen (z.B. `"base"`, `"layout"`). Nutze diesen in Schritt 2.

- [ ] **Step 2: Template erstellen**

Erstelle `rentalcore/web/templates/mapping_management.html`. Ersetze `"base"` in der ersten Zeile durch den Template-Namen aus Step 1 falls abweichend:

```html
{{template "base" .}}

{{define "title"}}Produkt-Mappings{{end}}

{{define "content"}}
<div class="rc-container">
    <div class="rc-page-header">
        <div>
            <h1 class="rc-page-title">
                <i class="bi bi-database-gear"></i> Produkt-Mappings
            </h1>
            <p class="rc-text-muted">Gespeicherte Zuordnungen zwischen OCR-Texten und Produkten/Paketen.</p>
        </div>
    </div>

    <div id="mappingStatusMsg"></div>

    <div class="rc-card" style="margin-bottom: 16px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
            <input type="text" class="rc-input" id="mappingSearchInput"
                   placeholder="OCR-Text oder Produktname suchen..."
                   style="flex:1; min-width:200px;"
                   oninput="filterMappings()">
            <select class="rc-input" id="mappingTypeFilter" style="width:auto;" onchange="filterMappings()">
                <option value="">Alle Typen</option>
                <option value="manual">manual</option>
                <option value="fuzzy">fuzzy</option>
                <option value="exact">exact</option>
            </select>
            <span class="rc-text-muted rc-text-sm" id="mappingCount">{{len .mappings}} Einträge</span>
        </div>
    </div>

    <div class="rc-card">
        {{if .mappings}}
        <div style="overflow-x:auto;">
        <table class="rc-table" id="mappingsTable" style="width:100%;">
            <thead>
                <tr>
                    <th>OCR-Text</th>
                    <th>Produkt / Paket</th>
                    <th>Typ</th>
                    <th style="text-align:center;">Verwendet</th>
                    <th style="text-align:right;">Aktionen</th>
                </tr>
            </thead>
            <tbody>
            {{range .mappings}}
            <tr class="mapping-row"
                data-mapping-id="{{.MappingID}}"
                data-target-type="{{.TargetType}}"
                data-target-id="{{.TargetID}}"
                data-ocr-text="{{.OCRText}}"
                data-target-name="{{.TargetName}}"
                data-mapping-type="{{.MappingType}}">
                <td style="max-width:280px; word-break:break-word;">
                    <span class="rc-text-sm">{{.OCRText}}</span>
                </td>
                <td>
                    <div class="mapping-target-view" style="display:flex; align-items:center; gap:6px;">
                        {{if eq .TargetType "package"}}
                        <i class="bi bi-box-seam" style="color:#ffc44d;"></i>
                        {{else}}
                        <i class="bi bi-tag" style="color:var(--rc-success);"></i>
                        {{end}}
                        <span class="target-name-text">{{.TargetName}}</span>
                        <span class="rc-badge rc-badge-sm" style="background:var(--rc-bg-secondary);color:var(--rc-text-secondary);">{{.TargetType}}</span>
                    </div>
                    <div class="mapping-edit-form" style="display:none; position:relative;">
                        <div style="display:flex; gap:6px; align-items:center;">
                            <input type="text" class="rc-input rc-input-sm edit-search-input"
                                   placeholder="Produkt suchen..."
                                   style="flex:1;"
                                   oninput="onEditSearchInput(this, {{.MappingID}})">
                            <button type="button" class="rc-btn rc-btn-sm rc-btn-secondary"
                                    onclick="cancelEdit({{.MappingID}})">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>
                        <div class="edit-search-results" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:200; background:var(--rc-bg-card); border:1px solid var(--rc-border); border-radius:6px; max-height:200px; overflow-y:auto; box-shadow:0 4px 12px rgba(0,0,0,0.2);"></div>
                    </div>
                </td>
                <td>
                    <span class="rc-badge rc-badge-sm {{if eq .MappingType "manual"}}rc-badge-success{{else if eq .MappingType "fuzzy"}}rc-badge-info{{else}}rc-badge-secondary{{end}}">
                        {{.MappingType}}
                    </span>
                </td>
                <td style="text-align:center; color:var(--rc-text-secondary);">{{.UsageCount}}&times;</td>
                <td style="text-align:right;">
                    <div style="display:flex; gap:6px; justify-content:flex-end;">
                        <button type="button" class="rc-btn rc-btn-sm rc-btn-outline edit-btn"
                                onclick="startEdit({{.MappingID}})">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button type="button" class="rc-btn rc-btn-sm rc-btn-danger delete-btn"
                                onclick="deleteMapping({{.MappingID}}, '{{.TargetType}}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
            {{end}}
            </tbody>
        </table>
        </div>
        {{else}}
        <div class="rc-empty-state" style="text-align:center; padding:40px;">
            <i class="bi bi-database-slash" style="font-size:48px; color:var(--rc-text-secondary);"></i>
            <p class="rc-text-muted" style="margin-top:12px;">Noch keine Mappings gespeichert.</p>
            <p class="rc-text-sm rc-text-muted">Mappings entstehen automatisch wenn du im PDF-Workflow Positionen manuell zuordnest.</p>
        </div>
        {{end}}
    </div>
</div>

<script>
var searchEditTimers = {};

function filterMappings() {
    var query = (document.getElementById('mappingSearchInput').value || '').toLowerCase();
    var typeFilter = (document.getElementById('mappingTypeFilter').value || '').toLowerCase();
    var visibleCount = 0;

    document.querySelectorAll('.mapping-row').forEach(function(row) {
        var ocrText = (row.dataset.ocrText || '').toLowerCase();
        var targetName = (row.dataset.targetName || '').toLowerCase();
        var mappingType = (row.dataset.mappingType || '').toLowerCase();

        var matchesQuery = !query || ocrText.includes(query) || targetName.includes(query);
        var matchesType = !typeFilter || mappingType === typeFilter;

        var visible = matchesQuery && matchesType;
        row.style.display = visible ? '' : 'none';
        if (visible) { visibleCount++; }
    });

    var countEl = document.getElementById('mappingCount');
    if (countEl) { countEl.textContent = visibleCount + ' Einträge'; }
}

function startEdit(mappingId) {
    var row = document.querySelector('[data-mapping-id="' + mappingId + '"]');
    if (!row) { return; }
    row.querySelector('.mapping-target-view').style.display = 'none';
    row.querySelector('.mapping-edit-form').style.display = '';
    row.querySelector('.edit-btn').style.display = 'none';
    row.querySelector('.edit-search-input').focus();
}

function cancelEdit(mappingId) {
    var row = document.querySelector('[data-mapping-id="' + mappingId + '"]');
    if (!row) { return; }
    row.querySelector('.mapping-target-view').style.display = '';
    row.querySelector('.mapping-edit-form').style.display = 'none';
    row.querySelector('.edit-btn').style.display = '';
    var resultsEl = row.querySelector('.edit-search-results');
    if (resultsEl) {
        resultsEl.style.display = 'none';
        while (resultsEl.firstChild) { resultsEl.removeChild(resultsEl.firstChild); }
    }
}

function onEditSearchInput(inputEl, mappingId) {
    var q = inputEl.value.trim();
    var row = document.querySelector('[data-mapping-id="' + mappingId + '"]');
    var resultsEl = row ? row.querySelector('.edit-search-results') : null;
    if (!resultsEl) { return; }

    if (q.length < 2) {
        resultsEl.style.display = 'none';
        return;
    }

    clearTimeout(searchEditTimers[mappingId]);
    searchEditTimers[mappingId] = setTimeout(function() {
        Promise.all([
            fetch('/api/v1/pdf/products/search?q=' + encodeURIComponent(q) + '&limit=4').then(function(r) { return r.ok ? r.json() : []; }),
            fetch('/api/v1/pdf/packages/search?q=' + encodeURIComponent(q) + '&limit=3').then(function(r) { return r.ok ? r.json() : []; }),
        ]).then(function(results) {
            var products = results[0];
            var packages = results[1];
            var prodList = (products.products || products || []).slice(0, 4);
            var pkgList = (packages.packages || packages || []).slice(0, 3);

            while (resultsEl.firstChild) { resultsEl.removeChild(resultsEl.firstChild); }

            var items = [];
            prodList.forEach(function(p) {
                items.push({ id: p.productID || p.ProductID, name: p.name || p.Name, type: 'product', sub: 'Produkt' });
            });
            pkgList.forEach(function(p) {
                var code = p.package_code || p.PackageCode || '';
                items.push({ id: p.package_id || p.PackageID, name: p.name || p.Name, type: 'package', sub: 'Paket' + (code ? ' \u00b7 ' + code : '') });
            });

            if (items.length === 0) {
                var empty = document.createElement('div');
                empty.className = 'rc-text-muted';
                empty.style.padding = '8px 12px';
                empty.textContent = 'Keine Treffer';
                resultsEl.appendChild(empty);
            } else {
                items.forEach(function(item) {
                    var div = document.createElement('div');
                    div.style.cssText = 'padding:8px 12px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-size:13px;';
                    div.addEventListener('mouseover', function() { div.style.background = 'var(--rc-bg-secondary)'; });
                    div.addEventListener('mouseout', function() { div.style.background = ''; });

                    var nameSpan = document.createElement('span');
                    nameSpan.textContent = item.name;

                    var subSpan = document.createElement('span');
                    subSpan.className = 'rc-text-xs rc-text-muted';
                    subSpan.textContent = item.sub;

                    div.appendChild(nameSpan);
                    div.appendChild(subSpan);
                    div.addEventListener('click', function() {
                        confirmEdit(mappingId, item.type, item.id, item.name);
                    });
                    resultsEl.appendChild(div);
                });
            }
            resultsEl.style.display = '';
        }).catch(function(e) {
            console.error('Search error:', e);
        });
    }, 300);
}

function confirmEdit(mappingId, type, targetId, targetName) {
    fetch('/api/v1/pdf/mappings/' + mappingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, target_id: targetId }),
    }).then(function(res) {
        return res.json().then(function(data) {
            if (!res.ok || !data.success) { throw new Error(data.error || 'Update fehlgeschlagen'); }
            return data;
        });
    }).then(function() {
        var row = document.querySelector('[data-mapping-id="' + mappingId + '"]');
        if (row) {
            var nameEl = row.querySelector('.target-name-text');
            if (nameEl) { nameEl.textContent = targetName; }
            row.dataset.targetType = type;
            row.dataset.targetId = targetId;
            row.dataset.targetName = targetName;
        }
        cancelEdit(mappingId);
        showMappingMsg('success', 'Mapping auf "' + targetName + '" aktualisiert.');
    }).catch(function(e) {
        showMappingMsg('error', e.message);
    });
}

function deleteMapping(mappingId, type) {
    if (!confirm('Dieses Mapping wirklich l\u00f6schen? Die n\u00e4chste Rechnung mit diesem OCR-Text wird nicht mehr automatisch gemappt.')) { return; }
    fetch('/api/v1/pdf/mappings/' + mappingId + '?type=' + type, { method: 'DELETE' })
        .then(function(res) {
            return res.json().then(function(data) {
                if (!res.ok || !data.success) { throw new Error(data.error || 'L\u00f6schen fehlgeschlagen'); }
            });
        })
        .then(function() {
            var row = document.querySelector('[data-mapping-id="' + mappingId + '"]');
            if (row) { row.parentNode.removeChild(row); }
            showMappingMsg('success', 'Mapping gel\u00f6scht.');
            filterMappings();
        })
        .catch(function(e) {
            showMappingMsg('error', e.message);
        });
}

function showMappingMsg(type, msg) {
    var el = document.getElementById('mappingStatusMsg');
    if (!el) { return; }
    while (el.firstChild) { el.removeChild(el.firstChild); }

    var div = document.createElement('div');
    div.className = 'rc-alert ' + (type === 'success' ? 'rc-alert-success' : 'rc-alert-danger');
    div.style.marginBottom = '12px';

    var icon = document.createElement('i');
    icon.className = 'bi ' + (type === 'success' ? 'bi-check-circle' : 'bi-x-circle');
    div.appendChild(icon);

    var text = document.createTextNode(' ' + msg);
    div.appendChild(text);

    el.appendChild(div);
    setTimeout(function() {
        if (el.contains(div)) { el.removeChild(div); }
    }, 4000);
}
</script>
{{end}}
```

- [ ] **Step 3: Template-Basis prüfen und ggf. anpassen**

```bash
cd rentalcore
grep -h 'template "' web/templates/mapping_management.html
```

Falls der Basis-Template-Name nicht `"base"` ist, erste Zeile anpassen.

- [ ] **Step 4: Seite manuell testen**

- Öffne `/settings/mappings` im Browser
- Prüfe: Tabelle lädt mit allen Mappings, Suchfeld filtert live ohne Seitenreload
- Edit: Klick auf "Edit" öffnet Suchfeld in der Zeile, Suche liefert Vorschläge, Klick auf Vorschlag aktualisiert die Anzeige ohne Reload
- Delete: Klick auf Mülleimer zeigt `confirm()`-Dialog, bei OK verschwindet die Zeile

- [ ] **Step 5: Commit**

```bash
cd rentalcore
git add web/templates/mapping_management.html
git commit -m "feat: add mapping management page template"
```

---

## Task 5: Navbar-Link + finale Verifikation

**Files:**
- Modify: `rentalcore/web/templates/navbar.html`

- [ ] **Step 1: Link zur Mapping-Verwaltung in der Navbar ergänzen**

Suche in `navbar.html` nach:

```html
<a href="/settings/company" class="rc-user-dropdown-item {{if eq .currentPage "settings"}}active{{end}}">
    <i class="bi bi-building-gear"></i>
    <span class="rc-nav-label">Company Settings</span>
</a>
```

Füge direkt darunter hinzu:

```html
<a href="/settings/mappings" class="rc-user-dropdown-item {{if eq .currentPage "mappings"}}active{{end}}">
    <i class="bi bi-database-gear"></i>
    <span class="rc-nav-label">Produkt-Mappings</span>
</a>
```

- [ ] **Step 2: Alle Tests nochmal ausführen**

```bash
cd rentalcore
go test ./... 2>&1 | tail -10
```

Erwartete Ausgabe: alle Tests PASS, kein `FAIL`.

- [ ] **Step 3: Kompilieren nochmal prüfen**

```bash
cd rentalcore
go build ./...
```

- [ ] **Step 4: End-to-End-Flow manuell prüfen**

1. PDF-Rechnung hochladen mit mehreren Positionen
2. Mapping-Seite: Warning-Banner erscheint, "Create Job" Button ausgegraut
3. Items mappen: Banner zählt runter, Button wird beim letzten Item aktiv
4. "Globale Mappings"-Link klicken: `/settings/mappings` lädt
5. Navbar User-Dropdown: "Produkt-Mappings"-Link vorhanden und aktiv wenn auf der Seite
6. Mapping bearbeiten: Edit-Suchfeld + Confirm funktionieren ohne Reload
7. Mapping löschen: Confirm-Dialog, Zeile verschwindet

- [ ] **Step 5: README-Version prüfen und Docker-Image bauen**

```bash
cd rentalcore

# Aktuelle Version aus README ermitteln
grep -E "Version|version|[0-9]+\.[0-9]+\.[0-9]+" README.md | head -3
```

Dann neue Patch-Version (z.B. `5.x.y` -> `5.x.(y+1)`) setzen und bauen:

```bash
# VERSION durch tatsaechliche neue Versionsnummer ersetzen
docker build -t nobentie/rentalcore:VERSION .
docker push nobentie/rentalcore:VERSION
docker tag nobentie/rentalcore:VERSION nobentie/rentalcore:latest
docker push nobentie/rentalcore:latest

git push
```

- [ ] **Step 6: Final Commit**

```bash
cd rentalcore
git add web/templates/navbar.html
git commit -m "feat: add product mappings nav link"
git push
```

---

## Spec-Abdeckungs-Checklist

| Spec-Anforderung | Task |
|---|---|
| Auto-mapping (fuzzy + gespeicherte Lookups) | bereits vorhanden — kein Code noetig |
| Inline search UX fuer unmapped items | bereits in pdf_mapping.html (searchProducts + suggestions) |
| Hard-block "Create Job" bis alles gemappt | Task 1 |
| Warning banner mit pending count | Task 1 |
| Workflow-Mappings auto-global gespeichert | SaveManualMapping ruft SaveMapping auf — bereits verknuepft |
| GET /settings/mappings Seite | Task 2 (Handler) + Task 3 (Route) + Task 4 (Template) |
| Tabelle: OCR-Text, Produkt/Paket, Typ, Verwendet | Task 4 |
| Clientseitige Suche/Filter | Task 4 |
| Inline Edit mit Produktsuche | Task 4 |
| Soft Delete (is_active=false) | Task 2 (DeleteMappingAPI) + Task 4 (JS) |
| Navbar-Link | Task 5 |
| Link aus Workflow zur Verwaltung | Task 1 (Step 4) |
