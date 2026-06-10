# PlannerCore

Planungs- und Aufgabenmanagement-Tool – Teil des **Tsunami Events Cores-Ökosystems**.
Authentifizierung via cores-dashboard (SSO), geteiltes Branding und Tsunami-Design-System.

Ehemals ein eigenständiger Microsoft-Planner-Klon; jetzt vollständig in die Cores-Plattform integriert.

![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20PostgreSQL-31752f)
![Cores](https://img.shields.io/badge/Cores-SSO%20%7C%20Branding%20%7C%20Tsunami%20Theme-D0021B)

## Funktionen

**Pläne & Boards**
- Pläne mit Farbe, Symbol, Beschreibung, Favoriten und Planner-Hub-Übersicht
- Buckets: anlegen, umbenennen, löschen, per Drag & Drop sortieren
- Aufgaben per Drag & Drop verschieben (auch auf Touch-Geräten)
- Gruppierung des Boards nach **Bucket, Status, Priorität, Fälligkeitsdatum, Zugewiesen zu oder Bezeichnungen**
- Plan kopieren, Export nach Excel (CSV)

**Aufgaben**
- Status (Nicht begonnen / In Arbeit / Erledigt), Priorität (Dringend / Wichtig / Mittel / Niedrig)
- Start- und Fälligkeitsdatum mit Überfällig-Markierung
- 25 farbige Bezeichnungen, pro Plan frei benennbar
- Checklisten, Notizen, Kommentare, Dateianhänge (Upload/Download)
- Mehrfach-Zuweisung an Planmitglieder

**Ansichten**
- **Board** – Kanban mit Schnellerfassung
- **Raster** – sortierbare Tabelle mit Inline-Bearbeitung
- **Diagramme** – Status-Donut, Aufgaben je Bucket/Priorität/Mitglied
- **Zeitplan** – Monatskalender mit Fälligkeiten
- **Meine Aufgaben** – planübergreifende Aufgabenliste
- Filter nach Stichwort, Fälligkeit, Priorität, Bezeichnung und Person

**Benachrichtigungen**
- In-App-Benachrichtigungen (Glocke) und E-Mails über Microsoft 365 bei:
  - Zuweisung einer Aufgabe
  - neuem Kommentar
  - Aufnahme in einen Plan
  - bald fälligen und überfälligen Aufgaben (automatische Prüfung alle 30 Minuten)

**Oberfläche**
- Dark Mode, Light Mode oder Systemeinstellung (Tsunami Design System)
- Vollständig responsiv für Smartphone bis Ultrawide

## Cores-Integration

### Authentifizierung (SSO)
- Login erfolgt über das **cores-dashboard** (`POST /api/v1/auth/login`)
- Alle Requests nutzen das `cores_token` HttpOnly-Cookie
- PlannerCore validiert das Token eigenständig gegen die geteilte `users`-Tabelle
- `CORES_JWT_SECRET` muss mit dem Wert in cores-dashboard übereinstimmen

### Branding
- Logo/Favicon werden aus der geteilten `branding_config`-Datenbanktabelle geladen
- `/api/v1/branding` liefert Planner-spezifische Branding-Daten
- Logo-Dateien liegen im geteilten Volume `/var/lib/branding/logos`

### Theme
- Verwendet das **Tsunami Events Design System** (`tsunami-theme.css`)
- Alle Farben, Abstände, Schatten etc. über CSS-Variablen
- Planner-eigene Akzentfarbe: Grün (`--planner-accent: #31752f`)

## Schnellstart (im Cores-Stack)

```bash
# Im cores-dashboard Projektverzeichnis:
docker compose up -d
# PlannerCore ist unter http://localhost:8083 erreichbar
# Oder über das Dashboard: http://localhost:8080/planner/
```

## Entwicklung (standalone)

```bash
# PostgreSQL bereitstellen (Benutzer/DB: rentalcore)
cp .env.example .env
# .env anpassen: CORES_JWT_SECRET und DB_PASSWORD setzen!
cd server && npm install && npm run dev          # API auf :8080
cd web   && npm install && npm run dev           # Vite-Dev-Server auf :5173
```

## Konfigurationsreferenz

| Variable | Standard | Beschreibung |
|---|---|---|
| `PORT` | `8080` | Port des API-Servers |
| `APP_URL` | `http://localhost:8080` | Basis-URL für Links in E-Mails |
| `CORES_JWT_SECRET` | – | **Pflicht:** Geteiltes JWT-Secret (muss mit cores-dashboard übereinstimmen) |
| `DB_HOST` | `localhost` | PostgreSQL-Host |
| `DB_PORT` | `5432` | PostgreSQL-Port |
| `DB_NAME` | `rentalcore` | Datenbankname (geteilte Cores-DB) |
| `DB_USER` | `rentalcore` | Datenbankbenutzer |
| `DB_PASSWORD` | – | Datenbankpasswort |
| `MAIL_PROVIDER` | `console` | `graph`, `smtp` oder `console` |
| `MAIL_SENDER` | – | Absenderadresse für E-Mails |

## E-Mail über Microsoft 365

Siehe [ursprüngliche Planner-Dokumentation](#). Kurzfassung:

**Variante A: Microsoft Graph API (empfohlen)**
```ini
MAIL_PROVIDER=graph
GRAPH_TENANT_ID=<Verzeichnis-ID>
GRAPH_CLIENT_ID=<Anwendungs-ID>
GRAPH_CLIENT_SECRET=<geheimer Clientschlüssel>
MAIL_SENDER=planner@ihre-firma.de
```

**Variante B: SMTP AUTH (Office 365)**
```ini
MAIL_PROVIDER=smtp
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=planner@ihre-firma.de
SMTP_PASS=<Passwort>
MAIL_SENDER=planner@ihre-firma.de
```

## Architektur

```
cores/
├── docker-compose.yml       → postgres + cores-dashboard + rentalcore + warehousecore + plannercore
├── theme/tsunami-theme.css  → Geteiltes Design System
└── plannercore/
    ├── Dockerfile            → Multi-Stage: Node 22 Alpine
    ├── server/               → Express-API, JWT-Validierung, Mailer, Scheduler
    │   └── src/
    │       ├── auth.js       → cores_token JWT-Validierung
    │       ├── branding.js   → Branding aus geteilter DB
    │       ├── db.js         → PostgreSQL (geteilte DB, eigene Plan-Tabellen)
    │       └── routes/       → auth, users, plans, buckets, tasks, notifications
    └── web/                  → React 18 + Vite, @hello-pangea/dnd
        └── src/
            ├── theme-tsunami.css  → Tsunami Design System
            ├── styles.css         → Planner-spezifische Styles
            └── hooks/useBranding.js → Branding-Polling
```

## Docker Image

```bash
docker build -t nobentie/plannercore:2.0 .
docker push nobentie/plannercore:2.0
docker tag nobentie/plannercore:2.0 nobentie/plannercore:latest
docker push nobentie/plannercore:latest
```

## Hinweise für den Produktivbetrieb

- `CORES_JWT_SECRET` muss in ALLEN Services identisch sein
- Branding-Logos werden über das cores-dashboard-Admin-Panel verwaltet
- Backups: PostgreSQL-Volume (`postgres-data`) und Branding-Volume (`branding-data`) sichern
