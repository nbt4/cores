# Cores Dashboard — Design Spec
**Datum:** 2026-04-18  
**Status:** Genehmigt

---

## Überblick

Das Cores Dashboard ist ein neuer zentraler Hub-Service für das Tsunami Events Management-System. Es dient als einziger Einstiegspunkt (Login, Admin, Analytics) für RentalCore und WarehouseCore.

---

## Architektur

### Neuer Service: `cores-dashboard`

| Eigenschaft | Wert |
|---|---|
| Port | 8080 |
| Stack | Go (net/http) + React/Vite (TypeScript) |
| Theme | Identisch zu RentalCore/WarehouseCore (Dark, Accent-Red #D0021B) |
| Docker Image | `nobentie/cores-dashboard` |

### SSO via Shared JWT Secret

Alle drei Services teilen denselben `CORES_JWT_SECRET` (via `.env`). Das Dashboard stellt beim Login einen JWT aus. RentalCore und WarehouseCore werden so erweitert, dass sie diesen Dashboard-JWT zusätzlich zu ihren eigenen Tokens akzeptieren.

```
┌──────────────────────────────────────────────────────┐
│           cores-dashboard  :8080                     │
│   React SPA + Go Backend                             │
│   • Login / SSO (JWT ausgeben)                       │
│   • Cores-Übersichtsseite + Analytics                │
│   • Zentrales Admin (alle Settings beider Cores)     │
└──────────────┬──────────────────┬────────────────────┘
               │ JWT (shared)     │ JWT (shared)
    ┌──────────▼───────┐  ┌───────▼────────────┐
    │   RentalCore     │  │   WarehouseCore     │
    │     :8081        │  │     :8082           │
    │ Admin-APIs blei. │  │ Admin-APIs bleiben  │
    │ Frontend-Tab weg │  │ Frontend-Tab weg    │
    └──────────────────┘  └────────────────────┘
              beide teilen: PostgreSQL :5432
```

### Umgebungsvariablen (alle drei Services)

```env
CORES_JWT_SECRET=<shared_secret>
CORES_DASHBOARD_URL=http://cores-dashboard:8080
RENTALCORE_URL=http://rentalcore:8081
WAREHOUSECORE_URL=http://warehousecore:8082
```

---

## Cores Dashboard — Seiten & Komponenten

### Login-Seite (`/login`)

- Branding: Quadratisches Logo-Icon (#D0021B) + „CORES" in Großbuchstaben mit Letter-Spacing
- Hintergrund: `#0B0B0B` mit rotem radialen Glow hinter der Card (`rgba(208,2,27,0.15)`, `blur(60px)`)
- Login-Card: Glassmorphism (`background: rgba(17,17,17,0.9)`, `backdrop-filter: blur(10px)`, `border: 1px solid rgba(255,255,255,0.08)`)
- Felder: Benutzername, Passwort
- Submit-Button: `#D0021B` mit `box-shadow: 0 0 20px rgba(208,2,27,0.3)`
- Nach erfolgreichem Login: JWT-Cookie setzen → Redirect zu `/`
- Force-Password-Change-Flow: identisch zu bestehenden Cores

### Dashboard-Seite (`/`)

**Sidebar** (identisch zu RentalCore/WarehouseCore):
- Hintergrund: `#111111`
- Logo + „CORES" als Titel
- Nav-Items: Dashboard, Analytics, Admin
- Unten: Profil, Logout

**Hauptbereich:**
1. Zwei große Hub-Kacheln nebeneinander:
   - **RentalCore**: Roter Gradient (`#D0021B` → `#6b0010`), Icon, Titel, Untertitel „Auftragsmanagement", externer Link-Button
   - **WarehouseCore**: Dunkler Blau-Gradient (`#1e3a5f` → `#0f1f33`), Border `#2a4a6b`, Icon, Titel, Untertitel „Lagermanagement", externer Link-Button

2. Analytics-Grid (6 Kacheln):
   - Offene Jobs (von RentalCore)
   - Geräte im Lager vs. auf Job (von WarehouseCore)
   - Umsatz laufender Monat (von RentalCore)
   - Rechnungsstatus — offen/bezahlt (von RentalCore)
   - Auslastung — Geräte auf Job / Gesamt (von WarehouseCore)
   - Wartungsstatus — fällige Wartungen (von WarehouseCore)

Analytics werden vom Dashboard-Backend via interner HTTP-Anfrage an beide Cores aggregiert (bestehende Analytics-Endpoints).

### Admin-Seite (`/admin`)

Alle Admin-Tabs aus beiden Cores zusammengeführt — nur für Rollen `admin` / `manager` zugänglich.

| Tab | Herkunft | API-Ziel |
|---|---|---|
| Benutzer | RentalCore + WarehouseCore | Beide |
| Rollen | RentalCore + WarehouseCore | Beide |
| Lagertypen | WarehouseCore | WarehouseCore |
| LED-Verhalten | WarehouseCore | WarehouseCore |
| ESP-Controller | WarehouseCore | WarehouseCore |
| Kategorien | WarehouseCore | WarehouseCore |
| Marken & Hersteller | WarehouseCore | WarehouseCore |
| Maßeinheiten | WarehouseCore | WarehouseCore |
| API-Einstellungen | WarehouseCore | WarehouseCore |
| API-Keys | WarehouseCore | WarehouseCore |
| CSV-Export | WarehouseCore | WarehouseCore |

Das Dashboard proxyt Admin-API-Calls intern an den jeweiligen Core weiter (mit dem Dashboard-JWT im Authorization-Header).

---

## Änderungen an RentalCore

1. **AdminPage entfernen**: `AdminPage.tsx` löschen, Route `/admin` aus `App.tsx` entfernen, Sidebar-Nav-Item entfernen.
2. **Middleware erweitern**: JWT-Validierung akzeptiert Tokens mit `CORES_JWT_SECRET` (zusätzlich zum bestehenden Mechanismus).
3. **Sidebar**: „← Cores"-Link ganz oben in der Sidebar (vor den Nav-Items), verweist auf `CORES_DASHBOARD_URL`.
4. **Sidebar**: „Warehouse →"-Link im Footer-Bereich der Sidebar, verweist auf `WAREHOUSECORE_URL`.
5. **Login-Redirect**: `/login` leitet via nginx zu `CORES_DASHBOARD_URL/login` um (oder per Frontend-Redirect).

## Änderungen an WarehouseCore

1. **AdminPage entfernen**: `AdminPage.tsx` löschen, Route `/admin` aus `App.tsx` entfernen, Sidebar-Nav-Item entfernen.
2. **Middleware erweitern**: JWT-Validierung akzeptiert Tokens mit `CORES_JWT_SECRET`.
3. **Sidebar**: „← Cores"-Link ganz oben in der Sidebar, verweist auf `CORES_DASHBOARD_URL`.
4. **Sidebar**: „Rental →"-Link im Footer-Bereich der Sidebar, verweist auf `RENTALCORE_URL`.
5. **Login-Redirect**: `/login` leitet zu `CORES_DASHBOARD_URL/login` um.

---

## Docker & Deployment

### Neuer Container in `docker-compose.yml`

```yaml
cores-dashboard:
  image: nobentie/cores-dashboard:latest
  ports:
    - "8080:8080"
  environment:
    - CORES_JWT_SECRET=${CORES_JWT_SECRET}
    - RENTALCORE_URL=http://rentalcore:8081
    - WAREHOUSECORE_URL=http://warehousecore:8082
  networks:
    - weidelbach
  depends_on:
    - postgres
```

### Verzeichnisstruktur (neuer Service)

```
cores-dashboard/
├── Dockerfile
├── go.mod
├── cmd/
│   └── main.go
├── internal/
│   ├── handlers/
│   │   ├── auth.go
│   │   ├── dashboard.go
│   │   └── admin_proxy.go
│   ├── middleware/
│   │   └── jwt.go
│   └── config/
│       └── config.go
└── web/
    ├── src/
    │   ├── App.tsx
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── AnalyticsPage.tsx
    │   │   └── AdminPage.tsx
    │   └── components/
    │       └── Layout.tsx
    ├── tailwind.config.js   ← identisch zu RentalCore
    └── index.html
```

---

## Nicht im Scope

- Echtzeit-Sync zwischen Dashboard und Cores (kein WebSocket)
- Benutzeranlage direkt im Dashboard (läuft über Admin-Proxy an die Cores)
- Umbau der bestehenden Auth-Systeme der Cores (nur Middleware-Erweiterung)
- Nginx-Konfigurationsänderungen (Login-Redirects können alternativ im Frontend erfolgen)
