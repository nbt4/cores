# Cores Dashboard Erweiterungen: Security, Status, Branding, M365

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vier Features für das Cores-Dashboard: (1) Passkeys/2FA-Endpoints in RentalCore registrieren, (2) System-Status-Seite, (3) Firmen-Branding-Tab, (4) M365-Konfigurations-Tab.

**Architecture:** RentalCore-Backend bekommt neue API-Routen unter `/api/v1/` damit der Cores-Proxy sie erreicht. Cores-Dashboard bekommt neue Frontend-Seiten/-Tabs die über den bestehenden Proxy auf RentalCore/WarehouseCore zugreifen. Kein neues Auth-System — Cookie-basierter Proxy wie bisher.

**Tech Stack:** Go/Gin (RentalCore Backend), React/TypeScript/Tailwind (Cores Frontend), bestehende Proxy-Infrastruktur in cores-dashboard

---

## Datei-Übersicht

### RentalCore (`/opt/dev/cores/rentalcore/`)
- Modify: `cmd/server/main.go` — Neue Routen unter `api.Group("/profile")` + neue M365-Settings-Route
- Create: `internal/handlers/m365_settings_handler.go` — GET/PUT für M365-DB-Konfiguration
- Create: `internal/models/m365_settings.go` — M365Settings-Modell + TableName

### Cores Dashboard (`/opt/dev/cores/cores-dashboard/`)
- Modify: `cmd/server/main.go` — Status-Route registrieren
- Create: `internal/handlers/status_handler.go` — Pollt Health-Endpoints beider Services
- Modify: `web/src/App.tsx` — Route `/status` hinzufügen
- Modify: `web/src/components/Layout.tsx` — Nav-Items für Status + Branding + M365
- Modify: `web/src/pages/AdminPage.tsx` — Neue Tabs: branding, m365
- Create: `web/src/pages/StatusPage.tsx` — System-Status-Übersicht
- Create: `web/src/components/admin/BrandingTab.tsx` — Firmen-Branding-Formular
- Create: `web/src/components/admin/M365SettingsTab.tsx` — M365-Konfigurationsformular

---

## Task 1: Passkeys + 2FA Routen unter `/api/v1/profile/` in RentalCore

**Problem:** Der Cores-Proxy leitet `/api/v1/proxy/rental/api/v1/profile/...` an RentalCore weiter → RentalCore empfängt `/api/v1/profile/...`. Die Handler existieren, sind aber nur unter `/profile/...` (ohne `/api/v1`) registriert.

**Files:**
- Modify: `rentalcore/cmd/server/main.go` (Bereich ab Zeile ~1333, `api := protected.Group("/api/v1")`)

- [ ] **Schritt 1: Routen im api-Group registrieren**

In `rentalcore/cmd/server/main.go`, nach dem bestehenden `api := protected.Group("/api/v1")` Block (ca. Zeile 1333), innerhalb dieses Blocks folgendes hinzufügen (vor oder nach den bestehenden API-Routen):

```go
// Profile security routes (also exposed under /api/v1 for Cores proxy)
apiProfile := api.Group("/profile")
{
    apiPasskeys := apiProfile.Group("/passkeys")
    {
        apiPasskeys.POST("/start-registration", profileHandler.StartPasskeyRegistration)
        apiPasskeys.POST("/complete-registration", profileHandler.CompletePasskeyRegistration)
        apiPasskeys.GET("", profileHandler.ListUserPasskeys)
        apiPasskeys.DELETE("/:id", profileHandler.DeletePasskey)
    }
    apiTwoFA := apiProfile.Group("/2fa")
    {
        apiTwoFA.GET("/status", profileHandler.Get2FAStatus)
        apiTwoFA.POST("/setup", profileHandler.Setup2FA)
        apiTwoFA.POST("/verify", profileHandler.Verify2FA)
        apiTwoFA.POST("/disable", profileHandler.Disable2FA)
    }
}
```

- [ ] **Schritt 2: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./...
```
Erwartet: Kein Output (kein Fehler)

- [ ] **Schritt 3: Manuell testen via Proxy**

```bash
# Auf docker03 nach dem Deploy testen (jetzt curl auf dem lokalen System):
curl -v -X GET https://cores.tsunami-events.de/api/v1/proxy/rental/api/v1/profile/2fa/status \
  -H "Cookie: cores_token=<token>"
```
Erwartet: HTTP 200 mit `{"enabled":false,"verified":false}`

- [ ] **Schritt 4: Commit**

```bash
cd /opt/dev/cores/rentalcore
git add cmd/server/main.go
git commit -m "feat(api): expose profile/passkeys and profile/2fa under /api/v1 for proxy"
```

---

## Task 2: M365-Settings-Modell + Handler in RentalCore

**Goal:** M365-Konfiguration in DB speichern (Fallback auf ENV), GET/PUT-API unter `/api/v1/settings/m365`.

**Files:**
- Create: `rentalcore/internal/models/m365_settings.go`
- Create: `rentalcore/internal/handlers/m365_settings_handler.go`
- Modify: `rentalcore/cmd/server/main.go`

- [ ] **Schritt 1: Modell erstellen**

Datei anlegen: `rentalcore/internal/models/m365_settings.go`

```go
package models

import "time"

type M365Settings struct {
	ID              uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	TenantID        string    `gorm:"column:tenant_id;not null;default:''" json:"tenantId"`
	ClientID        string    `gorm:"column:client_id;not null;default:''" json:"clientId"`
	ClientSecret    string    `gorm:"column:client_secret;not null;default:''" json:"clientSecret"`
	MailboxID       string    `gorm:"column:mailbox_id;not null;default:''" json:"mailboxId"`
	SyncInterval    string    `gorm:"column:sync_interval;not null;default:'5m'" json:"syncInterval"`
	CalendarMailbox string    `gorm:"column:calendar_mailbox;not null;default:''" json:"calendarMailbox"`
	UpdatedAt       time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
}

func (M365Settings) TableName() string { return "m365_settings" }
```

- [ ] **Schritt 2: Handler erstellen**

Datei anlegen: `rentalcore/internal/handlers/m365_settings_handler.go`

```go
package handlers

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"rentalcore/internal/models"
)

type M365SettingsHandler struct {
	db *gorm.DB
}

func NewM365SettingsHandler(db *gorm.DB) *M365SettingsHandler {
	return &M365SettingsHandler{db: db}
}

func (h *M365SettingsHandler) GetM365Settings(c *gin.Context) {
	var s models.M365Settings
	if err := h.db.First(&s).Error; err != nil {
		// Not in DB yet — return env-based defaults (ohne Secret)
		c.JSON(http.StatusOK, gin.H{
			"tenantId":        os.Getenv("M365_TENANT_ID"),
			"clientId":        os.Getenv("M365_CLIENT_ID"),
			"clientSecret":    "",
			"mailboxId":       os.Getenv("M365_SHARED_MAILBOX_ID"),
			"syncInterval":    firstNonEmpty(os.Getenv("M365_SYNC_INTERVAL"), "5m"),
			"calendarMailbox": firstNonEmpty(os.Getenv("M365_CALENDAR_MAILBOX"), "events@tsunami-events.de"),
			"source":          "env",
		})
		return
	}
	// Mask secret in GET response
	result := gin.H{
		"tenantId":        s.TenantID,
		"clientId":        s.ClientID,
		"clientSecret":    maskSecret(s.ClientSecret),
		"mailboxId":       s.MailboxID,
		"syncInterval":    s.SyncInterval,
		"calendarMailbox": s.CalendarMailbox,
		"source":          "db",
		"updatedAt":       s.UpdatedAt,
	}
	c.JSON(http.StatusOK, result)
}

func (h *M365SettingsHandler) UpdateM365Settings(c *gin.Context) {
	var req struct {
		TenantID        string `json:"tenantId"`
		ClientID        string `json:"clientId"`
		ClientSecret    string `json:"clientSecret"`
		MailboxID       string `json:"mailboxId"`
		SyncInterval    string `json:"syncInterval"`
		CalendarMailbox string `json:"calendarMailbox"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ungültige Anfrage"})
		return
	}

	var s models.M365Settings
	h.db.First(&s) // load existing or zero value

	s.TenantID = req.TenantID
	s.ClientID = req.ClientID
	if req.ClientSecret != "" && req.ClientSecret != "••••••••" {
		s.ClientSecret = req.ClientSecret
	}
	s.MailboxID = req.MailboxID
	if req.SyncInterval != "" {
		s.SyncInterval = req.SyncInterval
	}
	s.CalendarMailbox = req.CalendarMailbox

	if s.ID == 0 {
		if err := h.db.Create(&s).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else {
		if err := h.db.Save(&s).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "Gespeichert"})
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func maskSecret(s string) string {
	if s == "" {
		return ""
	}
	return "••••••••"
}
```

- [ ] **Schritt 3: AutoMigrate für M365Settings + Route registrieren**

In `rentalcore/cmd/server/main.go`:

1. Im AutoMigrate-Block (suche nach `db.DB.AutoMigrate(` oder der Stelle wo Modelle migriert werden) `models.M365Settings{}` hinzufügen. Falls kein AutoMigrate vorhanden, nach dem DB-Init folgendes einfügen:

```go
// Falls kein AutoMigrate-Block existiert, nach repository.InitDatabase():
db.DB.AutoMigrate(&models.M365Settings{})
```

2. Handler initialisieren (nach den anderen Handler-Initialisierungen, ca. Zeile 440):
```go
m365SettingsHandler := handlers.NewM365SettingsHandler(db.DB)
```

3. Route im `api` Group registrieren (innerhalb `api := protected.Group("/api/v1")`):
```go
// M365 Settings
apiSettings := api.Group("/settings")
{
    apiSettings.GET("/m365", m365SettingsHandler.GetM365Settings)
    apiSettings.PUT("/m365", m365SettingsHandler.UpdateM365Settings)
}
```

4. `m365SettingsHandler` zur `setupRoutes`-Signatur hinzufügen falls nötig (prüfen ob `setupRoutes` verwendet wird — wenn ja, Parameter ergänzen; wenn die Routen direkt in main() registriert werden, direkt einfügen).

- [ ] **Schritt 4: Build prüfen**

```bash
cd /opt/dev/cores/rentalcore && go build ./...
```
Erwartet: Kein Output

- [ ] **Schritt 5: Commit**

```bash
cd /opt/dev/cores/rentalcore
git add internal/models/m365_settings.go internal/handlers/m365_settings_handler.go cmd/server/main.go
git commit -m "feat(m365): add M365Settings model and GET/PUT API under /api/v1/settings/m365"
```

---

## Task 3: RentalCore Build + Push

- [ ] **Schritt 1: Aktuelle Version aus README lesen**

```bash
grep "Version:" /opt/dev/cores/rentalcore/README.md
```

- [ ] **Schritt 2: Version erhöhen (X.Y.Z → X.Y.(Z+1))**

```bash
# Beispiel für v5.3.55 → v5.3.56 (aktuelle Version prüfen!):
CURRENT=$(grep -oP 'v\d+\.\d+\.\d+' /opt/dev/cores/rentalcore/README.md | head -1)
echo "Aktuelle Version: $CURRENT"
```

README.md aktualisieren mit neuer Version.

- [ ] **Schritt 3: Zu GitLab pushen**

```bash
cd /opt/dev/cores/rentalcore
git add README.md
git commit -m "chore: bump version to vX.Y.Z"
git push origin main
```

- [ ] **Schritt 4: Docker Image bauen und pushen**

```bash
cd /opt/dev/cores/rentalcore
NEW_VERSION="5.X.YY"   # aktuelle Version einsetzen
docker build -t nobentie/rentalcore:${NEW_VERSION} .
docker push nobentie/rentalcore:${NEW_VERSION}
docker tag nobentie/rentalcore:${NEW_VERSION} nobentie/rentalcore:latest
docker push nobentie/rentalcore:latest
```

- [ ] **Schritt 5: Via Komodo deployen**

```bash
curl -s -X POST "https://komodo.server-nt.de/execute/PullStack" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: K-JjzIjQZH4Tb8VHbwsGI9jSPB3iVc7hA5xn4z3fe1" \
  -H "X-Api-Secret: S-LwBKLnHGEq1BemfiC3MafA8qecif1CpmgANlbBbn" \
  -d '{"stack": "cores"}'

sleep 20

curl -s -X POST "https://komodo.server-nt.de/execute/DeployStack" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: K-JjzIjQZH4Tb8VHbwsGI9jSPB3iVc7hA5xn4z3fe1" \
  -H "X-Api-Secret: S-LwBKLnHGEq1BemfiC3MafA8qecif1CpmgANlbBbn" \
  -d '{"stack": "cores"}'
```

---

## Task 4: System-Status-Seite (Cores Backend)

**Files:**
- Create: `cores-dashboard/internal/handlers/status_handler.go`
- Modify: `cores-dashboard/cmd/server/main.go`

- [ ] **Schritt 1: Status-Handler erstellen**

Datei anlegen: `cores-dashboard/internal/handlers/status_handler.go`

```go
package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"coresdashboard/internal/config"
)

type StatusHandler struct {
	cfg    *config.Config
	client *http.Client
}

func NewStatusHandler(cfg *config.Config) *StatusHandler {
	return &StatusHandler{
		cfg:    cfg,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

type ServiceStatus struct {
	Name         string  `json:"name"`
	Healthy      bool    `json:"healthy"`
	ResponseMs   int64   `json:"responseMs"`
	ErrorMessage string  `json:"errorMessage,omitempty"`
}

func (h *StatusHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	type result struct {
		Services []ServiceStatus `json:"services"`
	}

	checks := []struct {
		name string
		url  string
	}{
		{"RentalCore", h.cfg.RentalCoreURL + "/health"},
		{"WarehouseCore", h.cfg.WarehouseCoreURL + "/api/v1/health"},
	}

	services := make([]ServiceStatus, 0, len(checks))
	for _, check := range checks {
		svc := probe(h.client, check.name, check.url)
		services = append(services, svc)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result{Services: services})
}

func probe(client *http.Client, name, url string) ServiceStatus {
	start := time.Now()
	resp, err := client.Get(url)
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		return ServiceStatus{Name: name, Healthy: false, ResponseMs: elapsed, ErrorMessage: err.Error()}
	}
	defer resp.Body.Close()
	return ServiceStatus{Name: name, Healthy: resp.StatusCode < 400, ResponseMs: elapsed}
}
```

- [ ] **Schritt 2: Route in main.go registrieren**

In `cores-dashboard/cmd/server/main.go`:

```go
statusHandler := handlers.NewStatusHandler(cfg)
```

In der `protected`-Handler-Registrierung (neben `analyticsHandler.Summary`):

```go
case r.URL.Path == "/api/v1/status":
    statusHandler.GetStatus(w, r)
```

Und außerhalb des `protected`-Blocks den Route-Handle eintragen:

```go
mux.Handle("/api/v1/status", protected)
```

- [ ] **Schritt 3: Build prüfen**

```bash
cd /opt/dev/cores/cores-dashboard && go build ./cmd/server/
```
Erwartet: Kein Output

- [ ] **Schritt 4: Commit**

```bash
cd /opt/dev/cores/cores-dashboard
git add internal/handlers/status_handler.go cmd/server/main.go
git commit -m "feat(status): add /api/v1/status endpoint polling RentalCore and WarehouseCore health"
```

---

## Task 5: System-Status-Seite (Cores Frontend)

**Files:**
- Create: `cores-dashboard/web/src/pages/StatusPage.tsx`
- Modify: `cores-dashboard/web/src/App.tsx`
- Modify: `cores-dashboard/web/src/components/Layout.tsx`

- [ ] **Schritt 1: StatusPage.tsx erstellen**

Datei anlegen: `cores-dashboard/web/src/pages/StatusPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Activity, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

interface ServiceStatus {
  name: string;
  healthy: boolean;
  responseMs: number;
  errorMessage?: string;
}

interface StatusResult {
  services: ServiceStatus[];
}

export function StatusPage() {
  const [data, setData] = useState<StatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<StatusResult>('/status');
      setData(r.data);
      setLastChecked(new Date());
    } catch {
      // keep old data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  const fmt = (ms: number) => ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">System-Status</h1>
          <p className="text-gray-500 text-sm mt-1">
            {lastChecked ? `Zuletzt geprüft: ${lastChecked.toLocaleTimeString('de-DE')}` : 'Wird geladen…'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data?.services ?? []).map(svc => (
          <div
            key={svc.name}
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{
              background: '#111111',
              border: `1px solid ${svc.healthy ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: svc.healthy ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}
            >
              {svc.healthy
                ? <CheckCircle className="w-6 h-6 text-green-400" />
                : <XCircle className="w-6 h-6 text-red-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold">{svc.name}</p>
              <p className={`text-sm font-medium ${svc.healthy ? 'text-green-400' : 'text-red-400'}`}>
                {svc.healthy ? 'Erreichbar' : 'Nicht erreichbar'}
              </p>
              {svc.errorMessage && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{svc.errorMessage}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 flex-shrink-0">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-sm tabular-nums">{fmt(svc.responseMs)}</span>
            </div>
          </div>
        ))}

        {!data && loading && [0, 1].map(i => (
          <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', height: '88px' }} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Schritt 2: Route in App.tsx hinzufügen**

In `cores-dashboard/web/src/App.tsx`:

```tsx
import { StatusPage } from './pages/StatusPage';
```

Nach der Dashboard-Route einfügen:
```tsx
<Route path="/status" element={<ProtectedRoute><Layout><StatusPage /></Layout></ProtectedRoute>} />
```

- [ ] **Schritt 3: Nav-Item in Layout.tsx hinzufügen**

In `cores-dashboard/web/src/components/Layout.tsx`, im `import`-Block `Activity` zu den Lucide-Icons hinzufügen:
```tsx
import { ..., Activity } from 'lucide-react';
```

Nach dem Dashboard-Link (Zeile ~64) einfügen:
```tsx
<Link to="/status" onClick={onClose} className={linkCls(isActive('/status'))}>
  <Activity className="w-5 h-5 flex-shrink-0" />
  {expanded && <span>System-Status</span>}
</Link>
```

- [ ] **Schritt 4: Frontend Build prüfen**

```bash
cd /opt/dev/cores/cores-dashboard/web && npm run build 2>&1 | tail -5
```
Erwartet: `✓ built in X.XXs`

- [ ] **Schritt 5: Commit**

```bash
cd /opt/dev/cores/cores-dashboard
git add web/src/pages/StatusPage.tsx web/src/App.tsx web/src/components/Layout.tsx
git commit -m "feat(status): add system status page with health checks for RentalCore and WarehouseCore"
```

---

## Task 6: Firmen-Branding-Tab (Cores Frontend)

**Erklärung:** RentalCore hat `/api/company-settings` unter dem Legacy-API-Pfad (`/api/` ohne `/v1/`). Der Proxy leitet `/api/v1/proxy/rental/api/company-settings` → RentalCore `/api/company-settings`. Das funktioniert ohne Backend-Änderungen.

**Files:**
- Create: `cores-dashboard/web/src/components/admin/BrandingTab.tsx`
- Modify: `cores-dashboard/web/src/pages/AdminPage.tsx`
- Modify: `cores-dashboard/web/src/components/Layout.tsx`

- [ ] **Schritt 1: BrandingTab.tsx erstellen**

Datei anlegen: `cores-dashboard/web/src/components/admin/BrandingTab.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Save, Building2 } from 'lucide-react';
import axios from 'axios';

const rentalApi = axios.create({
  baseURL: '/api/v1/proxy/rental/api',
  withCredentials: true,
});

interface CompanySettings {
  companyName: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxNumber?: string;
  vatNumber?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  accountHolder?: string;
  ceoName?: string;
  registerCourt?: string;
  registerNumber?: string;
  footerText?: string;
  paymentTermsText?: string;
}

function Field({ label, value, onChange, required, textarea }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; textarea?: boolean;
}) {
  const cls = "w-full px-3 py-2 rounded-lg text-white text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-accent-red/50 placeholder:text-gray-600";
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-medium">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {textarea
        ? <textarea rows={3} className={cls} value={value} onChange={e => onChange(e.target.value)} />
        : <input type="text" className={cls} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

export function BrandingTab() {
  const [form, setForm] = useState<CompanySettings>({ companyName: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

  const set = (key: keyof CompanySettings) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }));

  useEffect(() => {
    rentalApi.get<CompanySettings>('/company-settings')
      .then(r => setForm(r.data))
      .catch(() => setMsg('Einstellungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!form.companyName) { setMsg('Firmenname ist erforderlich.'); setMsgType('err'); return; }
    setSaving(true); setMsg('');
    try {
      await rentalApi.put('/company-settings', form);
      setMsg('Gespeichert!'); setMsgType('ok');
    } catch (e: any) {
      setMsg(e?.response?.data?.error ?? 'Fehler beim Speichern.');
      setMsgType('err');
    } finally { setSaving(false); }
  };

  if (loading) return <p className="text-gray-400 text-sm">Lädt…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-accent-red" />
        <h2 className="text-white font-semibold text-lg">Firmen-Branding</h2>
      </div>

      {msg && (
        <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${msgType === 'err' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4 md:col-span-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Allgemein</p>
          <Field label="Firmenname" value={form.companyName} onChange={set('companyName')} required />
        </div>

        <div className="space-y-4 md:col-span-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Adresse</p>
        </div>
        <Field label="Straße" value={form.addressLine1 ?? ''} onChange={set('addressLine1')} />
        <Field label="Adresszusatz" value={form.addressLine2 ?? ''} onChange={set('addressLine2')} />
        <Field label="PLZ" value={form.postalCode ?? ''} onChange={set('postalCode')} />
        <Field label="Stadt" value={form.city ?? ''} onChange={set('city')} />
        <Field label="Land" value={form.country ?? ''} onChange={set('country')} />

        <div className="space-y-4 md:col-span-2 pt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Kontakt</p>
        </div>
        <Field label="Telefon" value={form.phone ?? ''} onChange={set('phone')} />
        <Field label="E-Mail" value={form.email ?? ''} onChange={set('email')} />
        <Field label="Website" value={form.website ?? ''} onChange={set('website')} />

        <div className="space-y-4 md:col-span-2 pt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Steuer & Rechtliches</p>
        </div>
        <Field label="Steuernummer" value={form.taxNumber ?? ''} onChange={set('taxNumber')} />
        <Field label="USt-IdNr." value={form.vatNumber ?? ''} onChange={set('vatNumber')} />
        <Field label="Geschäftsführer" value={form.ceoName ?? ''} onChange={set('ceoName')} />
        <Field label="Registergericht" value={form.registerCourt ?? ''} onChange={set('registerCourt')} />
        <Field label="Handelsregisternummer" value={form.registerNumber ?? ''} onChange={set('registerNumber')} />

        <div className="space-y-4 md:col-span-2 pt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Bankverbindung</p>
        </div>
        <Field label="Bank" value={form.bankName ?? ''} onChange={set('bankName')} />
        <Field label="Kontoinhaber" value={form.accountHolder ?? ''} onChange={set('accountHolder')} />
        <Field label="IBAN" value={form.iban ?? ''} onChange={set('iban')} />
        <Field label="BIC" value={form.bic ?? ''} onChange={set('bic')} />

        <div className="space-y-4 md:col-span-2 pt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Rechnungs-Texte</p>
        </div>
        <div className="md:col-span-2">
          <Field label="Fußzeile" value={form.footerText ?? ''} onChange={set('footerText')} textarea />
        </div>
        <div className="md:col-span-2">
          <Field label="Zahlungsbedingungen" value={form.paymentTermsText ?? ''} onChange={set('paymentTermsText')} textarea />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent-red text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Schritt 2: Tab in AdminPage.tsx registrieren**

In `cores-dashboard/web/src/pages/AdminPage.tsx`:

```tsx
import { BrandingTab } from '../components/admin/BrandingTab';
```

Im `tabComponents`-Record:
```tsx
branding: BrandingTab,
```

- [ ] **Schritt 3: Nav-Item in Layout.tsx hinzufügen**

In `ADMIN_ITEMS`-Array in `cores-dashboard/web/src/components/Layout.tsx` einfügen (nach `contacts`):
```tsx
{ path: '/admin/branding', label: 'Firmen-Branding', icon: Building2 },
```

`Building2` zum Lucide-Import hinzufügen.

- [ ] **Schritt 4: Build prüfen**

```bash
cd /opt/dev/cores/cores-dashboard/web && npm run build 2>&1 | tail -5
```
Erwartet: `✓ built in X.XXs`

- [ ] **Schritt 5: Commit**

```bash
cd /opt/dev/cores/cores-dashboard
git add web/src/components/admin/BrandingTab.tsx web/src/pages/AdminPage.tsx web/src/components/Layout.tsx
git commit -m "feat(admin): add company branding tab in Cores admin"
```

---

## Task 7: M365-Konfigurations-Tab (Cores Frontend)

**Files:**
- Create: `cores-dashboard/web/src/components/admin/M365SettingsTab.tsx`
- Modify: `cores-dashboard/web/src/pages/AdminPage.tsx`
- Modify: `cores-dashboard/web/src/components/Layout.tsx`

- [ ] **Schritt 1: M365SettingsTab.tsx erstellen**

Datei anlegen: `cores-dashboard/web/src/components/admin/M365SettingsTab.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Save, Cloud, Info } from 'lucide-react';
import axios from 'axios';

const rentalApi = axios.create({
  baseURL: '/api/v1/proxy/rental/api/v1',
  withCredentials: true,
});

interface M365Settings {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  mailboxId: string;
  syncInterval: string;
  calendarMailbox: string;
  source?: 'db' | 'env';
  updatedAt?: string;
}

function Field({ label, value, onChange, type, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <input
        type={type ?? 'text'}
        className="w-full px-3 py-2 rounded-lg text-white text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-accent-red/50 font-mono"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={type === 'password' ? '••••••••' : ''}
      />
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

export function M365SettingsTab() {
  const [form, setForm] = useState<M365Settings>({
    tenantId: '', clientId: '', clientSecret: '',
    mailboxId: '', syncInterval: '5m', calendarMailbox: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');
  const [source, setSource] = useState<'db' | 'env' | null>(null);

  const set = (key: keyof M365Settings) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }));

  useEffect(() => {
    rentalApi.get<M365Settings>('/settings/m365')
      .then(r => {
        setForm(r.data);
        setSource(r.data.source ?? null);
      })
      .catch(() => setMsg('Einstellungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await rentalApi.put('/settings/m365', form);
      setMsg('Gespeichert! RentalCore verwendet beim nächsten Neustart die neuen Werte.');
      setMsgType('ok');
      setSource('db');
    } catch (e: any) {
      setMsg(e?.response?.data?.error ?? 'Fehler beim Speichern.');
      setMsgType('err');
    } finally { setSaving(false); }
  };

  if (loading) return <p className="text-gray-400 text-sm">Lädt…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Cloud className="w-5 h-5 text-accent-red" />
        <h2 className="text-white font-semibold text-lg">Microsoft 365 Integration</h2>
      </div>

      {source === 'env' && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-300 text-xs">Werte stammen aus Umgebungsvariablen. Nach dem Speichern werden DB-Werte bevorzugt.</p>
        </div>
      )}

      {msg && (
        <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${msgType === 'err' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Azure App-Registrierung</p>
        </div>
        <Field label="Tenant ID" value={form.tenantId} onChange={set('tenantId')}
          hint="Azure Active Directory Tenant-ID (GUID)" />
        <Field label="Client ID" value={form.clientId} onChange={set('clientId')}
          hint="App-Registrierung Application (client) ID" />
        <div className="md:col-span-2">
          <Field label="Client Secret" value={form.clientSecret} onChange={set('clientSecret')}
            type="password" hint="Geheimnis der App-Registrierung (leer lassen um bestehendes zu behalten)" />
        </div>

        <div className="md:col-span-2 pt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Mailboxen</p>
        </div>
        <Field label="Shared Mailbox ID" value={form.mailboxId} onChange={set('mailboxId')}
          hint="E-Mail-Adresse oder GUID der freigegebenen Mailbox für Kontakte" />
        <Field label="Kalender-Mailbox" value={form.calendarMailbox} onChange={set('calendarMailbox')}
          hint="E-Mail-Adresse für Kalendertermine (z.B. events@tsunami-events.de)" />

        <div className="md:col-span-2 pt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Synchronisation</p>
        </div>
        <Field label="Sync-Intervall" value={form.syncInterval} onChange={set('syncInterval')}
          hint="Format: 5m, 15m, 1h — Intervall für automatische Synchronisation" />
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent-red text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Schritt 2: Tab in AdminPage.tsx registrieren**

In `cores-dashboard/web/src/pages/AdminPage.tsx`:

```tsx
import { M365SettingsTab } from '../components/admin/M365SettingsTab';
```

Im `tabComponents`-Record:
```tsx
m365: M365SettingsTab,
```

- [ ] **Schritt 3: Nav-Item in Layout.tsx hinzufügen**

Im `ADMIN_ITEMS`-Array in `cores-dashboard/web/src/components/Layout.tsx` einfügen (nach `apisettings`):
```tsx
{ path: '/admin/m365', label: 'M365 Integration', icon: Cloud },
```

`Cloud` zum Lucide-Import hinzufügen.

- [ ] **Schritt 4: Build prüfen**

```bash
cd /opt/dev/cores/cores-dashboard/web && npm run build 2>&1 | tail -5
```
Erwartet: `✓ built in X.XXs`

- [ ] **Schritt 5: Commit**

```bash
cd /opt/dev/cores/cores-dashboard
git add web/src/components/admin/M365SettingsTab.tsx web/src/pages/AdminPage.tsx web/src/components/Layout.tsx
git commit -m "feat(admin): add M365 integration settings tab"
```

---

## Task 8: Cores Dashboard Build + Deploy

- [ ] **Schritt 1: Version in README erhöhen**

```bash
grep "Version:" /opt/dev/cores/cores-dashboard/README.md
# Aktuelle Version notieren, um 1 erhöhen
```

- [ ] **Schritt 2: Docker Image bauen**

```bash
cd /opt/dev/cores/cores-dashboard
NEW_VERSION="X.Y.Z"  # einsetzen
docker build -t nobentie/coresdashboard:${NEW_VERSION} .
```

**Hinweis:** Falls das Image-Prefix anders heißt (z.B. `nobentie/cores`), mit `docker images | grep cores` prüfen.

- [ ] **Schritt 3: Zu Docker Hub pushen**

```bash
docker push nobentie/coresdashboard:${NEW_VERSION}
docker tag nobentie/coresdashboard:${NEW_VERSION} nobentie/coresdashboard:latest
docker push nobentie/coresdashboard:latest
```

- [ ] **Schritt 4: Via Komodo deployen**

```bash
curl -s -X POST "https://komodo.server-nt.de/execute/PullStack" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: K-JjzIjQZH4Tb8VHbwsGI9jSPB3iVc7hA5xn4z3fe1" \
  -H "X-Api-Secret: S-LwBKLnHGEq1BemfiC3MafA8qecif1CpmgANlbBbn" \
  -d '{"stack": "cores"}'

sleep 20

curl -s -X POST "https://komodo.server-nt.de/execute/DeployStack" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: K-JjzIjQZH4Tb8VHbwsGI9jSPB3iVc7hA5xn4z3fe1" \
  -H "X-Api-Secret: S-LwBKLnHGEq1BemfiC3MafA8qecif1CpmgANlbBbn" \
  -d '{"stack": "cores"}'
```

- [ ] **Schritt 5: Smoke-Test**

```bash
# Status-Seite
curl -s https://cores.tsunami-events.de/api/v1/status  # nach Login

# 2FA endpoint
curl -s https://cores.tsunami-events.de/api/v1/proxy/rental/api/v1/profile/2fa/status
```

---

## Reihenfolge

1. Task 1 (RentalCore Passkeys/2FA-Routen)
2. Task 2 (RentalCore M365-Handler)
3. Task 3 (RentalCore Deploy)
4. Task 4 (Cores Status-Backend)
5. Task 5 (Cores Status-Frontend)
6. Task 6 (Cores Branding-Tab)
7. Task 7 (Cores M365-Tab)
8. Task 8 (Cores Deploy)
