# M365 Contacts Bidirectional Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bidirektionale Synchronisierung zwischen RentalCore-Kunden und einem M365 Shared Mailbox-Kontaktordner via Microsoft Graph API — sofortiger Push bei Änderungen in RentalCore, Delta-Polling alle 5 Minuten für M365→RentalCore.

**Architecture:** Neues In-Process-Package `internal/sync/m365/` mit Graph-API-Client, Feldmapper und Sync-Service. Der CustomerHandler bekommt ein optionales `SyncService`-Feld; wenn nil (keine M365-Vars gesetzt), läuft RentalCore unverändert. Hintergrund-Goroutine für Delta-Poll. Konfliktauflösung via Last-Write-Wins auf `updated_at`-Timestamps. M365-Löschungen archivieren Kunden in RentalCore statt sie zu löschen.

**Tech Stack:** Go 1.24, `net/http` (keine neuen Dependencies), Microsoft Graph REST API v1.0, PostgreSQL via GORM + raw SQL (Runtime-Guard-Pattern wie in `pdf_handler.go`).

---

## File Map

| Datei | Status | Verantwortlichkeit |
|---|---|---|
| `internal/sync/m365/client.go` | Neu | OAuth2 Token-Fetch + Graph API CRUD + Delta-Query |
| `internal/sync/m365/mapper.go` | Neu | Customer ↔ M365Contact Feldmapping |
| `internal/sync/m365/sync.go` | Neu | SyncService: Delta-Poll-Loop + Push-Methoden |
| `internal/sync/m365/mapper_test.go` | Neu | Unit-Tests für Mapper und Konfliktlogik |
| `internal/config/config.go` | Ändern | M365Config Struct + Env-Loading |
| `internal/models/models.go` | Ändern | 5 neue Felder auf Customer-Struct |
| `internal/repository/customer_repository.go` | Ändern | GetByM365ID, Archive, SetM365ID; List filtert Archived |
| `internal/handlers/customer_handler.go` | Ändern | Optionales SyncService-Feld, Push-Hooks in Create/Update/Delete |
| `cmd/server/main.go` | Ändern | SyncService init + Start, Übergabe an CustomerHandler |
| `migrations/postgresql/000_combined_init.sql` | Ändern | Neue Customer-Spalten + sync_state-Tabelle |

---

## Task 1: Customer-Modell und DB-Schema erweitern

**Files:**
- Modify: `internal/models/models.go` (Customer-Struct, ~Zeile 10–29)
- Modify: `migrations/postgresql/000_combined_init.sql` (customers-Tabelle + sync_state)

- [ ] **Schritt 1: Fehler-Test schreiben**

Datei `internal/sync/m365/mapper_test.go` erstellen (Verzeichnis existiert noch nicht — `mkdir -p internal/sync/m365` ausführen):

```go
package m365_test

import (
	"testing"
	"time"

	"go-barcode-webapp/internal/models"
)

func TestCustomerHasM365Fields(t *testing.T) {
	c := models.Customer{}
	c.M365ID = strPtr("test-id")
	c.IsArchived = true

	now := time.Now()
	c.M365UpdatedAt = &now
	c.UpdatedAt = now

	if c.M365ID == nil || *c.M365ID != "test-id" {
		t.Error("M365ID field missing or wrong")
	}
	if !c.IsArchived {
		t.Error("IsArchived field missing")
	}
}

func strPtr(s string) *string { return &s }
```

- [ ] **Schritt 2: Test ausführen — erwartet FAIL**

```bash
cd /opt/dev/cores/rentalcore && go test ./internal/sync/m365/... 2>&1 | head -20
```

Erwartet: `undefined: models.Customer.M365ID` o.ä.

- [ ] **Schritt 3: Customer-Struct in `internal/models/models.go` erweitern**

Den bestehenden Customer-Struct (Zeile 10–28) wie folgt ergänzen — nach der `Notes`-Zeile und vor `Jobs`:

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
	// M365 sync fields
	M365ID        *string    `json:"m365_id,omitempty" gorm:"column:m365_id"`
	M365UpdatedAt *time.Time `json:"m365_updated_at,omitempty" gorm:"column:m365_updated_at"`
	IsArchived    bool       `json:"is_archived" gorm:"column:is_archived;default:false"`
	ArchivedAt    *time.Time `json:"archived_at,omitempty" gorm:"column:archived_at"`
	UpdatedAt     time.Time  `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`
	Jobs          []Job      `json:"jobs,omitempty" gorm:"-"`
}
```

Sicherstellen dass `"time"` in den Imports vorhanden ist (bereits der Fall durch andere Structs in models.go).

- [ ] **Schritt 4: `migrations/postgresql/000_combined_init.sql` anpassen**

In der `CREATE TABLE IF NOT EXISTS customers`-Definition (Zeile ~120) vor der schließenden Klammer einfügen:

```sql
    m365_id VARCHAR(255),
    m365_updated_at TIMESTAMP,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
```

Hinweis: Die Spalte `updated_at` ist schon im Schema, prüfe ob sie bereits existiert — wenn ja, nur die M365-Spalten hinzufügen.

Danach **nach** der customers-Tabellendefinition die sync_state-Tabelle einfügen:

```sql
-- Sync state for external integrations (e.g. M365 delta token)
CREATE TABLE IF NOT EXISTS sync_state (
    key        VARCHAR(100) PRIMARY KEY,
    value      TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Schritt 5: Test ausführen — erwartet PASS**

```bash
cd /opt/dev/cores/rentalcore && go test ./internal/sync/m365/... -run TestCustomerHasM365Fields -v
```

Erwartet: `PASS`

- [ ] **Schritt 6: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./... 2>&1
```

Erwartet: kein Output (keine Fehler)

- [ ] **Schritt 7: Commit**

```bash
cd /opt/dev/cores/rentalcore && git add internal/models/models.go migrations/postgresql/000_combined_init.sql internal/sync/m365/mapper_test.go && git commit -m "feat(m365): add sync fields to Customer model and schema"
```

---

## Task 2: M365Config in Konfiguration einbauen

**Files:**
- Modify: `internal/config/config.go`

- [ ] **Schritt 1: Test schreiben**

In `internal/sync/m365/mapper_test.go` ergänzen:

```go
import (
	"os"
	// ...existing imports...
	"go-barcode-webapp/internal/config"
)

func TestM365ConfigLoadsFromEnv(t *testing.T) {
	os.Setenv("M365_TENANT_ID", "tenant-123")
	os.Setenv("M365_CLIENT_ID", "client-456")
	os.Setenv("M365_CLIENT_SECRET", "secret-789")
	os.Setenv("M365_SHARED_MAILBOX_ID", "mailbox@test.de")
	os.Setenv("M365_SYNC_INTERVAL", "10m")
	defer func() {
		os.Unsetenv("M365_TENANT_ID")
		os.Unsetenv("M365_CLIENT_ID")
		os.Unsetenv("M365_CLIENT_SECRET")
		os.Unsetenv("M365_SHARED_MAILBOX_ID")
		os.Unsetenv("M365_SYNC_INTERVAL")
	}()

	cfg := config.M365Config{}
	cfg.LoadFromEnv()

	if cfg.TenantID != "tenant-123" {
		t.Errorf("TenantID: got %q, want %q", cfg.TenantID, "tenant-123")
	}
	if cfg.SyncInterval != "10m" {
		t.Errorf("SyncInterval: got %q, want %q", cfg.SyncInterval, "10m")
	}
	if !cfg.IsConfigured() {
		t.Error("IsConfigured() should return true when all fields set")
	}
}
```

- [ ] **Schritt 2: Test ausführen — erwartet FAIL**

```bash
cd /opt/dev/cores/rentalcore && go test ./internal/sync/m365/... -run TestM365ConfigLoadsFromEnv 2>&1 | head -10
```

- [ ] **Schritt 3: M365Config in `internal/config/config.go` hinzufügen**

In der `Config`-Struct (Zeile ~14) ein neues Feld ergänzen:

```go
type Config struct {
	Database DatabaseConfig `json:"database"`
	Server   ServerConfig   `json:"server"`
	UI       UIConfig       `json:"ui"`
	Email    EmailConfig    `json:"email"`
	Invoice  InvoiceConfig  `json:"invoice"`
	PDF      PDFConfig      `json:"pdf"`
	Security SecurityConfig `json:"security"`
	Logging  LoggingConfig  `json:"logging"`
	Backup   BackupConfig   `json:"backup"`
	Features FeaturesConfig `json:"features"`
	M365     M365Config     `json:"m365"`
}
```

Dann den neuen Struct und die `loadFromEnvironment`-Erweiterung hinzufügen — am Ende der config.go vor dem letzten `}`:

```go
type M365Config struct {
	TenantID    string `json:"tenant_id"`
	ClientID    string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	MailboxID   string `json:"mailbox_id"`
	SyncInterval string `json:"sync_interval"`
}

func (c *M365Config) LoadFromEnv() {
	if v := os.Getenv("M365_TENANT_ID"); v != "" {
		c.TenantID = v
	}
	if v := os.Getenv("M365_CLIENT_ID"); v != "" {
		c.ClientID = v
	}
	if v := os.Getenv("M365_CLIENT_SECRET"); v != "" {
		c.ClientSecret = v
	}
	if v := os.Getenv("M365_SHARED_MAILBOX_ID"); v != "" {
		c.MailboxID = v
	}
	if v := os.Getenv("M365_SYNC_INTERVAL"); v != "" {
		c.SyncInterval = v
	} else {
		c.SyncInterval = "5m"
	}
}

func (c *M365Config) IsConfigured() bool {
	return c.TenantID != "" && c.ClientID != "" && c.ClientSecret != "" && c.MailboxID != ""
}
```

In der bestehenden `loadFromEnvironment(config *Config)`-Funktion am Ende aufrufen:

```go
config.M365.LoadFromEnv()
```

- [ ] **Schritt 4: Test ausführen — erwartet PASS**

```bash
cd /opt/dev/cores/rentalcore && go test ./internal/sync/m365/... -run TestM365ConfigLoadsFromEnv -v
```

- [ ] **Schritt 5: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./... 2>&1
```

- [ ] **Schritt 6: Commit**

```bash
cd /opt/dev/cores/rentalcore && git add internal/config/config.go internal/sync/m365/mapper_test.go && git commit -m "feat(m365): add M365Config with env loading"
```

---

## Task 3: Graph API Client implementieren

**Files:**
- Create: `internal/sync/m365/client.go`

- [ ] **Schritt 1: Struct-Test schreiben**

In `internal/sync/m365/mapper_test.go` ergänzen:

```go
import (
	// ...existing...
	m365 "go-barcode-webapp/internal/sync/m365"
)

func TestNewGraphClientRequiresAllFields(t *testing.T) {
	client := m365.NewGraphClient("tid", "cid", "csec", "mbx")
	if client == nil {
		t.Fatal("NewGraphClient returned nil")
	}
}

func TestExtractDeltaToken(t *testing.T) {
	link := "https://graph.microsoft.com/v1.0/users/mb/contacts/delta?$deltaToken=TOKEN123"
	got := m365.ExtractDeltaToken(link)
	if got != "TOKEN123" {
		t.Errorf("got %q, want %q", got, "TOKEN123")
	}
}
```

- [ ] **Schritt 2: Test ausführen — erwartet FAIL**

```bash
cd /opt/dev/cores/rentalcore && go test ./internal/sync/m365/... -run "TestNewGraphClient|TestExtractDeltaToken" 2>&1 | head -10
```

- [ ] **Schritt 3: `internal/sync/m365/client.go` erstellen**

```go
package m365

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// GraphClient hält OAuth2-Token und führt Graph-API-Calls durch.
type GraphClient struct {
	tenantID     string
	clientID     string
	clientSecret string
	mailboxID    string

	mu          sync.Mutex
	token       string
	tokenExpiry time.Time

	httpClient *http.Client
}

func NewGraphClient(tenantID, clientID, clientSecret, mailboxID string) *GraphClient {
	return &GraphClient{
		tenantID:     tenantID,
		clientID:     clientID,
		clientSecret: clientSecret,
		mailboxID:    mailboxID,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

// M365Contact entspricht dem Microsoft Graph contact-Objekt.
type M365Contact struct {
	ID                   string       `json:"id,omitempty"`
	GivenName            string       `json:"givenName,omitempty"`
	Surname              string       `json:"surname,omitempty"`
	CompanyName          string       `json:"companyName,omitempty"`
	EmailAddresses       []EmailAddr  `json:"emailAddresses,omitempty"`
	BusinessPhones       []string     `json:"businessPhones,omitempty"`
	BusinessAddress      Address      `json:"businessAddress,omitempty"`
	PersonalNotes        string       `json:"personalNotes,omitempty"`
	LastModifiedDateTime string       `json:"lastModifiedDateTime,omitempty"`
	Removed              *RemovedInfo `json:"@removed,omitempty"`
}

type EmailAddr struct {
	Address string `json:"address"`
}

type Address struct {
	Street          string `json:"street,omitempty"`
	PostalCode      string `json:"postalCode,omitempty"`
	City            string `json:"city,omitempty"`
	CountryOrRegion string `json:"countryOrRegion,omitempty"`
}

// RemovedInfo erscheint in Delta-Responses für gelöschte Kontakte.
type RemovedInfo struct {
	Reason string `json:"reason"`
}

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

func (c *GraphClient) getToken() (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.token != "" && time.Now().Before(c.tokenExpiry) {
		return c.token, nil
	}

	data := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
		"scope":         {"https://graph.microsoft.com/.default"},
	}

	resp, err := c.httpClient.PostForm(
		fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", c.tenantID),
		data,
	)
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token endpoint returned HTTP %d", resp.StatusCode)
	}

	var tr tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return "", fmt.Errorf("token decode failed: %w", err)
	}

	c.token = tr.AccessToken
	c.tokenExpiry = time.Now().Add(time.Duration(tr.ExpiresIn-60) * time.Second)
	return c.token, nil
}

func (c *GraphClient) doRequest(method, reqURL string, body interface{}) (*http.Response, error) {
	token, err := c.getToken()
	if err != nil {
		return nil, err
	}

	var bodyBytes []byte
	if body != nil {
		bodyBytes, err = json.Marshal(body)
		if err != nil {
			return nil, err
		}
	}

	req, err := http.NewRequest(method, reqURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return c.httpClient.Do(req)
}

// CreateContact legt einen neuen Kontakt im Shared Mailbox an und gibt die M365-ID zurück.
func (c *GraphClient) CreateContact(contact M365Contact) (string, error) {
	reqURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s/contacts", c.mailboxID)
	resp, err := c.doRequest("POST", reqURL, contact)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("create contact: HTTP %d", resp.StatusCode)
	}

	var created M365Contact
	if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
		return "", err
	}
	return created.ID, nil
}

// UpdateContact aktualisiert einen bestehenden Kontakt (PATCH).
func (c *GraphClient) UpdateContact(contactID string, contact M365Contact) error {
	reqURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s/contacts/%s", c.mailboxID, contactID)
	resp, err := c.doRequest("PATCH", reqURL, contact)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("update contact: HTTP %d", resp.StatusCode)
	}
	return nil
}

// DeleteContact löscht einen Kontakt in M365.
func (c *GraphClient) DeleteContact(contactID string) error {
	reqURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s/contacts/%s", c.mailboxID, contactID)
	resp, err := c.doRequest("DELETE", reqURL, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("delete contact: HTTP %d", resp.StatusCode)
	}
	return nil
}

type deltaResponse struct {
	Value     []M365Contact `json:"value"`
	NextLink  string        `json:"@odata.nextLink"`
	DeltaLink string        `json:"@odata.deltaLink"`
}

// GetDelta holt Änderungen seit dem letzten Delta-Token.
// Leerer deltaToken = Erst-Sync (alle Kontakte).
// Gibt die gesammelten Kontakte und den neuen Delta-Token zurück.
func (c *GraphClient) GetDelta(deltaToken string) (contacts []M365Contact, newToken string, err error) {
	var reqURL string
	if deltaToken == "" {
		reqURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s/contacts/delta", c.mailboxID)
	} else {
		reqURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s/contacts/delta?$deltaToken=%s",
			c.mailboxID, deltaToken)
	}

	for reqURL != "" {
		resp, err := c.doRequest("GET", reqURL, nil)
		if err != nil {
			return nil, "", err
		}

		var dr deltaResponse
		decErr := json.NewDecoder(resp.Body).Decode(&dr)
		resp.Body.Close()
		if decErr != nil {
			return nil, "", decErr
		}

		contacts = append(contacts, dr.Value...)

		if dr.DeltaLink != "" {
			newToken = ExtractDeltaToken(dr.DeltaLink)
			reqURL = ""
		} else {
			reqURL = dr.NextLink
		}
	}

	return contacts, newToken, nil
}

// ExtractDeltaToken extrahiert den Token-Wert aus einem Delta-Link.
// Exportiert für Tests.
func ExtractDeltaToken(deltaLink string) string {
	const prefix = "$deltaToken="
	if idx := strings.Index(deltaLink, prefix); idx != -1 {
		return deltaLink[idx+len(prefix):]
	}
	return ""
}
```

- [ ] **Schritt 4: Tests ausführen — erwartet PASS**

```bash
cd /opt/dev/cores/rentalcore && go test ./internal/sync/m365/... -run "TestNewGraphClient|TestExtractDeltaToken" -v
```

- [ ] **Schritt 5: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./... 2>&1
```

- [ ] **Schritt 6: Commit**

```bash
cd /opt/dev/cores/rentalcore && git add internal/sync/m365/client.go internal/sync/m365/mapper_test.go && git commit -m "feat(m365): add Graph API client with OAuth2 token caching"
```

---

## Task 4: Feldmapper implementieren

**Files:**
- Create: `internal/sync/m365/mapper.go`
- Modify: `internal/sync/m365/mapper_test.go`

- [ ] **Schritt 1: Tests schreiben**

In `mapper_test.go` die folgenden Tests hinzufügen:

```go
func TestCustomerToContact(t *testing.T) {
	company := "Acme GmbH"
	first := "Max"
	last := "Mustermann"
	email := "max@acme.de"
	phone := "+49 123 456"
	street := "Hauptstraße"
	house := "42"
	zip := "70173"
	city := "Stuttgart"
	country := "Deutschland"
	notes := "VIP-Kunde"

	c := models.Customer{
		CompanyName: &company,
		FirstName:   &first,
		LastName:    &last,
		Email:       &email,
		PhoneNumber: &phone,
		Street:      &street,
		HouseNumber: &house,
		ZIP:         &zip,
		City:        &city,
		Country:     &country,
		Notes:       &notes,
	}

	contact := m365.CustomerToContact(&c)

	if contact.CompanyName != "Acme GmbH" {
		t.Errorf("CompanyName: got %q", contact.CompanyName)
	}
	if contact.GivenName != "Max" {
		t.Errorf("GivenName: got %q", contact.GivenName)
	}
	if len(contact.EmailAddresses) == 0 || contact.EmailAddresses[0].Address != "max@acme.de" {
		t.Error("EmailAddresses not mapped correctly")
	}
	if contact.BusinessAddress.Street != "Hauptstraße 42" {
		t.Errorf("Street+HouseNumber: got %q", contact.BusinessAddress.Street)
	}
	if contact.BusinessAddress.PostalCode != "70173" {
		t.Errorf("PostalCode: got %q", contact.BusinessAddress.PostalCode)
	}
	if contact.PersonalNotes != "VIP-Kunde" {
		t.Errorf("PersonalNotes: got %q", contact.PersonalNotes)
	}
}

func TestContactToCustomer(t *testing.T) {
	contact := m365.M365Contact{
		ID:          "abc-123",
		GivenName:   "Anna",
		Surname:     "Schmidt",
		CompanyName: "Schmidt AG",
		EmailAddresses: []m365.EmailAddr{{Address: "anna@schmidt.de"}},
		BusinessPhones: []string{"+49 711 999"},
		BusinessAddress: m365.Address{
			Street:          "Königstraße 10",
			PostalCode:      "70173",
			City:            "Stuttgart",
			CountryOrRegion: "Deutschland",
		},
		PersonalNotes:        "Notiz",
		LastModifiedDateTime: "2026-05-09T10:00:00Z",
	}

	c := m365.ContactToCustomer(contact)

	if c.FirstName == nil || *c.FirstName != "Anna" {
		t.Error("FirstName not mapped")
	}
	if c.Street == nil || *c.Street != "Königstraße" {
		t.Errorf("Street: got %v", c.Street)
	}
	if c.HouseNumber == nil || *c.HouseNumber != "10" {
		t.Errorf("HouseNumber: got %v", c.HouseNumber)
	}
	if c.M365UpdatedAt == nil {
		t.Error("M365UpdatedAt not set")
	}
}

func TestSplitStreetNumber(t *testing.T) {
	cases := []struct {
		input       string
		wantStreet  string
		wantNumber  string
	}{
		{"Hauptstraße 42", "Hauptstraße", "42"},
		{"Königstraße 10", "Königstraße", "10"},
		{"Am Marktplatz", "Am Marktplatz", ""},
		{"", "", ""},
	}
	for _, tc := range cases {
		street, num := m365.SplitStreetAndNumber(tc.input)
		if street != tc.wantStreet || num != tc.wantNumber {
			t.Errorf("SplitStreetAndNumber(%q): got (%q, %q), want (%q, %q)",
				tc.input, street, num, tc.wantStreet, tc.wantNumber)
		}
	}
}
```

- [ ] **Schritt 2: Tests ausführen — erwartet FAIL**

```bash
cd /opt/dev/cores/rentalcore && go test ./internal/sync/m365/... -run "TestCustomerToContact|TestContactToCustomer|TestSplitStreet" 2>&1 | head -15
```

- [ ] **Schritt 3: `internal/sync/m365/mapper.go` erstellen**

```go
package m365

import (
	"fmt"
	"strings"
	"time"

	"go-barcode-webapp/internal/models"
)

// CustomerToContact wandelt einen RentalCore-Kunden in einen M365-Kontakt um.
func CustomerToContact(c *models.Customer) M365Contact {
	contact := M365Contact{}

	if c.GivenName := c.FirstName; c.FirstName != nil {
		contact.GivenName = *c.FirstName
	}
	if c.LastName != nil {
		contact.Surname = *c.LastName
	}
	if c.CompanyName != nil {
		contact.CompanyName = *c.CompanyName
	}
	if c.Email != nil && *c.Email != "" {
		contact.EmailAddresses = []EmailAddr{{Address: *c.Email}}
	}
	if c.PhoneNumber != nil && *c.PhoneNumber != "" {
		contact.BusinessPhones = []string{*c.PhoneNumber}
	}
	if c.Notes != nil {
		contact.PersonalNotes = *c.Notes
	}

	street := ""
	if c.Street != nil {
		street = *c.Street
	}
	if c.HouseNumber != nil && *c.HouseNumber != "" {
		street = fmt.Sprintf("%s %s", street, *c.HouseNumber)
		street = strings.TrimSpace(street)
	}

	contact.BusinessAddress = Address{Street: street}
	if c.ZIP != nil {
		contact.BusinessAddress.PostalCode = *c.ZIP
	}
	if c.City != nil {
		contact.BusinessAddress.City = *c.City
	}
	if c.Country != nil {
		contact.BusinessAddress.CountryOrRegion = *c.Country
	}

	return contact
}

// ContactToCustomer wandelt einen M365-Kontakt in einen RentalCore-Kunden um.
func ContactToCustomer(contact M365Contact) models.Customer {
	c := models.Customer{}

	if contact.GivenName != "" {
		c.FirstName = strPtr(contact.GivenName)
	}
	if contact.Surname != "" {
		c.LastName = strPtr(contact.Surname)
	}
	if contact.CompanyName != "" {
		c.CompanyName = strPtr(contact.CompanyName)
	}
	if len(contact.EmailAddresses) > 0 && contact.EmailAddresses[0].Address != "" {
		c.Email = strPtr(contact.EmailAddresses[0].Address)
	}
	if len(contact.BusinessPhones) > 0 && contact.BusinessPhones[0] != "" {
		c.PhoneNumber = strPtr(contact.BusinessPhones[0])
	}
	if contact.PersonalNotes != "" {
		c.Notes = strPtr(contact.PersonalNotes)
	}

	street, houseNumber := SplitStreetAndNumber(contact.BusinessAddress.Street)
	if street != "" {
		c.Street = strPtr(street)
	}
	if houseNumber != "" {
		c.HouseNumber = strPtr(houseNumber)
	}
	if contact.BusinessAddress.PostalCode != "" {
		c.ZIP = strPtr(contact.BusinessAddress.PostalCode)
	}
	if contact.BusinessAddress.City != "" {
		c.City = strPtr(contact.BusinessAddress.City)
	}
	if contact.BusinessAddress.CountryOrRegion != "" {
		c.Country = strPtr(contact.BusinessAddress.CountryOrRegion)
	}

	if contact.LastModifiedDateTime != "" {
		if t, err := time.Parse(time.RFC3339, contact.LastModifiedDateTime); err == nil {
			c.M365UpdatedAt = &t
		}
	}

	return c
}

// SplitStreetAndNumber trennt "Hauptstraße 42" in ("Hauptstraße", "42").
// Exportiert für Tests.
func SplitStreetAndNumber(s string) (street, houseNumber string) {
	if s == "" {
		return "", ""
	}
	parts := strings.Fields(s)
	if len(parts) < 2 {
		return s, ""
	}
	last := parts[len(parts)-1]
	if len(last) > 0 && last[0] >= '0' && last[0] <= '9' {
		return strings.Join(parts[:len(parts)-1], " "), last
	}
	return s, ""
}

func strPtr(s string) *string { return &s }
```

Hinweis: Die `strPtr`-Hilfsfunktion in `mapper.go` kollidiert mit der in `mapper_test.go`. Aus `mapper_test.go` die lokale `strPtr`-Funktion entfernen — sie ist jetzt nicht mehr nötig (die Funktion ist in `mapper.go`, aber nicht exportiert; in den Tests nutzen wir stattdessen direkt `&`-Operator oder eine lokale Version).

Lösung: In `mapper_test.go` die `strPtr`-Testfunktion umbenennen in `testStrPtr` um Konflikt zu vermeiden:

```go
// in mapper_test.go
func testStrPtr(s string) *string { return &s }
```

Und `strPtr("test-id")` in `TestCustomerHasM365Fields` durch `testStrPtr("test-id")` ersetzen.

- [ ] **Schritt 4: Tests ausführen — erwartet PASS**

```bash
cd /opt/dev/cores/rentalcore && go test ./internal/sync/m365/... -v 2>&1 | tail -20
```

Erwartet: alle Tests PASS.

- [ ] **Schritt 5: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./... 2>&1
```

- [ ] **Schritt 6: Commit**

```bash
cd /opt/dev/cores/rentalcore && git add internal/sync/m365/mapper.go internal/sync/m365/mapper_test.go && git commit -m "feat(m365): add Customer<->M365Contact field mapper"
```

---

## Task 5: SyncService implementieren

**Files:**
- Create: `internal/sync/m365/sync.go`
- Modify: `internal/sync/m365/mapper_test.go`

- [ ] **Schritt 1: Konfliktauflösungs-Test schreiben**

In `mapper_test.go` ergänzen:

```go
func TestShouldApplyM365Change(t *testing.T) {
	now := time.Now().UTC()
	earlier := now.Add(-10 * time.Minute)
	later := now.Add(10 * time.Minute)

	// M365 ist neuer → anwenden
	if !m365.ShouldApplyM365Change(earlier, later) {
		t.Error("M365 newer: should apply")
	}
	// RentalCore ist neuer → nicht anwenden
	if m365.ShouldApplyM365Change(later, earlier) {
		t.Error("RentalCore newer: should not apply")
	}
	// Gleich → nicht anwenden (RentalCore gewinnt bei Gleichstand)
	if m365.ShouldApplyM365Change(now, now) {
		t.Error("Same time: should not apply")
	}
}
```

- [ ] **Schritt 2: Test ausführen — erwartet FAIL**

```bash
cd /opt/dev/cores/rentalcore && go test ./internal/sync/m365/... -run TestShouldApplyM365Change 2>&1 | head -10
```

- [ ] **Schritt 3: `internal/sync/m365/sync.go` erstellen**

```go
package m365

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"go-barcode-webapp/internal/models"
	"go-barcode-webapp/internal/repository"
)

// SyncService koordiniert den bidirektionalen Sync zwischen RentalCore und M365.
type SyncService struct {
	client       *GraphClient
	customerRepo *repository.CustomerRepository
	db           *sql.DB
	syncInterval time.Duration
}

// NewSyncService erstellt einen SyncService. db wird für sync_state-Zugriff benötigt.
func NewSyncService(client *GraphClient, customerRepo *repository.CustomerRepository, db *sql.DB, syncInterval time.Duration) *SyncService {
	return &SyncService{
		client:       client,
		customerRepo: customerRepo,
		db:           db,
		syncInterval: syncInterval,
	}
}

// Start startet den Delta-Poll-Loop als Goroutine. Blockiert nicht.
func (s *SyncService) Start(ctx context.Context) {
	if err := s.ensureSyncStateTable(); err != nil {
		log.Printf("M365 sync: could not ensure sync_state table: %v", err)
		return
	}
	go s.runDeltaLoop(ctx)
	log.Printf("M365 sync: started (interval: %s)", s.syncInterval)
}

func (s *SyncService) runDeltaLoop(ctx context.Context) {
	ticker := time.NewTicker(s.syncInterval)
	defer ticker.Stop()

	// Sofortiger erster Durchlauf
	s.runOnce()

	for {
		select {
		case <-ctx.Done():
			log.Println("M365 sync: stopping delta loop")
			return
		case <-ticker.C:
			s.runOnce()
		}
	}
}

func (s *SyncService) runOnce() {
	deltaToken, _ := s.loadDeltaToken()
	contacts, newToken, err := s.client.GetDelta(deltaToken)
	if err != nil {
		log.Printf("M365 sync: delta fetch failed: %v", err)
		return
	}

	for _, contact := range contacts {
		if contact.Removed != nil {
			s.handleM365Deletion(contact.ID)
		} else {
			s.handleM365Change(contact)
		}
	}

	if newToken != "" {
		if err := s.saveDeltaToken(newToken); err != nil {
			log.Printf("M365 sync: failed to save delta token: %v", err)
		}
	}
}

func (s *SyncService) handleM365Change(contact M365Contact) {
	existing, err := s.customerRepo.GetByM365ID(contact.ID)
	if err != nil {
		// Neuer Kontakt aus M365 → in RentalCore anlegen
		newCustomer := ContactToCustomer(contact)
		m365ID := contact.ID
		newCustomer.M365ID = &m365ID
		if createErr := s.customerRepo.Create(&newCustomer); createErr != nil {
			log.Printf("M365 sync: create customer failed for contact %s: %v", contact.ID, createErr)
		}
		return
	}

	// Conflict resolution: Last-Write-Wins
	var m365Time time.Time
	if contact.LastModifiedDateTime != "" {
		m365Time, _ = time.Parse(time.RFC3339, contact.LastModifiedDateTime)
	}

	if !ShouldApplyM365Change(existing.UpdatedAt, m365Time) {
		return // RentalCore ist neuer, ignorieren
	}

	updated := ContactToCustomer(contact)
	updated.CustomerID = existing.CustomerID
	updated.M365ID = &contact.ID
	updated.IsCustomer = existing.IsCustomer
	updated.IsSupplier = existing.IsSupplier
	updated.CustomerType = existing.CustomerType

	if err := s.customerRepo.Update(&updated); err != nil {
		log.Printf("M365 sync: update customer %d failed: %v", existing.CustomerID, err)
	}
}

func (s *SyncService) handleM365Deletion(contactID string) {
	existing, err := s.customerRepo.GetByM365ID(contactID)
	if err != nil {
		return // Nicht in RentalCore vorhanden — ignorieren
	}
	if err := s.customerRepo.Archive(existing.CustomerID); err != nil {
		log.Printf("M365 sync: archive customer %d failed: %v", existing.CustomerID, err)
	}
}

// PushCreate sendet einen neuen Kunden an M365 und speichert die erhaltene M365-ID.
func (s *SyncService) PushCreate(customer *models.Customer) error {
	contact := CustomerToContact(customer)
	m365ID, err := s.client.CreateContact(contact)
	if err != nil {
		return fmt.Errorf("PushCreate: %w", err)
	}
	return s.customerRepo.SetM365ID(customer.CustomerID, m365ID)
}

// PushUpdate aktualisiert einen bestehenden Kontakt in M365.
func (s *SyncService) PushUpdate(customer *models.Customer) error {
	if customer.M365ID == nil || *customer.M365ID == "" {
		// Noch nie gesynct → als neuen Kontakt anlegen
		return s.PushCreate(customer)
	}
	contact := CustomerToContact(customer)
	return s.client.UpdateContact(*customer.M365ID, contact)
}

// PushDelete löscht den Kontakt in M365.
func (s *SyncService) PushDelete(customer *models.Customer) {
	if customer.M365ID == nil || *customer.M365ID == "" {
		return
	}
	if err := s.client.DeleteContact(*customer.M365ID); err != nil {
		log.Printf("M365 sync: PushDelete for %s failed: %v", *customer.M365ID, err)
	}
}

// ShouldApplyM365Change gibt true zurück wenn m365Time neuer als rcTime ist.
// Exportiert für Tests.
func ShouldApplyM365Change(rcTime time.Time, m365Time time.Time) bool {
	return m365Time.After(rcTime)
}

func (s *SyncService) loadDeltaToken() (string, error) {
	var value string
	err := s.db.QueryRow(`SELECT value FROM sync_state WHERE key = 'm365_delta_token'`).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

func (s *SyncService) saveDeltaToken(token string) error {
	_, err := s.db.Exec(`
		INSERT INTO sync_state (key, value, updated_at)
		VALUES ('m365_delta_token', $1, NOW())
		ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
	`, token)
	return err
}

func (s *SyncService) ensureSyncStateTable() error {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(*) FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'sync_state'
	`).Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	_, err = s.db.Exec(`
		CREATE TABLE sync_state (
			key        VARCHAR(100) PRIMARY KEY,
			value      TEXT,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	return err
}
```

- [ ] **Schritt 4: Tests ausführen — erwartet PASS**

```bash
cd /opt/dev/cores/rentalcore && go test ./internal/sync/m365/... -v 2>&1 | tail -30
```

- [ ] **Schritt 5: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./... 2>&1
```

- [ ] **Schritt 6: Commit**

```bash
cd /opt/dev/cores/rentalcore && git add internal/sync/m365/sync.go internal/sync/m365/mapper_test.go && git commit -m "feat(m365): add SyncService with delta loop and push methods"
```

---

## Task 6: Customer Repository erweitern

**Files:**
- Modify: `internal/repository/customer_repository.go`

- [ ] **Schritt 1: Neue Methoden implementieren**

Am Ende von `customer_repository.go` hinzufügen:

```go
// GetByM365ID sucht einen Kunden anhand seiner M365-Kontakt-ID.
func (r *CustomerRepository) GetByM365ID(m365ID string) (*models.Customer, error) {
	var customer models.Customer
	err := r.db.Where("m365_id = ?", m365ID).First(&customer).Error
	if err != nil {
		return nil, err
	}
	return &customer, nil
}

// SetM365ID speichert die M365-Kontakt-ID für einen Kunden.
func (r *CustomerRepository) SetM365ID(customerID uint, m365ID string) error {
	return r.db.Model(&models.Customer{}).
		Where("customerid = ?", customerID).
		Update("m365_id", m365ID).Error
}

// Archive markiert einen Kunden als archiviert (nicht löschend).
func (r *CustomerRepository) Archive(customerID uint) error {
	now := time.Now()
	return r.db.Model(&models.Customer{}).
		Where("customerid = ?", customerID).
		Updates(map[string]interface{}{
			"is_archived": true,
			"archived_at": now,
			"m365_id":     nil,
		}).Error
}
```

Sicherstellen, dass `"time"` in den Imports von `customer_repository.go` vorhanden ist:

```go
import (
	"fmt"
	"time"

	"go-barcode-webapp/internal/models"
)
```

- [ ] **Schritt 2: `List`-Methode um Archivierungsfilter erweitern**

In der bestehenden `List`-Methode nach der `query := r.db.Model(&models.Customer{})` Zeile einfügen:

```go
// Archivierte Kunden standardmäßig ausblenden
query = query.Where("is_archived = false OR is_archived IS NULL")
```

Das gleiche in `ListByRole` hinzufügen.

- [ ] **Schritt 3: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./... 2>&1
```

- [ ] **Schritt 4: Alle Tests ausführen**

```bash
cd /opt/dev/cores/rentalcore && go test ./... 2>&1 | tail -10
```

- [ ] **Schritt 5: Commit**

```bash
cd /opt/dev/cores/rentalcore && git add internal/repository/customer_repository.go && git commit -m "feat(m365): add GetByM365ID, SetM365ID, Archive to CustomerRepository"
```

---

## Task 7: CustomerHandler mit SyncService verkabeln

**Files:**
- Modify: `internal/handlers/customer_handler.go`

- [ ] **Schritt 1: CustomerHandler-Struct und Konstruktor anpassen**

Die Struct-Definition und `NewCustomerHandler` ersetzen:

```go
type CustomerHandler struct {
	customerRepo *repository.CustomerRepository
	syncService  SyncServiceInterface
}

// SyncServiceInterface erlaubt nil-Check ohne Import-Zyklus.
type SyncServiceInterface interface {
	PushCreate(customer *models.Customer) error
	PushUpdate(customer *models.Customer) error
	PushDelete(customer *models.Customer)
}

func NewCustomerHandler(customerRepo *repository.CustomerRepository, syncService SyncServiceInterface) *CustomerHandler {
	return &CustomerHandler{
		customerRepo: customerRepo,
		syncService:  syncService,
	}
}
```

- [ ] **Schritt 2: Push-Hooks in CreateCustomer einfügen**

Nach dem erfolgreichen `h.customerRepo.Create(&customer)` in `CreateCustomer` (Form-Handler):

```go
if h.syncService != nil {
	if err := h.syncService.PushCreate(&customer); err != nil {
		log.Printf("M365 sync PushCreate failed: %v", err)
	}
}
```

Den gleichen Block nach `h.customerRepo.Create(&customer)` in `CreateCustomerAPI` einfügen.

Sicherstellen `"log"` in den Imports von `customer_handler.go` ist.

- [ ] **Schritt 3: Push-Hooks in UpdateCustomer einfügen**

Nach dem erfolgreichen `h.customerRepo.Update(&customer)` in `UpdateCustomer` (Form-Handler):

```go
if h.syncService != nil {
	// M365ID vom gespeicherten Record nachladen (Update-Struct hat sie nicht)
	if saved, err := h.customerRepo.GetByID(customer.CustomerID); err == nil {
		if err := h.syncService.PushUpdate(saved); err != nil {
			log.Printf("M365 sync PushUpdate failed: %v", err)
		}
	}
}
```

Den gleichen Block in `UpdateCustomerAPI` einfügen.

- [ ] **Schritt 4: Push-Hooks in DeleteCustomer einfügen**

In `DeleteCustomer` (Form-Handler) VOR dem `h.customerRepo.Delete`-Aufruf:

```go
var customerForSync *models.Customer
if h.syncService != nil {
	customerForSync, _ = h.customerRepo.GetByID(uint(id))
}
```

Nach dem erfolgreichen `h.customerRepo.Delete`:

```go
if h.syncService != nil && customerForSync != nil {
	h.syncService.PushDelete(customerForSync)
}
```

Den gleichen Block in `DeleteCustomerAPI` einfügen.

- [ ] **Schritt 5: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./... 2>&1
```

- [ ] **Schritt 6: Alle Tests**

```bash
cd /opt/dev/cores/rentalcore && go test ./... 2>&1 | tail -10
```

- [ ] **Schritt 7: Commit**

```bash
cd /opt/dev/cores/rentalcore && git add internal/handlers/customer_handler.go && git commit -m "feat(m365): hook M365 push calls into customer create/update/delete"
```

---

## Task 8: SyncService in main.go initialisieren

**Files:**
- Modify: `cmd/server/main.go`

- [ ] **Schritt 1: Import hinzufügen**

In den Imports von `main.go` ergänzen:

```go
m365sync "go-barcode-webapp/internal/sync/m365"
```

- [ ] **Schritt 2: SyncService nach dem CustomerRepo initialisieren**

Nach `customerRepo := repository.NewCustomerRepository(db)` (Zeile ~350) einfügen:

```go
// M365 Sync Service (optional — nur wenn Env-Vars gesetzt)
var m365SyncService handlers.SyncServiceInterface
if cfg.M365.IsConfigured() {
	interval, err := time.ParseDuration(cfg.M365.SyncInterval)
	if err != nil {
		interval = 5 * time.Minute
	}
	graphClient := m365sync.NewGraphClient(
		cfg.M365.TenantID,
		cfg.M365.ClientID,
		cfg.M365.ClientSecret,
		cfg.M365.MailboxID,
	)
	sqlDB, _ := db.DB.DB()
	m365SyncService = m365sync.NewSyncService(graphClient, customerRepo, sqlDB, interval)
	syncCtx, _ := context.WithCancel(context.Background())
	m365SyncService.(*m365sync.SyncService).Start(syncCtx)
	log.Println("M365 sync: service initialized")
} else {
	log.Println("M365 sync: not configured (M365_TENANT_ID etc. not set)")
}
```

Sicherstellen dass `"context"`, `"time"` und `"log"` in den Imports von `main.go` vorhanden sind (sind sie üblicherweise bereits).

- [ ] **Schritt 3: `NewCustomerHandler`-Aufruf anpassen**

Die Zeile (Zeile ~379):

```go
customerHandler := handlers.NewCustomerHandler(customerRepo)
```

ersetzen durch:

```go
customerHandler := handlers.NewCustomerHandler(customerRepo, m365SyncService)
```

- [ ] **Schritt 4: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./... 2>&1
```

Erwartet: kein Output.

- [ ] **Schritt 5: Alle Tests**

```bash
cd /opt/dev/cores/rentalcore && go test ./... 2>&1 | tail -10
```

- [ ] **Schritt 6: Commit**

```bash
cd /opt/dev/cores/rentalcore && git add cmd/server/main.go && git commit -m "feat(m365): initialize and start SyncService in main.go"
```

---

## Task 9: Runtime-Migration für neue Customer-Spalten

**Files:**
- Create: `internal/sync/m365/schema.go`

Der Produktions-Server hat die neuen Spalten noch nicht. Wir nutzen das Guard-Pattern aus `pdf_handler.go`.

- [ ] **Schritt 1: `internal/sync/m365/schema.go` erstellen**

```go
package m365

import (
	"database/sql"
	"log"
)

// EnsureCustomerM365Columns fügt die M365-Sync-Spalten zur customers-Tabelle hinzu
// wenn sie noch nicht existieren. Idempotent — safe bei jedem Start.
func EnsureCustomerM365Columns(db *sql.DB) error {
	columns := []struct {
		name       string
		definition string
	}{
		{"m365_id", "VARCHAR(255)"},
		{"m365_updated_at", "TIMESTAMP"},
		{"is_archived", "BOOLEAN NOT NULL DEFAULT FALSE"},
		{"archived_at", "TIMESTAMP"},
		{"updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"},
	}

	for _, col := range columns {
		if err := ensureColumn(db, "customers", col.name, col.definition); err != nil {
			return err
		}
	}

	log.Println("M365 sync: customer schema columns verified")
	return nil
}

func ensureColumn(db *sql.DB, table, column, definition string) error {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
	`, table, column).Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	_, err = db.Exec("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition)
	return err
}
```

- [ ] **Schritt 2: `EnsureCustomerM365Columns` in main.go aufrufen**

Direkt nach der DB-Initialisierung in `main.go` (nach `db := ...` und vor `customerRepo`):

```go
if sqlDB, err := db.DB.DB(); err == nil {
	if err := m365sync.EnsureCustomerM365Columns(sqlDB); err != nil {
		log.Printf("Warning: M365 column migration failed: %v", err)
	}
}
```

- [ ] **Schritt 3: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./... 2>&1
```

- [ ] **Schritt 4: Alle Tests**

```bash
cd /opt/dev/cores/rentalcore && go test ./... 2>&1 | tail -10
```

- [ ] **Schritt 5: Commit**

```bash
cd /opt/dev/cores/rentalcore && git add internal/sync/m365/schema.go cmd/server/main.go && git commit -m "feat(m365): add runtime column migration for customers table"
```

---

## Task 10: README aktualisieren, Docker bauen und pushen

- [ ] **Schritt 1: README.md mit neuer Version und Feature-Eintrag aktualisieren**

Aktuelle Version prüfen:
```bash
head -5 /opt/dev/cores/rentalcore/README.md
```

Version auf das nächste Patch-Level erhöhen (z.B. 5.3.43 → 5.3.44) und einen Eintrag hinzufügen:
```
### v5.3.44
- feat: Bidirektionaler M365-Kontakt-Sync (Shared Mailbox, Delta-Poll, Last-Write-Wins)
```

- [ ] **Schritt 2: Alles committen**

```bash
cd /opt/dev/cores/rentalcore && git add README.md && git commit -m "chore: bump version to 5.3.44, add M365 sync to changelog"
```

- [ ] **Schritt 3: Zu GitLab pushen**

```bash
cd /opt/dev/cores/rentalcore && git push origin main
```

- [ ] **Schritt 4: Docker-Image bauen**

VERSION auf die neue Versionsnummer setzen (z.B. 5.3.44):
```bash
cd /opt/dev/cores/rentalcore && docker build -t nobentie/rentalcore:5.3.44 .
```

- [ ] **Schritt 5: Docker-Image pushen**

```bash
docker push nobentie/rentalcore:5.3.44
docker tag nobentie/rentalcore:5.3.44 nobentie/rentalcore:latest
docker push nobentie/rentalcore:latest
```

---

## Azure App Registration (Manueller Schritt — einmalig)

Vor dem ersten Deploy müssen in Azure folgende Schritte manuell durchgeführt werden:

1. **Azure Portal → App Registrations → New Registration**
   - Name: `RentalCore Contacts Sync`
   - Supported account types: Single tenant

2. **API Permissions → Add Permission → Microsoft Graph → Application permissions**
   - `Contacts.ReadWrite` — Berechtigung für alle Mailboxen

3. **Grant admin consent** für die Permissions

4. **Certificates & Secrets → New client secret** → Wert notieren

5. **Shared Mailbox**: Im Exchange Admin Center eine Shared Mailbox anlegen (z.B. `rentalcore-contacts@firma.de`)

6. **Env-Vars** in der Komodo-Stack `.env` setzen:
   ```
   M365_TENANT_ID=<Directory/Tenant ID aus App Registration Overview>
   M365_CLIENT_ID=<Application/Client ID>
   M365_CLIENT_SECRET=<Secret Value>
   M365_SHARED_MAILBOX_ID=<Object ID des Shared Mailbox oder E-Mail-Adresse>
   M365_SYNC_INTERVAL=5m
   ```
