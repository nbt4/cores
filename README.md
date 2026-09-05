# 🏗️ Cores — Tsunami Events Management System

> **Monorepo für das Cores-Ökosystem**  
> Vollständige Management-Plattform bestehend aus fünf Core-Services, einer MCP-KI-Anbindung, zentraler Authentifizierung, einheitlichem Branding und Shared Infrastructure.

## Einheitliches Designsystem

Alle Oberflächen der Cores Suite verwenden ein verbindliches Designsystem für Farbpalette, Inter-Typografie, Größenleiter, Shell/Sidebar, Tabellen, Formulare, Selects, Dropdowns, Scrollbars, Karten, Responsive-Verhalten und Dashboards. Die vollständige Spezifikation steht in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md); Marken- und Logoregeln stehen ergänzend in [`docs/BRANDING.md`](docs/BRANDING.md).

Die kanonischen Implementierungen liegen in `theme/tsunami-theme.css` und `theme/cores-design.ts`. Service-Kopien werden nicht direkt geändert:

```bash
./scripts/sync-design-system.sh
./scripts/check-design-system.sh
```

Jede neue oder überarbeitete UI muss diese Prüfung sowie den jeweiligen Frontend-Build bestehen. Die Regel ist zusätzlich in den `AGENTS.md`-Dateien der Suite und ihrer Services verankert.

Aktueller Suite-Release (05.09.2026):

| Service | Image |
|---|---|
| Cores Dashboard | `nobentie/cores-dashboard:1.14.31` |
| RentalCore | `nobentie/rentalcore:5.3.98` |
| WarehouseCore | `nobentie/warehousecore:5.9.71` |
| PlannerCore | `nobentie/plannercore:2.6.20` |
| ProcurementCore | `nobentie/procurementcore:1.0.28` |
| Cores MCP | `nobentie/cores-mcp:1.1.1` |
| Datenbanksicherung | `nobentie/cores-backup:1.0.0` |

Compose verwendet feste Release-Tags. `cores-common:v1.2.0` stellt die aktuelle
Sitzungsprüfung für Dashboard und ProcurementCore bereit: Kontosperren und
Administratoränderungen gelten auch für bestehende Tokens ab der nächsten Anfrage.
MCP prüft aktive Konten bei jedem OAuth-Zugriff und beschränkt alle Planner-Abfragen
auf die Mitgliedschaften des angemeldeten Nutzers, einschließlich Suche und Kennzahlen.
Maschinentokens erhalten keine privaten Planner-Daten.

Der Backupdienst stellt jeden Dump in einem temporären PostgreSQL-Cluster wieder
her, bevor er Erfolg meldet. Optional lädt er Dump und Prüfsumme in eine dedizierte
Nextcloud-Collection hoch. Konfiguration und Grenzen: [Backup-Dokumentation](backup/README.md).
Die [GitHub-Prüfung](.github/workflows/verify.yml) baut alle fünf Frontends, testet
alle sieben Go-Module und prüft Planner-Isolation, Backups, Designsystem und Release-Inventar.
Technische Zuständigkeiten und weitere Architekturarbeit stehen in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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
  - [procurementcore](#procurementcore)
- [Architektur](#architektur)
- [Globales Routing](#globales-routing)
- [Repository-Struktur](#repository-struktur)
- [Installation & Deployment](#installation--deployment)
- [Entwicklung](#entwicklung)
- [Branding-System](#branding-system)
- [Security](#security)
- [Technologie-Stack](#technologie-stack)
- [Betrieb & Wartung](#betrieb--wartung)

---

## Projektübersicht

**Cores** ist das zentrale Management-Ökosystem von **Tsunami Events**. Fünf Core-Services decken Planung, Vermietung, Lager, Einkauf und zentrale Administration ab.

Das System wurde als **Monorepo** konzipiert, um eine einheitliche Codebasis mit geteilten Ressourcen, zentralem Branding und konsistenter Authentifizierung über alle Dienste hinweg zu ermöglichen.

## Globales Routing

`CORES_ROUTING_MODE` entscheidet einmal für das gesamte Deployment zwischen
`paths` und `subdomains`; ein Mischbetrieb ist ausgeschlossen. Der vollständige
Stack verwendet standardmäßig `paths` und stellt die Apps unter
`/rentalcore/`, `/warehousecore/`, `/plannercore/` und `/procurementcore/` auf
der Dashboard-Domain bereit. Mit `subdomains` verlinkt das Dashboard stattdessen
die vier `*_PUBLIC_URL`-Werte. Details und Reverse-Proxy-Beispiele stehen in
[`docs/ROUTING.md`](docs/ROUTING.md).

### 🎯 Kernziele

- **Zentrales SSO** — Ein Login gilt für Dashboard, RentalCore, WarehouseCore, PlannerCore und ProcurementCore
- **Ein Loginfenster** — Jeder Core leitet unauthentifizierte Nutzer zu `cores.tsunami-events.de/login`; lokale und Microsoft-Anmeldung führen anschließend zur ursprünglich geöffneten Core-Ansicht zurück
- **Flexible Benutzerquellen** — Lokale, Microsoft-Entra- oder hybride Benutzerverwaltung mit gruppenbasierter Synchronisation
- **Einheitliches Branding** — Zentral verwaltetes Theme- und Logo-System
- **Shared Infrastructure** — Gemeinsame PostgreSQL-Datenbank, zentrales Reverse-Proxying
- **Installierbare Mobile-Apps** — Alle fünf Oberflächen laufen als touchoptimierte PWAs mit Standalone-Modus, Safe Areas und App-Navigation; im globalen Pfadmodus bleiben alle Cores unter `/rentalcore/`, `/warehousecore/`, `/plannercore/` und `/procurementcore/` innerhalb der installierten Cores-PWA ohne externe iOS-Browserleiste
- **Docker-basiertes Deployment** — Vollständig containerisiert mit docker-compose
- **Git Submodules** — Jeder Service ist ein eigenständiges Repository, eingebunden als Submodule

---

## Services im Detail

---

### cores-dashboard

> **Zentraler Einstiegspunkt & Authentifizierungs-Hub**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Organisationsweites Operations-Cockpit, zentrale SSO-Authentifizierung, API-Reverse-Proxy, Branding-Management und Administration |
| **Tech-Stack** | Go (Backend) + React/TypeScript (Frontend) |
| **Docker Image** | `cores-dashboard` |
| **Interner Port** | `8080` |
| **URL** | [cores.tsunami-events.de](https://cores.tsunami-events.de) |

#### 🔑 Haupt-Features

1. **Zentrale JWT-Authentifizierung (SSO)** — Single-Sign-On für alle Cores-Services mit Token-basierter Authentifizierung
2. **Live-Operations-Cockpit** — Priorisiertes Lagebild mit Umsatz, aktiven Jobs, Lagerbereitschaft, Rückläufen, persönlichen Planner-Aufgaben, Beschaffungsfreigaben und direkten Arbeitswegen
3. **Plattformgesundheit** — Parallele Healthchecks aller fünf Cores-Dienste und PostgreSQL mit Versionen, Antwortzeiten und teilfehlertoleranter Darstellung
4. **API Reverse-Proxy** — Intelligentes Routing an RentalCore, WarehouseCore und PlannerCore
5. **Admin Branding-Management** — Zentrale Verwaltung von Logos, Farben, Themes und Branding-Einstellungen für alle Services
6. **Konfigurations-Endpunkt** — Bereitstellung globaler Konfigurationen für alle verbundenen Services
7. **SPA-Proxys für RentalCore und Plannercore** — Auslieferung beider Single-Page-Applications unter `/rental/` und `/planner/` über das Dashboard
8. **Benutzerverwaltung** — Zentrale lokale/Microsoft-/Hybrid-Benutzerverwaltung; Microsoft-Stammdaten read-only, Cores-Rollen weiterhin lokal pflegbar
9. **Microsoft 365 & Entra** — Eine zentral konfigurierte Tenant-App für Microsoft-Login, Gruppen-Sync sowie RentalCore-Kontakte und -Kalender
10. **Installierbare Mobile-App** — Responsive Admin-PWA mit eigenem Icon, Safe Areas, Touch-Zielen, Drawer und fester App-Tabbar

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `POST` | `/api/v1/auth/login` | SSO-Login mit JWT-Cookie |
| `POST` | `/api/v1/auth/logout` | Sitzung beenden |
| `GET` | `/api/v1/auth/me` | Angemeldeten Benutzer abrufen |
| `GET` | `/api/v1/config` | Globale Konfiguration und Cross-Links abrufen |
| `GET` | `/api/v1/branding` | Öffentliche Branding-Einstellungen |
| `GET` | `/api/v1/analytics/summary` | Cores-Lagebild, Prioritäten und Servicezustand |
| `GET` | `/api/v1/admin/health` | Service-Versionen und Antwortzeiten (Admin) |
| `*` | `/api/v1/proxy/rental/*` | Proxy zu RentalCore |
| `*` | `/api/v1/proxy/warehouse/*` | Proxy zu WarehouseCore |
| `*` | `/api/v1/proxy/planner/*` | Proxy zu PlannerCore |

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

1. **Job-/Event-Management** — Verbindlicher Lebenszyklus `Planung → Bestätigt → Abgeschlossen` mit `Storniert` als Abbruch; Packfortschritt, Datumsaktivität, Geräterücklauf und Abrechnung bleiben getrennte Dimensionen
2. **Device-/Equipment-Verwaltung** — Katalogisierung und Verwaltung aller Mietgeräte mit Barcode-/QR-Code-Identifikation
3. **Kundenmanagement** — Vollständige CRM-Funktionalität mit Microsoft 365-Synchronisation für Kontaktdaten
4. **PDF-Rechnungsextraktion (OCR)** — Automatische Extraktion von Rechnungsdaten aus PDF-Dokumenten mittels optischer Zeichenerkennung
5. **Deutsche DIN-5008-Rechnungserstellung** — Erstellung normgerechter Rechnungen nach DIN 5008 direkt aus dem System
6. **RBAC + WebAuthn/2FA** — Rollenbasierte Zugriffskontrolle mit hardwaregestützter Zwei-Faktor-Authentifizierung
7. **Nextcloud WebDAV File-Pool** — Integration mit Nextcloud für zentrale Dateiablage und Dokumentenmanagement
8. **Dashboard mit Widgets** — Konfigurierbare Dashboard-Ansicht mit Status-Übersichten, Statistiken und KPIs
9. **Installierbare Mobile-App** — RentalCore bietet im Standalone-Modus Safe Areas, große Touch-Ziele, Drawer und eine feste App-Tabbar

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

1. **Geräteverwaltung mit QR/Barcode** — Vollständige Inventarisierung mit getrenntem, workflowgeführtem Lagerstatus und unabhängigem Betriebszustand samt automatischer Statushistorie
2. **Live-Lagercockpit** — Priorisierte Aufgaben, Einsatzbereitschaft, Materialfluss, Tagesbewegungen, aktive Jobs, Case-Prozesse und technische Risiken mit automatischer Aktualisierung
3. **Professionelle Lagersteuerung** — Hierarchische Standorte bis zum Fach mit Prozessrollen, Sperrzuständen, Kapazitäten, Pick-Reihenfolge, Arbeitsvorrat und scannerbasierter Blind-/Zählinventur
4. **Geführte Job- und Lager-Scans** — Nur bestätigte Jobs können ausgegeben werden; Ausgaben führen von Job zu Artikel, Einlagerungen von Artikel zu Lagerplatz, Mengenartikel besitzen ein eigenes Mengenfeld und Rückgaben werden physisch bestätigt
5. **LED-Bin-Highlighting via MQTT** — IoT-gestützte optische Kommissionierhilfe: Lagerfächer leuchten per MQTT-Signal auf
6. **Dynamische Handling Units** — Euroboxen, Flightcases und Kits frei oder nach Soll-Inhalt packen; Geräte, Mengenartikel und Untercases scannen, versiegeln, gesammelt ausgeben und zurücklagern
7. **Defekt- und Wartungsmanagement** — Erfassung von Defekten, Reparaturhistorie und Wartungszyklen
8. **Label Studio & Direktdruck** — Visueller Designer und Seriendruck für Geräte-, Kabel-, Case- und Zonenlabels; persistente PDF-Master beschleunigen Export und Browserdruck, Zebra-ZPL-Direktdruck erfolgt über TCP
9. **Produktstammdaten 2.0** — Getrennte Produktklasse, Zubehörrolle und Bestandsführung; transaktionale Anlage mit initialen Devices, global unveränderliche Produkt-/Device-/Case-Barcodes, Scan-Aliase, typisierte Zubehörbeziehungen, Case-Modelle und automatisch kategorisierte Kabelprodukte
10. **Procurement-Verknüpfung** — Bestehende Produkte automatisch vorgeschlagen oder manuell eindeutig abgleichen, Procurement-Artikel vollständig vorausgefüllt im Warehouse anlegen und Lagerbedarf direkt als Einkaufsentwurf melden
11. **Installierbare Mobile-App** — WarehouseCore bietet im Standalone-Modus Safe Areas, große Touch-Ziele, Drawer und eine feste App-Tabbar

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET/POST` | `/api/devices` | Geräte auflisten / erstellen |
| `GET/PUT` | `/api/devices/:id` | Gerät abrufen / aktualisieren |
| `GET` | `/api/devices/:id/status-history` | Lagerstatus-, Zustands- und Ortsänderungen nachvollziehen |
| `GET/POST` | `/api/zones` | Zonen auflisten / erstellen |
| `GET/POST` | `/api/warehouse/locations` | Lagerstruktur steuern |
| `GET/POST` | `/api/warehouse/counts` | Zählinventuren verwalten |
| `GET/POST` | `/api/handling-units` | Dynamische und feste Cases verwalten |
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
3. **Bucket/Kanban-Spalten** — Frei definierbare Kanban-Spalten (Buckets), die per Drag-and-drop nach links und rechts verschoben und dauerhaft synchronisiert werden
4. **Checklisten** — Aufgaben mit detaillierten Checklisten für schrittweise Abarbeitung
5. **Kommentare** — Aufgabenbezogene Diskussionen und Notizen mit Timeline-Ansicht
6. **Datei-Anhänge** — Dokumenten-Upload und Verlinkung direkt an Aufgaben
7. **Benachrichtigungen** — In-App- und E-Mail-Benachrichtigungen bei Änderungen und Fälligkeiten
8. **Fälligkeits-Scheduler** — Automatische Deadline-Überwachung mit Eskalationslogik
9. **Installierbare Mobile-App** — PlannerCore bietet Safe Areas, Touch-Drag-and-drop, eine mobile App-Tabbar und funktioniert eigenständig sowie unter `/planner/`

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

### procurementcore

> **Einkaufsplanung, Lieferantensteuerung & Beschaffung**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Bedarf, Sourcing, Preisüberwachung, Bestellungen und Wareneingänge |
| **Tech-Stack** | Go + React/TypeScript |
| **Docker Image** | `nobentie/procurementcore` |
| **Interner Port** | `8084` |
| **Öffentliche URL** | `https://procurement.tsunami-events.de` |
| **Docker03 Host-Port** | `8084` |

#### 🔑 Haupt-Features

1. Parametrisierbarer Beschaffungskatalog mit visuellem Schema-Editor und technischen Filtern
2. Sicherer Artikelimport aus Produktlinks mit JSON-LD, schema.org-Microdata und OpenGraph sowie eigenen Adaptern für Adam Hall, LTT, Huss, Thomann, Steinigke, Eurobox- und Casebau-Shops; Vorschau, Originalattribute, Kategorieparameter und optionale Adam-Hall-Kundenpreise bleiben prüfbar
3. Preferred Supplier, Bewertungen, Risiken, Konditionen und Lieferzeiten
4. Bezugsquellen mit Preisverlauf, Mindestmengen und direkten Einkaufslinks
5. Tiefpreis-Alarme gegen persönliche Zielpreise
6. Bedarfsmeldungen mit Einreichungs- und Freigabeprozess
7. Angebots-/Lieferantenvergleich und Übernahme des besten gepflegten Preises
8. Bestehende Einkaufsartikel mit Warehouse-Produkten über EAN, Artikelnummer, Modell, Hersteller und Name abgleichen oder in den vollständigen Warehouse-Produktdialog übernehmen
9. Bestellungen, Teilwareneingänge und vollständige Empfangsverfolgung
10. Spend-, Einsparungs- und Aktivitätsübersicht sowie CSV-Export
11. Cores-SSO, zentrales Branding, responsive Oberfläche und Health-Monitoring

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET/POST` | `/api/v1/products` | Katalog suchen / Artikel anlegen |
| `GET` | `/api/v1/product-links` | Procurement- und Warehouse-Produkte abgleichen |
| `GET/POST` | `/api/v1/suppliers` | Lieferanten auflisten / anlegen |
| `GET/POST` | `/api/v1/alerts` | Tiefpreis-Alarme verwalten |
| `GET/POST` | `/api/v1/requisitions` | Bedarfsmeldungen verwalten |
| `POST` | `/api/v1/requisitions/:id/decision` | Bedarf freigeben / ablehnen |
| `GET/POST` | `/api/v1/orders` | Bestellungen verwalten |
| `POST` | `/api/v1/orders/:id/receipt` | Wareneingang verbuchen |

---

### cores-mcp

> **Read-only KI- und Agent-Anbindung der vollständigen Suite**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Aktuellen Cores-Kontext per Model Context Protocol für ChatGPT, Claude und Agents bereitstellen |
| **Tech-Stack** | Go + offizielles MCP SDK + Streamable HTTP |
| **Docker Image** | `nobentie/cores-mcp` |
| **Interner Port** | `8090` |
| **Öffentlicher Endpunkt** | `https://cores.tsunami-events.de/mcp` |

Der Dienst umfasst 56 fest definierte Tools für Jobs, Bestand, Geräte, Planung, Beschaffung, Datenqualität und Cross-Core-Entscheidungen sowie fünf geführte Analyse-Prompts und Knowledge-Ressourcen. OAuth nutzt den bestehenden Cores-Login. Es gibt kein beliebiges SQL und keinerlei Schreib-, Bestell- oder Freigabefunktion. Vollständige Dokumentation: [`cores-mcp/README.md`](cores-mcp/README.md).

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
7. **MCP-Anbindung**: Dashboard reicht `/mcp`, OAuth und Discovery unverändert an den read-only Cores-MCP-Dienst weiter

### 🔗 Service-Abhängigkeiten

```
cores-dashboard ──► PostgreSQL (Auth + Config)
                  ├─► rentalcore (Proxy)
                  ├─► warehousecore (Proxy)
                  ├─► plannercore (Proxy + SPA)
                  └─► cores-mcp (MCP + OAuth Proxy)

cores-mcp ─────────► PostgreSQL (Read-only)
                  ├─► Cores Health-Endpunkte
                  └─► freigegebene Knowledge-Dokumente

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
├── cores-common/                   # Submodule: gemeinsame Go-Pakete
├── cores-mcp/                      # Submodule: read-only MCP-KI-Anbindung
├── rentalcore/                     # Submodule: Vermietung
├── warehousecore/                  # Submodule: Lager
├── plannercore/                    # Submodule: Planung
├── procurementcore/                # Submodule: Einkauf
├── shared/                         # Geteilte Ressourcen
│   ├── logos/                      # Zentrales Logo- & Branding-Material
│   ├── migrations/                 # Datenbank-Migrationen (alle Services)
│   ├── theme/                      # Gemeinsame Theme-Dateien (CSS, Templates)
│   └── scripts/                    # Gemeinsame Utility-Scripts
└── README.md                       # Diese Datei
```

### GitHub-Repositories

GitHub unter `github.com/nbt4` ist die einzige Source-of-Truth für den Quellcode.
Zugangsdaten gehören ausschließlich in die lokale Laufzeitumgebung oder einen Secret Manager.

| Komponente | Repository |
|------------|------------|
| Monorepo | [nbt4/cores](https://github.com/nbt4/cores) |
| Dashboard | [nbt4/cores-dashboard](https://github.com/nbt4/cores-dashboard) |
| Gemeinsame Go-Pakete | [nbt4/cores-common](https://github.com/nbt4/cores-common) |
| Cores MCP | [nbt4/cores-mcp](https://github.com/nbt4/cores-mcp) |
| RentalCore | [nbt4/rentalcore](https://github.com/nbt4/rentalcore) |
| WarehouseCore | [nbt4/warehousecore](https://github.com/nbt4/warehousecore) |
| PlannerCore | [nbt4/plannercore](https://github.com/nbt4/plannercore) |
| ProcurementCore | [nbt4/procurementcore](https://github.com/nbt4/procurementcore) |

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
# PostgreSQL (the Compose file starts PostgreSQL automatically)
POSTGRES_DB=rentalcore
POSTGRES_USER=rentalcore
POSTGRES_PASSWORD=your-secure-password

# JWT Secret (für SSO; mindestens 32 Zeichen)
CORES_JWT_SECRET=your-jwt-secret-key-min-32-chars

# Optional Nextcloud File-Pool
NEXTCLOUD_WEBDAV_URL=https://cloud.example.com/remote.php/dav/files/user
NEXTCLOUD_WEBDAV_USER=rentalcore-user
NEXTCLOUD_WEBDAV_PASSWORD=your-nextcloud-app-password
NEXTCLOUD_WEBDAV_BASE_PATH=rentalcore-filepool

# MQTT (Warehouse LED-Highlighting)
LED_MQTT_USER=leduser
LED_MQTT_PASS=your-mqtt-password

# M365 / Microsoft Entra (optional; zentrale App im Dashboard)
M365_TENANT_ID=your-tenant-id
M365_CLIENT_ID=your-client-id
M365_CLIENT_SECRET=your-client-secret
M365_CALENDAR_MAILBOX=events@yourdomain.com
# Must be a real user mailbox; requires Calendars.ReadWrite (Application)
M365_CALENDAR_ORGANIZER=calendar-organizer@yourdomain.com
APP_BASE_URL=https://cores.example.com
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
| `cores-dashboard` | cores-dashboard | 8080 | `/health` |
| `rentalcore` | rentalcore | 8081 | `/health` |
| `warehousecore` | warehousecore | 8082 | `/api/v1/health` |
| `plannercore` | plannercore | 8083 | `/health` |
| `procurementcore` | procurementcore | 8084 | `/health` |
| `postgres` | cores-postgres | 5432 | `pg_isready` |
| `mosquitto` | cores-mosquitto | 1883 | MQTT Connect |

#### 4. NPM Reverse Proxy einrichten

Im standardmäßigen Pfadmodus genügt ein **Proxy Host**:

| Domain | Forward Host | Forward Port | SSL |
|--------|-------------|-------------|-----|
| `cores.tsunami-events.de` | `cores-dashboard` | `8080` | ✅ Force SSL |

Das Dashboard routet die vier Core-Pfade intern. Im Subdomainmodus wird dagegen
jede öffentliche Core-Domain direkt an ihren Service-Port weitergeleitet. Die
vollständige Zuordnung steht in [`docs/ROUTING.md`](docs/ROUTING.md).

#### 5. Deployment via Komodo (docker03)

Das Produktions-Deployment erfolgt über **Komodo** auf dem Host `docker03`:

```bash
# Auf docker03 via Komodo ausgeführt:
cd /opt/docker/komodo/stacks/tscores
git pull --recurse-submodules
docker compose pull
docker compose up -d --force-recreate
```

#### 6. Clean-Install-Smoke-Test

Auf einem neuen Host werden PostgreSQL, Mosquitto, das Branding-Volume und die
Service-Volumes automatisch angelegt. Nach dem Start sollten alle Container
healthy sein:

```bash
docker compose up -d
docker compose ps
curl -fsS http://localhost:8080/health
curl -fsS http://localhost:8081/health
curl -fsS http://localhost:8082/api/v1/health
curl -fsS http://localhost:8083/health
curl -fsS http://localhost:8084/health
```

Die erste Anmeldung erfolgt über `http://localhost:8080/login` mit `admin/admin`;
das Dashboard erzwingt danach die Änderung des Passworts. Für einen wirklich
frischen Test dürfen keine bestehenden Container oder Volumes mit denselben
Compose-Namen vorhanden sein.

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

Das Dashboard verwaltet getrennte Unternehmens- und Produktmarken. Die fünf
Services verwenden semantische Varianten für Bildmarke, horizontales und
gestapeltes Logo, Favicon sowie PWA-Icons. Änderungen werden aus dem gemeinsamen
PostgreSQL-Datensatz und Branding-Volume ohne Neustart übernommen.
Produktlogos stehen ausschließlich in den ein-/ausklappbaren Sidebars: geöffnet
in einer einheitlichen 176 × 48-px-Fläche, eingeklappt als 40 × 40-px-Symbol.
App-Header bleiben logofrei; Browser-Tabs verwenden immer nur das Favicon.

Die verbindliche Matrix „welches Logo wo“ sowie Dateivorgaben und der
Asset-Sync sind im [Cores Brand Guide](docs/BRANDING.md) dokumentiert.

---

## Security

### 🔐 Sicherheitsarchitektur

#### JWT-basiertes Single-Sign-On (SSO)

Das Dashboard ist der einzige interaktive Login-Einstieg. Die Core-Clients
übergeben ihr aktuelles Ziel als `redirect`; das Dashboard prüft es gegen die
eigene Origin und die konfigurierten Core-Origins. Derselbe Rücksprung gilt für
lokale Anmeldung, Microsoft Entra und den Cores-MCP-OAuth-Dialog.

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
