# 🏗️ Cores — Tsunami Events Management System

> **Monorepo für das Cores-Ökosystem**  
> Vollständige Event-Management-Plattform bestehend aus vier Microservices mit zentraler Authentifizierung, einheitlichem Branding und Shared Infrastructure.

[![License](https://img.shields.io/badge/license-proprietary-red)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-compose-blue?logo=docker)](docker-compose.yml)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go)](https://go.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql)](https://www.postgresql.org/)

---

## 📋 Inhaltsverzeichnis

- [Projektübersicht](#projektübersicht)
- [Services im Detail](#services-im-detail)
  - [cores-dashboard](#cores-dashboard)
  - [rentalcore](#rentalcore)
  - [warehousecore](#warehousecore)
  - [plannercore](#plannercore)
- [Architektur](#architektur)
- [Repository-Struktur](#repository-struktur)
- [Installation & Deployment](#installation--deployment)
- [Entwicklung](#entwicklung)
- [Branding-System](#branding-system)
- [Security](#security)
- [Technologie-Stack](#technologie-stack)
- [Betrieb & Wartung](#betrieb--wartung)

---

## Projektübersicht

**Cores** ist das zentrale Event-Management-Ökosystem von **Tsunami Events**. Es besteht aus vier spezialisierten Microservices, die gemeinsam den gesamten Lebenszyklus von Veranstaltungen abdecken — von der Planung über die Vermietung und Lagerverwaltung bis hin zur zentralen Administration.

Das System wurde als **Monorepo** konzipiert, um eine einheitliche Codebasis mit geteilten Ressourcen, zentralem Branding und konsistenter Authentifizierung über alle Dienste hinweg zu ermöglichen.

### 🎯 Kernziele

- **Zentrales SSO** — Ein Login für alle Services über cores-dashboard
- **Einheitliches Branding** — Zentral verwaltetes Theme- und Logo-System
- **Shared Infrastructure** — Gemeinsame PostgreSQL-Datenbank, zentrales Reverse-Proxying
- **Docker-basiertes Deployment** — Vollständig containerisiert mit docker-compose
- **Git Submodules** — Jeder Service ist ein eigenständiges Repository, eingebunden als Submodule

---

## Services im Detail

---

### cores-dashboard

> **Zentraler Einstiegspunkt & Authentifizierungs-Hub**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Zentrale SSO-Authentifizierung, API-Reverse-Proxy, Branding-Management, Admin-Oberfläche |
| **Tech-Stack** | Go (Backend) + React/TypeScript (Frontend) |
| **Docker Image** | `cores-dashboard` |
| **Interner Port** | `8080` |
| **URL** | [cores.tsunami-events.de](https://cores.tsunami-events.de) |

#### 🔑 Haupt-Features

1. **Zentrale JWT-Authentifizierung (SSO)** — Single-Sign-On für alle Cores-Services mit Token-basierter Authentifizierung
2. **API Reverse-Proxy** — Intelligentes Routing aller API-Anfragen an die jeweiligen Backend-Services (rentalcore, warehousecore, plannercore)
3. **Admin Branding-Management** — Zentrale Verwaltung von Logos, Farben, Themes und Branding-Einstellungen für alle Services
4. **Konfigurations-Endpunkt** — Bereitstellung globaler Konfigurationen für alle verbundenen Services
5. **SPA-Proxy für Plannercore** — Auslieferung der Plannercore-Single-Page-Application über das Dashboard
6. **Benutzerverwaltung** — Zentrale Benutzer- und Rollenverwaltung (RBAC) über alle Services hinweg
7. **Health-Check & Monitoring** — Statusüberwachung aller verbundenen Backend-Services
8. **Responsive Admin-UI** — Vollständig responsive Administrationsoberfläche für Desktop und Mobile

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `POST` | `/api/auth/login` | SSO-Login mit JWT-Token-Ausstellung |
| `POST` | `/api/auth/logout` | Token-Invalidierung |
| `GET` | `/api/auth/validate` | Token-Validierung für andere Services |
| `GET` | `/api/config` | Globale Konfiguration abrufen |
| `GET` | `/api/branding` | Branding-Einstellungen (Logos, Farben, Themes) |
| `PUT` | `/api/branding` | Branding aktualisieren (Admin) |
| `*` | `/api/rental/*` | Proxy zu rentalcore |
| `*` | `/api/warehouse/*` | Proxy zu warehousecore |
| `*` | `/api/planner/*` | Proxy zu plannercore |

---

### rentalcore

> **Vermietung, Event-Management & Kundenverwaltung**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Vollständiges Vermietungs- und Event-Management inkl. Geräteverwaltung, Kundenmanagement, Rechnungsstellung |
| **Tech-Stack** | Go (Backend) + React/TypeScript (Frontend) |
| **Docker Image** | `rentalcore` |
| **Interner Port** | `8081` |
| **URL** | [rent.tsunami-events.de](https://rent.tsunami-events.de) |

#### 🔑 Haupt-Features

1. **Job-/Event-Management** — Erstellung, Planung und Verwaltung von Veranstaltungen mit vollständigem Lebenszyklus (Angebot → Auftrag → Abrechnung)
2. **Device-/Equipment-Verwaltung** — Katalogisierung und Verwaltung aller Mietgeräte mit Barcode-/QR-Code-Identifikation
3. **Kundenmanagement** — Vollständige CRM-Funktionalität mit Microsoft 365-Synchronisation für Kontaktdaten
4. **PDF-Rechnungsextraktion (OCR)** — Automatische Extraktion von Rechnungsdaten aus PDF-Dokumenten mittels optischer Zeichenerkennung
5. **Deutsche DIN-5008-Rechnungserstellung** — Erstellung normgerechter Rechnungen nach DIN 5008 direkt aus dem System
6. **RBAC + WebAuthn/2FA** — Rollenbasierte Zugriffskontrolle mit hardwaregestützter Zwei-Faktor-Authentifizierung
7. **Nextcloud WebDAV File-Pool** — Integration mit Nextcloud für zentrale Dateiablage und Dokumentenmanagement
8. **Dashboard mit Widgets** — Konfigurierbare Dashboard-Ansicht mit Status-Übersichten, Statistiken und KPIs

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET/POST` | `/api/jobs` | Jobs auflisten / erstellen |
| `GET/PUT/DELETE` | `/api/jobs/:id` | Job abrufen / aktualisieren / löschen |
| `GET/POST` | `/api/devices` | Geräte auflisten / erstellen |
| `GET/PUT/DELETE` | `/api/devices/:id` | Gerät abrufen / aktualisieren / löschen |
| `GET/POST` | `/api/customers` | Kunden auflisten / erstellen |
| `POST` | `/api/invoices` | Rechnung erstellen (DIN 5008 PDF) |
| `POST` | `/api/invoices/extract` | PDF-Rechnungsextraktion via OCR |
| `GET` | `/api/dashboard` | Dashboard-Widgets & KPIs |

---

### warehousecore

> **Lagerverwaltung, Kommissionierung & Geräte-Tracking**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Professionelles Warehouse-Management mit Barcode-Scanning, Zonenlogik und IoT-gestützter Kommissionierung |
| **Tech-Stack** | Go (Backend) + React/TypeScript (Frontend) |
| **Docker Image** | `warehousecore` |
| **Interner Port** | `8082` |
| **URL** | [warehouse.tsunami-events.de](https://warehouse.tsunami-events.de) |

#### 🔑 Haupt-Features

1. **Geräteverwaltung mit QR/Barcode** — Vollständige Inventarisierung aller Geräte mit QR- und Barcode-Identifikation für schnelles Scannen
2. **Zonenmanagement** — Flexible Lagerzonen-Definition und -Verwaltung für optimierte Lagerorganisation
3. **Job-Picklisten mit Barcode-Scan** — Automatisch generierte Picklisten für Veranstaltungsaufträge mit Barcode-basierter Bestätigung
4. **LED-Bin-Highlighting via MQTT** — IoT-gestützte optische Kommissionierhilfe: Lagerfächer leuchten per MQTT-Signal auf
5. **Case-/Kistenmanagement** — Verwaltung von Transportkisten, Cases und Verpackungseinheiten mit Tracking
6. **Defekt- und Wartungsmanagement** — Erfassung von Defekten, Reparaturhistorie und Wartungszyklen
7. **Label-Generierung** — Automatische Erstellung von Geräte- und Kistenlabels für Drucker
8. **Produkt-/Paketverwaltung** — Gruppierung von Geräten in Produkte und Versandpakete

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET/POST` | `/api/devices` | Geräte auflisten / erstellen |
| `GET/PUT` | `/api/devices/:id` | Gerät abrufen / aktualisieren |
| `GET/POST` | `/api/zones` | Zonen auflisten / erstellen |
| `GET/POST` | `/api/picklists` | Picklisten auflisten / generieren |
| `POST` | `/api/picklists/:id/scan` | Barcode-Scan auf Pickliste bestätigen |
| `POST` | `/api/mqtt/highlight` | MQTT-LED-Highlighting auslösen |
| `GET/POST` | `/api/defects` | Defekte auflisten / melden |
| `POST` | `/api/labels` | Label generieren & drucken |

---

### plannercore

> **Aufgabenplanung, Kanban-Boards & Team-Kollaboration**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Projektplanung und Aufgabenverwaltung mit Kanban-Boards, Team-Zuweisungen und Benachrichtigungen |
| **Tech-Stack** | Node.js (Backend) + React (Frontend) |
| **Docker Image** | `plannercore` |
| **Interner Port** | `8083:8080` |
| **URL** | [planner.tsunami-events.de](https://planner.tsunami-events.de) |

#### 🔑 Haupt-Features

1. **Plan-Management (Kanban-Boards)** — Flexible Kanban-Boards für Projektplanung mit visueller Aufgabenverfolgung
2. **Task-Management mit Zuweisung** — Aufgaben mit Verantwortlichkeiten, Prioritäten und Status-Tracking
3. **Bucket/Kanban-Spalten** — Frei definierbare Kanban-Spalten (Buckets) für individuelle Workflows
4. **Checklisten** — Aufgaben mit detaillierten Checklisten für schrittweise Abarbeitung
5. **Kommentare** — Aufgabenbezogene Diskussionen und Notizen mit Timeline-Ansicht
6. **Datei-Anhänge** — Dokumenten-Upload und Verlinkung direkt an Aufgaben
7. **Benachrichtigungen** — In-App- und E-Mail-Benachrichtigungen bei Änderungen und Fälligkeiten
8. **Fälligkeits-Scheduler** — Automatische Deadline-Überwachung mit Eskalationslogik

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET/POST` | `/api/plans` | Pläne auflisten / erstellen |
| `GET/PUT/DELETE` | `/api/plans/:id` | Plan abrufen / aktualisieren / löschen |
| `GET/POST` | `/api/plans/:id/tasks` | Tasks eines Plans auflisten / erstellen |
| `GET/PUT` | `/api/tasks/:id` | Task abrufen / aktualisieren |
| `POST` | `/api/tasks/:id/comments` | Kommentar zu Task hinzufügen |
| `POST` | `/api/tasks/:id/attachments` | Dateianhang zu Task hochladen |
| `GET` | `/api/notifications` | Benachrichtigungen abrufen |
| `GET` | `/api/admin/users` | Admin: Benutzerverwaltung |

---

## Architektur

### 🏛️ System-Architektur

```
                          ┌──────────────────────────────┐
                          │     NPM Reverse Proxy        │
                          │   (nginxproxymanager)        │
                          │         auf docker03         │
                          └──────┬──────────┬────────────┘
                                 │          │
                 ┌───────────────┤          ├──────────────┐
                 │               │          │              │
          ┌──────▼──────┐ ┌─────▼─────┐ ┌──▼────────┐ ┌──▼──────────┐
          │ cores.      │ │ rent.     │ │ warehouse.│ │ planner.    │
          │ tsunami-    │ │ tsunami-  │ │ tsunami-  │ │ tsunami-    │
          │ events.de   │ │ events.de │ │ events.de │ │ events.de   │
          └──────┬──────┘ └─────┬─────┘ └──┬────────┘ └──┬──────────┘
                 │              │           │             │
          ┌──────▼──────────────▼───────────▼─────────────▼──────┐
          │                  cores-dashboard                     │
          │              (API Gateway + SSO)                     │
          │                    Port 8080                         │
          └──┬──────────┬────────────┬─────────────┬────────────┘
             │          │            │             │
      ┌──────▼──┐ ┌────▼────┐ ┌─────▼──────┐ ┌───▼──────────┐
      │ Proxy   │ │ Proxy   │ │ Proxy      │ │ SPA Proxy    │
      │ rental  │ │ whouse  │ │ planner    │ │ (plannercore │
      │ :8081   │ │ :8082   │ │ :8083      │ │  Frontend)   │
      └─────────┘ └─────────┘ └────────────┘ └──────────────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │   (Shared)  │
                    └─────────────┘
```

### 🔄 Datenfluss & Service-Interaktion

1. **Client → NPM Reverse Proxy**: Alle eingehenden Anfragen werden über den Nginx Proxy Manager auf `docker03` geroutet
2. **NPM → cores-dashboard**: Als zentraler Entrypoint empfängt das Dashboard alle API- und Frontend-Anfragen
3. **dashboard → Backend-Services**: Das Dashboard fungiert als API-Gateway und proxyed Anfragen an die jeweiligen Services
4. **SSO-Authentifizierung**: cores-dashboard stellt JWT-Tokens aus und validiert diese für alle Backend-Services
5. **Shared Branding**: Alle Services beziehen Logos, Themes und Branding-Konfiguration vom zentralen Branding-Endpunkt
6. **Shared PostgreSQL**: Gemeinsame Datenbank-Instanz für konsistente Datenhaltung

### 🔗 Service-Abhängigkeiten

```
cores-dashboard ──► PostgreSQL (Auth + Config)
                  ├─► rentalcore (Proxy)
                  ├─► warehousecore (Proxy)
                  └─► plannercore (Proxy + SPA)

rentalcore ───────► PostgreSQL (Data)
                  ├─► M365 API (Kunden-Sync)
                  ├─► Nextcloud WebDAV (Files)
                  └─► cores-dashboard (SSO Validate)

warehousecore ────► PostgreSQL (Data)
                  ├─► MQTT Broker (Mosquitto)
                  └─► cores-dashboard (SSO Validate)

plannercore ──────► PostgreSQL (Data)
                  ├─► SMTP (E-Mail)
                  └─► cores-dashboard (SSO Validate)
```

---

## Repository-Struktur

```
cores/                              # Monorepo Root
├── docker-compose.yml              # Gesamt-Deployment-Konfiguration
├── .env.example                    # Beispiel-Umgebungsvariablen
├── cores-dashboard/                # Submodule: Dashboard + Auth
├── rentalcore/                     # Submodule: Vermietung
├── warehousecore/                  # Submodule: Lager
├── plannercore/                    # Submodule: Planung
├── shared/                         # Geteilte Ressourcen
│   ├── logos/                      # Zentrales Logo- & Branding-Material
│   ├── migrations/                 # Datenbank-Migrationen (alle Services)
│   ├── theme/                      # Gemeinsame Theme-Dateien (CSS, Templates)
│   └── scripts/                    # Gemeinsame Utility-Scripts
└── README.md                       # Diese Datei
```

---

## Installation & Deployment

### 📦 Voraussetzungen

| Komponente | Version | Zweck |
|------------|---------|-------|
| **Docker** | ≥ 24.0 | Container-Runtime |
| **Docker Compose** | ≥ 2.20 | Multi-Container-Orchestrierung |
| **PostgreSQL** | ≥ 16 | Gemeinsame Datenbank |
| **Nginx Proxy Manager (NPM)** | latest | Reverse Proxy & SSL-Terminierung |
| **Mosquitto (MQTT)** | ≥ 2.0 | IoT-Kommunikation für Warehouse-Highlighting |

### 🚀 Schritt-für-Schritt-Installation

#### 1. Repository klonen (mit allen Submodules)

```bash
git clone --recurse-submodules git@github.com:nbt4/cores.git
cd cores
```

Falls das Repository bereits ohne Submodules geklont wurde:

```bash
git submodule update --init --recursive
```

#### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
# Bearbeiten Sie .env mit Ihren spezifischen Werten:
nano .env
```

**Wichtige Umgebungsvariablen:**

```env
# PostgreSQL
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=cores
POSTGRES_USER=cores_user
POSTGRES_PASSWORD=your-secure-password

# JWT Secret (für SSO)
JWT_SECRET=your-jwt-secret-key-min-32-chars

# Service-URLs
DASHBOARD_URL=https://cores.tsunami-events.de
RENTAL_URL=https://rent.tsunami-events.de
WAREHOUSE_URL=https://warehouse.tsunami-events.de
PLANNER_URL=https://planner.tsunami-events.de

# MQTT (Warehouse LED-Highlighting)
MQTT_BROKER=mosquitto
MQTT_PORT=1883

# SMTP (E-Mail-Benachrichtigungen)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@tsunami-events.de
SMTP_PASSWORD=your-smtp-password

# Nextcloud (rentalcore File-Pool)
NEXTCLOUD_URL=https://nextcloud.tsunami-events.de
NEXTCLOUD_USER=rentalcore-user
NEXTCLOUD_PASSWORD=your-nextcloud-password

# M365 (Kunden-Synchronisation)
M365_TENANT_ID=your-tenant-id
M365_CLIENT_ID=your-client-id
M365_CLIENT_SECRET=your-client-secret
```

#### 3. Docker-Container starten

```bash
# Alle Services starten
docker compose up -d

# Logs überwachen
docker compose logs -f

# Einzelnen Service neustarten
docker compose restart rentalcore
```

**Verfügbare Docker-Services:**

| Service | Container-Name | Port | Health Check |
|---------|---------------|------|-------------|
| `dashboard` | cores-dashboard | 8080 | `/api/health` |
| `rentalcore` | rentalcore | 8081 | `/api/health` |
| `warehousecore` | warehousecore | 8082 | `/api/health` |
| `plannercore` | plannercore | 8083 | `/api/health` |
| `postgres` | cores-postgres | 5432 | `pg_isready` |
| `mosquitto` | cores-mosquitto | 1883 | MQTT Connect |

#### 4. NPM Reverse Proxy einrichten

Für jeden Service einen **Proxy Host** im Nginx Proxy Manager anlegen:

| Domain | Forward Host | Forward Port | SSL |
|--------|-------------|-------------|-----|
| `cores.tsunami-events.de` | `cores-dashboard` | `8080` | ✅ Force SSL |
| `rent.tsunami-events.de` | `cores-dashboard` | `8080` | ✅ Force SSL |
| `warehouse.tsunami-events.de` | `cores-dashboard` | `8080` | ✅ Force SSL |
| `planner.tsunami-events.de` | `cores-dashboard` | `8080` | ✅ Force SSL |

> **Hinweis:** Alle Domains zeigen auf `cores-dashboard:8080`, da das Dashboard als zentraler API-Gateway und Reverse-Proxy fungiert und Anfragen intern an die jeweiligen Services weiterleitet.

#### 5. Deployment via Komodo (docker03)

Das Produktions-Deployment erfolgt über **Komodo** auf dem Host `docker03`:

```bash
# Auf docker03 via Komodo ausgeführt:
cd /opt/stacks/cores
git pull --recurse-submodules
docker compose pull
docker compose up -d --force-recreate
```

---

## Entwicklung

### 🔧 Mit Submodules arbeiten

Jeder Service ist ein eigenständiges Git-Repository und wird als Submodule eingebunden.

```bash
# Alle Submodules auf den neuesten Stand bringen
git submodule update --remote --recursive

# In einem Submodule arbeiten
cd rentalcore
git checkout main
# ... Änderungen vornehmen ...
git add .
git commit -m "feat: neue Funktion X"
git push origin main

# Zurück im Monorepo: Submodule-Update committen
cd ..
git add rentalcore
git commit -m "chore: rentalcore auf neuesten Stand aktualisiert"
git push
```

### 🖥️ Lokale Entwicklungsumgebung

Für die lokale Entwicklung einzelner Services:

```bash
# Nur die benötigten Services starten
docker compose up -d postgres mosquitto

# Service-spezifisch entwickeln (Beispiel: rentalcore)
cd rentalcore
# Backend (Go)
cd backend
go run ./cmd/server

# Frontend (React/TypeScript)
cd ../frontend
npm install
npm run dev
```

### 📁 Shared Resources

Das `shared/`-Verzeichnis enthält monorepo-weite Ressourcen:

- **logos/** — Logo-Varianten (SVG, PNG) für alle Services und das zentrale Branding
- **migrations/** — Datenbank-Migrationsdateien, die von allen Services verwendet werden
- **theme/** — Gemeinsame CSS-Variablen, Farbpaletten und UI-Templates
- **scripts/** — Hilfsskripte für Entwicklung, Deployment und Wartung

---

## Branding-System

### 🎨 Zentrales Branding-Management

Das Cores-Ökosystem verfügt über ein **zentrales Branding-System**, das ein konsistentes Erscheinungsbild über alle Services sicherstellt.

#### Funktionsweise

1. **Branding-Konfiguration** wird im cores-dashboard verwaltet (Admin-Bereich)
2. **Services laden** ihre Branding-Einstellungen beim Start vom zentralen `/api/branding`-Endpunkt
3. **Änderungen** werden live übernommen — kein Neustart der Services erforderlich

#### Verwaltete Branding-Elemente

| Element | Beschreibung |
|---------|-------------|
| **Logo (Light/Dark)** | Primäres Logo für Header und Login-Seiten |
| **Favicon** | Browser-Tab-Icon für alle Services |
| **Farbpalette** | Primary, Secondary, Accent-Farben (HEX) |
| **Schriftart** | Primäre und sekundäre Schriftfamilie |
| **E-Mail-Template** | Absender-Name, Footer, Farben für System-E-Mails |
| **Footer-Text** | Copyright, Links, Unternehmensdaten |

#### Implementierung

```typescript
// Alle Services laden Branding beim Initialisieren:
const branding = await fetch('/api/branding', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => res.json());

// CSS Custom Properties setzen
document.documentElement.style.setProperty('--color-primary', branding.colors.primary);
document.documentElement.style.setProperty('--logo-url', `url(${branding.logo})`);
```

---

## Security

### 🔐 Sicherheitsarchitektur

#### JWT-basiertes Single-Sign-On (SSO)

- **Ausstellung**: cores-dashboard stellt signierte JWT-Access-Tokens und Refresh-Tokens aus
- **Validierung**: Alle Backend-Services validieren Tokens gegen den zentralen `/api/auth/validate`-Endpunkt
- **Token-Lebensdauer**:
  - Access-Token: 15 Minuten
  - Refresh-Token: 7 Tage
- **Signatur**: HMAC-SHA256 mit serverseitigem Secret

#### Rollenbasierte Zugriffskontrolle (RBAC)

```
Admin           ──► Voller Zugriff auf alle Services
Event-Manager   ──► Jobs, Kunden, Rechnungen verwalten
Warehouse-Mgr   ──► Lager, Geräte, Picklisten verwalten
Planner         ──► Pläne und Tasks verwalten
Viewer          ──► Lesezugriff auf zugewiesene Bereiche
```

#### Zusätzliche Sicherheitsfeatures

| Feature | Beschreibung |
|---------|-------------|
| **WebAuthn / FIDO2** | Hardware-gestützte 2FA für Admin-Konten (rentalcore) |
| **TOTP 2FA** | Zeitbasierte Einmalpasswörter für erhöhte Sicherheit |
| **TLS 1.3** | Verschlüsselte Kommunikation via NPM Reverse Proxy (Let's Encrypt) |
| **Rate Limiting** | Schutz vor Brute-Force-Angriffen auf Login-Endpunkte |
| **CORS Policy** | Strikte Cross-Origin-Richtlinien für API-Endpunkte |
| **Input Sanitization** | Validierung aller Benutzereingaben gegen XSS und SQL-Injection |
| **Audit Logging** | Protokollierung sicherheitsrelevanter Aktionen |

---

## Technologie-Stack

### ⚙️ Zusammenfassung

| Bereich | Technologie |
|---------|------------|
| **Backend (Dashboard, Rental, Warehouse)** | Go 1.22+ |
| **Backend (Planner)** | Node.js 20+ |
| **Frontend (alle Services)** | React 18+ mit TypeScript |
| **Datenbank** | PostgreSQL 16+ |
| **Container** | Docker + Docker Compose |
| **Reverse Proxy** | Nginx Proxy Manager (NPM) |
| **IoT/MQTT** | Eclipse Mosquitto 2.0+ |
| **Authentifizierung** | JWT (HS256) |
| **2FA** | WebAuthn, TOTP |
| **Dateiablage** | Nextcloud WebDAV |
| **Deployment** | Komodo (docker03) |
| **Monitoring** | Docker Health Checks + Service-Endpunkte |

---

## Betrieb & Wartung

### 📊 Monitoring

```bash
# Service-Status prüfen
docker compose ps

# Health-Checks
curl https://cores.tsunami-events.de/api/health
curl https://rent.tsunami-events.de/api/health
curl https://warehouse.tsunami-events.de/api/health
curl https://planner.tsunami-events.de/api/health

# Ressourcen-Nutzung
docker stats
```

### 🔄 Updates

```bash
# Alle Submodules und Images aktualisieren
git pull --recurse-submodules
docker compose pull
docker compose up -d --force-recreate

# Alte Docker-Images bereinigen
docker image prune -a
```

### 💾 Backup

```bash
# PostgreSQL-Dump
docker exec cores-postgres pg_dump -U cores_user cores > backup_$(date +%Y%m%d).sql

# Volume-Backup (Uploads, Logs)
tar -czf cores_data_$(date +%Y%m%d).tar.gz /var/lib/docker/volumes/cores_*
```

### 🐛 Fehlerbehebung

```bash
# Logs eines bestimmten Services
docker compose logs rentalcore -f --tail=100

# Container-Shell öffnen
docker exec -it rentalcore sh

# Datenbank verbinden
docker exec -it cores-postgres psql -U cores_user -d cores

# Docker-Netzwerk prüfen
docker network inspect cores_default
```

---

## 📄 Lizenz

**Proprietär** — Alle Rechte vorbehalten.  
© Tsunami Events — [tsunami-events.de](https://tsunami-events.de)

---

> **Cores** — Das Herzstück von Tsunami Events.  
> *Built with ❤️ for event professionals.*
