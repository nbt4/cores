# Job-Positionen Phase 1: DB-Schema + RentalCore Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue `job_positions` und `job_position_devices` Tabellen + vollständige REST-API für CRUD und Preisberechnung in RentalCore.

**Architecture:** Neue Migration-Datei fügt die Tabellen hinzu. Ein GORM-Model + Repository implementiert die Datenbanklogik. Ein neuer `PositionHandler` stellt die API bereit. Registrierung in main.go. Bestehender Code wird nicht geändert — die neuen Endpunkte leben parallel zu den alten.

**Tech Stack:** Go, GORM, Gin, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-05-05-job-positions-design.md`

---

## File Map

| Datei | Aktion | Zweck |
|-------|--------|-------|
| `rentalcore/migrations/038_job_positions.up.sql` | Create | Migration: Tabellen + Indizes |
| `rentalcore/internal/models/job_position.go` | Create | GORM Models |
| `rentalcore/internal/repository/position_repository.go` | Create | DB-Operationen |
| `rentalcore/internal/handlers/position_handler.go` | Create | HTTP-Handler |
| `rentalcore/cmd/server/main.go` | Modify | Handler-Init + Route-Registration |
| `migrations/postgresql/000_combined_init.sql` | Modify | Schema für Fresh-Install |

---

### Task 1: Migration-Datei erstellen

**Files:**
- Create: `rentalcore/migrations/038_job_positions.up.sql`

- [ ] **Step 1: Migration-Datei schreiben**

```sql
-- 038_job_positions.up.sql
-- Job positions: Angebots-artige Positionen pro Job (Produkte + Dienstleistungen)

CREATE TABLE IF NOT EXISTS job_positions (
    position_id     BIGSERIAL PRIMARY KEY,
    job_id          BIGINT NOT NULL REFERENCES jobs(jobid) ON DELETE CASCADE,
    position_type   VARCHAR(20) NOT NULL DEFAULT 'product' CHECK (position_type IN ('product', 'service')),
    product_id      INT REFERENCES products(productid) ON DELETE SET NULL,
    service_item_id BIGINT REFERENCES service_items(id) ON DELETE SET NULL,
    description     TEXT NOT NULL DEFAULT '',
    quantity        DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit            VARCHAR(50) NOT NULL DEFAULT 'Stück',
    unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
    follow_day_factor DECIMAL(4,2) NOT NULL DEFAULT 0.50,
    discount_percent  DECIMAL(5,2) NOT NULL DEFAULT 0,
    discount_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_positions_job_id ON job_positions(job_id);
CREATE INDEX idx_job_positions_product_id ON job_positions(product_id);
CREATE INDEX idx_job_positions_service_item_id ON job_positions(service_item_id);

CREATE TABLE IF NOT EXISTS job_position_devices (
    id          BIGSERIAL PRIMARY KEY,
    position_id BIGINT NOT NULL REFERENCES job_positions(position_id) ON DELETE CASCADE,
    device_id   VARCHAR(50) NOT NULL,
    scanned_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scanned_by  VARCHAR(100) DEFAULT ''
);

CREATE INDEX idx_jpd_position ON job_position_devices(position_id);
CREATE INDEX idx_jpd_device ON job_position_devices(device_id);
CREATE UNIQUE INDEX idx_jpd_unique ON job_position_devices(position_id, device_id);
```

- [ ] **Step 2: Commit**

```bash
cd /opt/dev/cores/rentalcore
git add migrations/038_job_positions.up.sql
git commit -m "feat(db): add job_positions and job_position_devices tables"
```

---

### Task 2: GORM Models

**Files:**
- Create: `rentalcore/internal/models/job_position.go`

- [ ] **Step 1: Model-Datei schreiben**

```go
package models

import "time"

type JobPosition struct {
	PositionID     uint      `gorm:"primaryKey;column:position_id" json:"position_id"`
	JobID          uint      `gorm:"column:job_id;not null;index" json:"job_id"`
	PositionType   string    `gorm:"column:position_type;not null;default:product" json:"position_type"`
	ProductID      *uint     `gorm:"column:product_id" json:"product_id"`
	ServiceItemID  *uint     `gorm:"column:service_item_id" json:"service_item_id"`
	Description    string    `gorm:"column:description;not null;default:''" json:"description"`
	Quantity       float64   `gorm:"column:quantity;not null;default:1" json:"quantity"`
	Unit           string    `gorm:"column:unit;not null;default:Stück" json:"unit"`
	UnitPrice      float64   `gorm:"column:unit_price;not null;default:0" json:"unit_price"`
	FollowDayFactor float64  `gorm:"column:follow_day_factor;not null;default:0.50" json:"follow_day_factor"`
	DiscountPercent float64  `gorm:"column:discount_percent;not null;default:0" json:"discount_percent"`
	DiscountAmount  float64  `gorm:"column:discount_amount;not null;default:0" json:"discount_amount"`
	SortOrder      int       `gorm:"column:sort_order;not null;default:0" json:"sort_order"`
	CreatedAt      time.Time `gorm:"column:created_at;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relations
	Product        *Product            `gorm:"foreignKey:ProductID;references:ProductID" json:"product,omitempty"`
	ServiceItem    *ServiceItem        `gorm:"foreignKey:ServiceItemID;references:ID" json:"service_item,omitempty"`
	Devices        []JobPositionDevice `gorm:"foreignKey:PositionID;references:PositionID" json:"devices,omitempty"`
}

func (JobPosition) TableName() string { return "job_positions" }

type JobPositionDevice struct {
	ID         uint      `gorm:"primaryKey;column:id" json:"id"`
	PositionID uint      `gorm:"column:position_id;not null;index" json:"position_id"`
	DeviceID   string    `gorm:"column:device_id;not null" json:"device_id"`
	ScannedAt  time.Time `gorm:"column:scanned_at;default:CURRENT_TIMESTAMP" json:"scanned_at"`
	ScannedBy  string    `gorm:"column:scanned_by;default:''" json:"scanned_by"`
}

func (JobPositionDevice) TableName() string { return "job_position_devices" }

type ServiceItem struct {
	ID           uint      `gorm:"primaryKey;column:id" json:"id"`
	Name         string    `gorm:"column:name;not null" json:"name"`
	Description  string    `gorm:"column:description" json:"description"`
	DefaultPrice float64   `gorm:"column:default_price;default:0" json:"default_price"`
	Category     string    `gorm:"column:category" json:"category"`
	Unit         string    `gorm:"column:unit;default:pauschal" json:"unit"`
	IsActive     bool      `gorm:"column:is_active;default:true" json:"is_active"`
	CreatedAt    time.Time `gorm:"column:created_at;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

func (ServiceItem) TableName() string { return "service_items" }
```

- [ ] **Step 2: Build prüfen**

Run: `cd /opt/dev/cores/rentalcore && go build ./...`
Expected: Erfolgreich

- [ ] **Step 3: Commit**

```bash
git add internal/models/job_position.go
git commit -m "feat(models): add JobPosition, JobPositionDevice, ServiceItem models"
```

---

### Task 3: Position Repository

**Files:**
- Create: `rentalcore/internal/repository/position_repository.go`

- [ ] **Step 1: Repository schreiben**

```go
package repository

import (
	"go-barcode-webapp/internal/models"

	"gorm.io/gorm"
)

type PositionRepository struct {
	db *Database
}

func NewPositionRepository(db *Database) *PositionRepository {
	return &PositionRepository{db: db}
}

func (r *PositionRepository) GetByJobID(jobID uint) ([]models.JobPosition, error) {
	var positions []models.JobPosition
	err := r.db.Where("job_id = ?", jobID).
		Preload("Product").
		Preload("ServiceItem").
		Preload("Devices").
		Order("sort_order ASC, position_id ASC").
		Find(&positions).Error
	return positions, err
}

func (r *PositionRepository) GetByID(positionID uint) (*models.JobPosition, error) {
	var pos models.JobPosition
	err := r.db.Where("position_id = ?", positionID).
		Preload("Product").
		Preload("ServiceItem").
		Preload("Devices").
		First(&pos).Error
	if err != nil {
		return nil, err
	}
	return &pos, nil
}

func (r *PositionRepository) Create(pos *models.JobPosition) error {
	return r.db.Create(pos).Error
}

func (r *PositionRepository) Update(pos *models.JobPosition) error {
	return r.db.Save(pos).Error
}

func (r *PositionRepository) Delete(positionID uint) error {
	return r.db.Where("position_id = ?", positionID).Delete(&models.JobPosition{}).Error
}

func (r *PositionRepository) Reorder(jobID uint, positionIDs []uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for i, id := range positionIDs {
			if err := tx.Model(&models.JobPosition{}).
				Where("position_id = ? AND job_id = ?", id, jobID).
				Update("sort_order", i).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *PositionRepository) AssignDevice(positionID uint, deviceID string, scannedBy string) error {
	dev := models.JobPositionDevice{
		PositionID: positionID,
		DeviceID:   deviceID,
		ScannedBy:  scannedBy,
	}
	return r.db.Where("position_id = ? AND device_id = ?", positionID, deviceID).
		FirstOrCreate(&dev).Error
}

func (r *PositionRepository) RemoveDevice(positionID uint, deviceID string) error {
	return r.db.Where("position_id = ? AND device_id = ?", positionID, deviceID).
		Delete(&models.JobPositionDevice{}).Error
}

func (r *PositionRepository) GetPicklist(jobID uint) ([]models.JobPosition, error) {
	var positions []models.JobPosition
	err := r.db.Where("job_id = ? AND position_type = ?", jobID, "product").
		Preload("Product").
		Preload("Devices").
		Order("sort_order ASC, position_id ASC").
		Find(&positions).Error
	return positions, err
}

func (r *PositionRepository) GetNextSortOrder(jobID uint) (int, error) {
	var maxOrder *int
	err := r.db.Model(&models.JobPosition{}).
		Where("job_id = ?", jobID).
		Select("MAX(sort_order)").
		Scan(&maxOrder).Error
	if err != nil {
		return 0, err
	}
	if maxOrder == nil {
		return 0, nil
	}
	return *maxOrder + 1, nil
}
```

- [ ] **Step 2: Build prüfen**

Run: `cd /opt/dev/cores/rentalcore && go build ./...`
Expected: Erfolgreich

- [ ] **Step 3: Commit**

```bash
git add internal/repository/position_repository.go
git commit -m "feat(repo): add PositionRepository with CRUD, device assignment, picklist"
```

---

### Task 4: Position Handler

**Files:**
- Create: `rentalcore/internal/handlers/position_handler.go`

- [ ] **Step 1: Handler schreiben**

```go
package handlers

import (
	"math"
	"net/http"
	"strconv"
	"time"

	"go-barcode-webapp/internal/models"
	"go-barcode-webapp/internal/repository"

	"github.com/gin-gonic/gin"
)

type PositionHandler struct {
	positionRepo *repository.PositionRepository
	jobRepo      *repository.JobRepository
}

func NewPositionHandler(positionRepo *repository.PositionRepository, jobRepo *repository.JobRepository) *PositionHandler {
	return &PositionHandler{
		positionRepo: positionRepo,
		jobRepo:      jobRepo,
	}
}

func (h *PositionHandler) GetPositions(c *gin.Context) {
	jobID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job ID"})
		return
	}

	positions, err := h.positionRepo.GetByJobID(uint(jobID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"positions": positions})
}

type CreatePositionInput struct {
	PositionType    string  `json:"position_type" binding:"required,oneof=product service"`
	ProductID       *uint   `json:"product_id"`
	ServiceItemID   *uint   `json:"service_item_id"`
	Description     string  `json:"description"`
	Quantity        float64 `json:"quantity"`
	Unit            string  `json:"unit"`
	UnitPrice       float64 `json:"unit_price"`
	FollowDayFactor *float64 `json:"follow_day_factor"`
	DiscountPercent float64 `json:"discount_percent"`
	DiscountAmount  float64 `json:"discount_amount"`
}

func (h *PositionHandler) CreatePosition(c *gin.Context) {
	jobID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job ID"})
		return
	}

	var input CreatePositionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Quantity <= 0 {
		input.Quantity = 1
	}
	if input.Unit == "" {
		input.Unit = "Stück"
	}

	followDayFactor := 0.5
	if input.FollowDayFactor != nil {
		followDayFactor = *input.FollowDayFactor
	}
	if input.PositionType == "service" {
		followDayFactor = 0
	}

	nextOrder, _ := h.positionRepo.GetNextSortOrder(uint(jobID))

	pos := models.JobPosition{
		JobID:           uint(jobID),
		PositionType:    input.PositionType,
		ProductID:       input.ProductID,
		ServiceItemID:   input.ServiceItemID,
		Description:     input.Description,
		Quantity:        input.Quantity,
		Unit:            input.Unit,
		UnitPrice:       input.UnitPrice,
		FollowDayFactor: followDayFactor,
		DiscountPercent: input.DiscountPercent,
		DiscountAmount:  input.DiscountAmount,
		SortOrder:       nextOrder,
	}

	if err := h.positionRepo.Create(&pos); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	created, _ := h.positionRepo.GetByID(pos.PositionID)
	c.JSON(http.StatusCreated, gin.H{"position": created})
}

type UpdatePositionInput struct {
	Description     *string  `json:"description"`
	Quantity        *float64 `json:"quantity"`
	Unit            *string  `json:"unit"`
	UnitPrice       *float64 `json:"unit_price"`
	FollowDayFactor *float64 `json:"follow_day_factor"`
	DiscountPercent *float64 `json:"discount_percent"`
	DiscountAmount  *float64 `json:"discount_amount"`
}

func (h *PositionHandler) UpdatePosition(c *gin.Context) {
	posID, err := strconv.ParseUint(c.Param("posId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid position ID"})
		return
	}

	pos, err := h.positionRepo.GetByID(uint(posID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
		return
	}

	var input UpdatePositionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Description != nil {
		pos.Description = *input.Description
	}
	if input.Quantity != nil {
		pos.Quantity = *input.Quantity
	}
	if input.Unit != nil {
		pos.Unit = *input.Unit
	}
	if input.UnitPrice != nil {
		pos.UnitPrice = *input.UnitPrice
	}
	if input.FollowDayFactor != nil {
		pos.FollowDayFactor = *input.FollowDayFactor
	}
	if input.DiscountPercent != nil {
		pos.DiscountPercent = *input.DiscountPercent
	}
	if input.DiscountAmount != nil {
		pos.DiscountAmount = *input.DiscountAmount
	}
	pos.UpdatedAt = time.Now()

	if err := h.positionRepo.Update(pos); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	updated, _ := h.positionRepo.GetByID(pos.PositionID)
	c.JSON(http.StatusOK, gin.H{"position": updated})
}

func (h *PositionHandler) DeletePosition(c *gin.Context) {
	posID, err := strconv.ParseUint(c.Param("posId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid position ID"})
		return
	}

	if err := h.positionRepo.Delete(uint(posID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "position deleted"})
}

type ReorderInput struct {
	PositionIDs []uint `json:"position_ids" binding:"required"`
}

func (h *PositionHandler) ReorderPositions(c *gin.Context) {
	jobID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job ID"})
		return
	}

	var input ReorderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.positionRepo.Reorder(uint(jobID), input.PositionIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "reordered"})
}

type AssignDeviceInput struct {
	DeviceID  string `json:"device_id" binding:"required"`
	ScannedBy string `json:"scanned_by"`
}

func (h *PositionHandler) AssignDevice(c *gin.Context) {
	posID, err := strconv.ParseUint(c.Param("posId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid position ID"})
		return
	}

	var input AssignDeviceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.positionRepo.AssignDevice(uint(posID), input.DeviceID, input.ScannedBy); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "device assigned"})
}

func (h *PositionHandler) RemoveDevice(c *gin.Context) {
	posID, err := strconv.ParseUint(c.Param("posId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid position ID"})
		return
	}
	deviceID := c.Param("devId")

	if err := h.positionRepo.RemoveDevice(uint(posID), deviceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "device removed"})
}

func (h *PositionHandler) GetPicklist(c *gin.Context) {
	jobID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job ID"})
		return
	}

	positions, err := h.positionRepo.GetPicklist(uint(jobID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type PicklistItem struct {
		PositionID  uint   `json:"position_id"`
		ProductID   *uint  `json:"product_id"`
		ProductName string `json:"product_name"`
		Needed      int    `json:"needed"`
		Scanned     int    `json:"scanned"`
		Remaining   int    `json:"remaining"`
		DeviceIDs   []string `json:"device_ids"`
	}

	items := make([]PicklistItem, 0, len(positions))
	for _, p := range positions {
		productName := ""
		if p.Product != nil {
			productName = p.Product.Name
		}
		needed := int(p.Quantity)
		scanned := len(p.Devices)
		deviceIDs := make([]string, 0, len(p.Devices))
		for _, d := range p.Devices {
			deviceIDs = append(deviceIDs, d.DeviceID)
		}
		items = append(items, PicklistItem{
			PositionID:  p.PositionID,
			ProductID:   p.ProductID,
			ProductName: productName,
			Needed:      needed,
			Scanned:     scanned,
			Remaining:   max(0, needed-scanned),
			DeviceIDs:   deviceIDs,
		})
	}

	c.JSON(http.StatusOK, gin.H{"picklist": items})
}

func (h *PositionHandler) GetTotals(c *gin.Context) {
	jobID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job ID"})
		return
	}

	positions, err := h.positionRepo.GetByJobID(uint(jobID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	job, err := h.jobRepo.GetByID(uint(jobID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}

	eventDays := calcEventDays(job.StartDate, job.EndDate)

	subtotal := 0.0
	for _, p := range positions {
		dayFactor := 1.0
		if eventDays > 1 && p.FollowDayFactor > 0 {
			dayFactor = 1 + float64(eventDays-1)*p.FollowDayFactor
		}
		lineTotal := p.Quantity * p.UnitPrice * dayFactor
		discount := p.DiscountAmount + (lineTotal * p.DiscountPercent / 100)
		subtotal += lineTotal - discount
	}

	globalDiscount := 0.0
	if job.Discount > 0 {
		if job.DiscountType == "percent" {
			globalDiscount = subtotal * job.Discount / 100
		} else {
			globalDiscount = job.Discount
		}
	}

	netto := subtotal - globalDiscount
	taxRate := 19.0
	tax := netto * taxRate / 100
	brutto := netto + tax

	c.JSON(http.StatusOK, gin.H{
		"event_days":      eventDays,
		"subtotal":        math.Round(subtotal*100) / 100,
		"global_discount": math.Round(globalDiscount*100) / 100,
		"netto":           math.Round(netto*100) / 100,
		"tax_rate":        taxRate,
		"tax":             math.Round(tax*100) / 100,
		"brutto":          math.Round(brutto*100) / 100,
	})
}

func calcEventDays(start, end *time.Time) int {
	if start == nil || end == nil {
		return 1
	}
	days := int(end.Sub(*start).Hours()/24)
	if days < 1 {
		return 1
	}
	return days
}
```

- [ ] **Step 2: Build prüfen**

Run: `cd /opt/dev/cores/rentalcore && go build ./...`

Wenn `job.StartDate` / `job.EndDate` andere Typen haben (z.B. `string` statt `*time.Time`), den `calcEventDays`-Aufruf entsprechend anpassen. Prüfe den Job-Model-Typ:

```bash
grep -n "StartDate\|EndDate\|Discount\|DiscountType" /opt/dev/cores/rentalcore/internal/models/models.go | head -10
```

Passe die Typen an falls nötig.

- [ ] **Step 3: Commit**

```bash
git add internal/handlers/position_handler.go
git commit -m "feat(api): add PositionHandler with CRUD, device assignment, picklist, totals"
```

---

### Task 5: Handler-Registrierung in main.go

**Files:**
- Modify: `rentalcore/cmd/server/main.go`

- [ ] **Step 1: Repository + Handler instantiieren**

Nach Zeile 376 (wo `jobHandler` erstellt wird), einfügen:

```go
positionRepo := repository.NewPositionRepository(db)
positionHandler := handlers.NewPositionHandler(positionRepo, jobRepo)
```

- [ ] **Step 2: Handler zu setupRoutes hinzufügen**

Die `setupRoutes`-Funktion (Zeile 778) bekommt einen neuen Parameter:

```go
func setupRoutes(r *gin.Engine,
    cfg *config.Config,
    jobHandler *handlers.JobHandler,
    ...
    positionHandler *handlers.PositionHandler,
) {
```

Den Aufruf von `setupRoutes` (Zeile 723) um `positionHandler` erweitern.

- [ ] **Step 3: API-Routen registrieren**

Nach dem `apiJobs`-Block (nach Zeile 1306), einfügen:

```go
			// Job Position routes
			apiPositions := api.Group("/jobs/:id/positions")
			{
				apiPositions.GET("", positionHandler.GetPositions)
				apiPositions.POST("", positionHandler.CreatePosition)
				apiPositions.PUT("/:posId", positionHandler.UpdatePosition)
				apiPositions.DELETE("/:posId", positionHandler.DeletePosition)
				apiPositions.PATCH("/reorder", positionHandler.ReorderPositions)
				apiPositions.POST("/:posId/devices", positionHandler.AssignDevice)
				apiPositions.DELETE("/:posId/devices/:devId", positionHandler.RemoveDevice)
			}

			// Job totals and picklist
			apiJobs.GET("/:id/totals", positionHandler.GetTotals)
			apiJobs.GET("/:id/picklist", positionHandler.GetPicklist)
```

- [ ] **Step 4: Build prüfen**

Run: `cd /opt/dev/cores/rentalcore && go build ./...`
Expected: Erfolgreich

- [ ] **Step 5: Commit**

```bash
git add cmd/server/main.go
git commit -m "feat(routes): register position API endpoints"
```

---

### Task 6: Combined-Init Schema aktualisieren

**Files:**
- Modify: `migrations/postgresql/000_combined_init.sql`

- [ ] **Step 1: job_positions und job_position_devices Tabellen einfügen**

Am Ende der Datei (vor dem letzten Kommentar-Block, oder nach den letzten CREATE TABLE Statements), den gleichen SQL-Inhalt wie in Task 1 einfügen:

```sql
-- =============================================================================
-- JOB POSITIONS (Angebots-artige Positionen)
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_positions (
    position_id     BIGSERIAL PRIMARY KEY,
    job_id          BIGINT NOT NULL REFERENCES jobs(jobid) ON DELETE CASCADE,
    position_type   VARCHAR(20) NOT NULL DEFAULT 'product' CHECK (position_type IN ('product', 'service')),
    product_id      INT REFERENCES products(productid) ON DELETE SET NULL,
    service_item_id BIGINT REFERENCES service_items(id) ON DELETE SET NULL,
    description     TEXT NOT NULL DEFAULT '',
    quantity        DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit            VARCHAR(50) NOT NULL DEFAULT 'Stück',
    unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
    follow_day_factor DECIMAL(4,2) NOT NULL DEFAULT 0.50,
    discount_percent  DECIMAL(5,2) NOT NULL DEFAULT 0,
    discount_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_positions_job_id ON job_positions(job_id);
CREATE INDEX idx_job_positions_product_id ON job_positions(product_id);
CREATE INDEX idx_job_positions_service_item_id ON job_positions(service_item_id);

CREATE TABLE IF NOT EXISTS job_position_devices (
    id          BIGSERIAL PRIMARY KEY,
    position_id BIGINT NOT NULL REFERENCES job_positions(position_id) ON DELETE CASCADE,
    device_id   VARCHAR(50) NOT NULL,
    scanned_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scanned_by  VARCHAR(100) DEFAULT ''
);

CREATE INDEX idx_jpd_position ON job_position_devices(position_id);
CREATE INDEX idx_jpd_device ON job_position_devices(device_id);
CREATE UNIQUE INDEX idx_jpd_unique ON job_position_devices(position_id, device_id);
```

- [ ] **Step 2: Commit**

```bash
git add migrations/postgresql/000_combined_init.sql
git commit -m "feat(schema): add job_positions tables to combined init"
```

---

### Task 7: Migration auf Live-DB ausführen

- [ ] **Step 1: Migration auf docker03 ausführen**

```bash
ssh noah@docker03 "docker exec -i postgres psql -U rentalcore -d rentalcore" < /opt/dev/cores/rentalcore/migrations/038_job_positions.up.sql
```

- [ ] **Step 2: Verifizieren**

```bash
ssh noah@docker03 "docker exec postgres psql -U rentalcore -d rentalcore -c '\d job_positions'"
ssh noah@docker03 "docker exec postgres psql -U rentalcore -d rentalcore -c '\d job_position_devices'"
```

Expected: Beide Tabellen mit allen Spalten und Indizes vorhanden.

---

### Task 8: Build & Deploy

- [ ] **Step 1: README-Version bumpen**

Version in README.md von aktueller auf nächste Version erhöhen. Aktuelle Version prüfen:
```bash
head -10 /opt/dev/cores/rentalcore/README.md | grep -i version
```

- [ ] **Step 2: Version-Commit**

```bash
git add README.md
git commit -m "docs: bump version to v5.3.X"
```

- [ ] **Step 3: Push zu GitLab**

```bash
cd /opt/dev/cores/rentalcore
git push origin main
```

- [ ] **Step 4: Docker Image builden und pushen**

```bash
docker build -t nobentie/rentalcore:5.3.X .
docker push nobentie/rentalcore:5.3.X
docker tag nobentie/rentalcore:5.3.X nobentie/rentalcore:latest
docker push nobentie/rentalcore:latest
```

(Version `5.3.X` durch die tatsächliche neue Version ersetzen)
