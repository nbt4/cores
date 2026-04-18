# Claude.md  
**Global configuration and development rules for the Tsunami Events project cluster**  
Projects:  
- `rentalcore` → Auftragsmanagement  
- `warehousecore` → Lagermanagement  

---

## 🧭 Overview
Diese Datei definiert zentrale Entwicklungsrichtlinien, Datenbankkonfigurationen, Build-Workflows und Philosophien für die beiden Core-Systeme.  
Beide Systeme teilen sich dieselbe Datenbankstruktur (`RentalCore.sql`) und arbeiten eng integriert zusammen.

Verzeichnisstruktur:
```
/lager_weidelbach/
├── claude.md
├── rentalcore/      → Auftragsmanagement & Jobhandling
└── warehousecore/     → Lagermanagement & Gerätebewegungen
```

---

## ⚙️ 1. Global Database Configuration

Die DB-Konfiguration erfolgt ausschließlich über Umgebungsvariablen im Komodo-Stack (`.env`). Keine Credentials im Code oder in dieser Datei.

- **Datenbank:** PostgreSQL 16
- Schema-Dateien: `/migrations/postgresql/`
  - **RentalCore Schema:** `/migrations/postgresql/001_rentalcore_schema.sql`
  - **WarehouseCore Schema:** `/migrations/postgresql/002_warehousecore_schema.sql`
  - **Combined Init:** `/migrations/postgresql/000_combined_init.sql`
  - ⚠️ Bei Änderungen: Änderungen in den entsprechenden PostgreSQL-Schema-Dateien vornehmen
- Tabellenänderungen sind erlaubt (nicht die Daten selbst)
- WarehouseCore und RentalCore greifen auf dieselbe DB-Struktur zu
- Änderungen an der Datenbankstruktur müssen synchron in beiden Projekten dokumentiert werden

### 🔑 Default Login Credentials & Auto-Initialization

**Automatische Datenbank-Initialisierung:**
- Beim **ersten Start** des Docker-Stacks werden die SQL-Dateien aus `/migrations/postgresql/` automatisch importiert
- PostgreSQL nutzt `/docker-entrypoint-initdb.d/` für automatische Initialisierung
- Konfiguration: `docker-compose.yml` mountet das Verzeichnis `/migrations/postgresql/` nach `/docker-entrypoint-initdb.d/`
- Dies passiert nur, wenn das `postgres-data` Volume leer ist (Fresh Install)

**Default-Credentials (automatisch erstellt):**

- **Username:** `admin`
- **Password:** `admin`
- **Email:** `admin@example.com` (generisch, kann nach Login geändert werden)

**⚠️ WICHTIG:** Der Admin-User wird beim ersten Login gezwungen, das Passwort zu ändern!

**Fresh Install simulieren:**
```bash
docker-compose down -v  # Volumes löschen
docker-compose up -d    # Neu starten (triggert Auto-Init)
```

### ⚠️ Häufige Deployment-Probleme

**Problem 1: Restart-Loop beim ersten Start**
- **Ursache:** PostgreSQL-Initialisierung dauert 30-60 Sekunden
- **Lösung:** Warten! Die Healthchecks sind optimiert (start_period: 60s für PostgreSQL, 120s für Apps)
- **Überwachen:** `docker-compose logs -f postgres` bis "database system is ready to accept connections" erscheint

**Problem 2: Login funktioniert nicht**
- **Ursache:** Bestehendes PostgreSQL-Volume wird nicht neu initialisiert
- **Lösung:** `docker-compose down -v` (⚠️ löscht alle Daten!) und dann `docker-compose up -d`
- **Prüfen:** `docker exec postgres psql -U rentalcore -d rentalcore -c "SELECT username FROM users;"`

**Problem 3: Services starten nicht**
- Logs prüfen: `docker-compose logs --tail=100`
- Ports belegt: `sudo lsof -i :8081 :8082 :5432`
- Images neu pullen: `docker-compose pull`

**Vollständige Anleitung:** Siehe [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 🧩 2. RentalCore

### Repository & Deployment
- **Git:** [git.server-nt.de/ntielmann/rentalcore](https://git.server-nt.de/ntielmann/rentalcore)  
- **Docker Image:** `nobentie/rentalcore`
- **Version Tags:** `1.X` + `latest`

### Build & Push
```bash
docker build -t nobentie/rentalcore:1.X .
docker push nobentie/rentalcore:1.X
docker tag nobentie/rentalcore:1.X nobentie/rentalcore:latest
docker push nobentie/rentalcore:latest
```

### Aufgabenbereich
- Auftragsmanagement (Jobs, Kunden, Rechnungen, Zuordnungen)
- Verwaltung von Job-Devices, Preisen, Status und Projektdaten
- Synchronisierte Schnittstelle zu WarehouseCore (Status und Gerätebewegungen)
- Integriert in das Business-System von Tsunami Events

### Development Rules
- Niemals Code als *„fertig“* deklarieren, wenn er es nicht zu 100 % ist  
- Keine Debug- oder temporären Dateien im Repo behalten  
- Nach jedem Commit:
  - `README` aktualisieren  
  - zu GitLab **pushen**  
  - Docker-Image **builden & pushen**  
- **Sicherheitscheck:** vor jedem Push auf sensible Daten prüfen  
- **Commit Messages:** keine Erwähnung von „Claude“ oder „AI“  
- Nur Standard-Git-Kommandos verwenden  
- Navigationsabschnitt im README aktuell halten  
- Nach jeder Codeänderung → Server **neu starten**  
  > ⚠️ Niemals `pkill server` verwenden (würde tmux-Sessions beenden)

---

## 📦 3. WarehouseCore

### Repository & Deployment
- **Git:** [git.server-nt.de/ntielmann/warehousecore](https://git.server-nt.de/ntielmann/warehousecore)  
- **Docker Image:** `nobentie/warehousecore`
- **Version Tags:** `1.X` + `latest`

### Build & Push
```bash
docker build -t nobentie/warehousecore:1.X .
docker push nobentie/warehousecore:1.X
docker tag nobentie/warehousecore:1.X nobentie/warehousecore:latest
docker push nobentie/warehousecore:latest
```

### Datenbank
Verwendet dieselbe Konfiguration wie RentalCore — Credentials nur über `.env` im Komodo-Stack.

---

### 🧠 Vision & Core Features

**WarehouseCore** ist das physische Gegenstück zu **RentalCore** – es bildet alle realen Lagerprozesse in Weidelbach digital ab.

#### Hauptziele
- **Digitale Lagerabbildung:** Jeder Lagerbereich, jedes Case und jeder Standort wird digital repräsentiert.  
- **Echtzeit-Statusanzeige:** Geräte, Cases und Kabel besitzen Zustände wie „im Lager“, „auf Job“, „defekt“, „repariert“.  
- **Live-Synchronisierung mit RentalCore:** Statusänderungen durch Scans werden sofort reflektiert.  
- **Visuelle Lagerkarte:** Spätere Erweiterung für grafische Darstellung (Regale, Cases, Räume).  
- **Erweiterbares Scansystem:** Alle Barcode- oder RFID-Scans werden automatisch gespeichert.  
- **Job-Bezug:** Jedes Gerät kennt seinen aktuellen Job-Kontext.  
- **Defekt- & Wartungsmanagement:** Verwaltung von Reparaturen, Prüfintervallen und Defektmeldungen.

#### Module
- **Device Tracker:** Verwaltung physischer Gerätebewegungen  
- **Case Manager:** Cases & Inhalte, optional RFID-unterstützt  
- **Storage Zones:** Logische Zonen (Regale, Cases, Fahrzeuge etc.)  
- **Maintenance Engine:** Defekt-, Prüf- und Wartungsstatus

---

### Development Rules
- Gleiche Philosophie & Buildstruktur wie RentalCore  
- Nach jedem Commit:
  - `README` aktualisieren  
  - zu GitLab **pushen**  
  - Docker-Image **builden & pushen**  
- **Keine sensiblen Daten ins Repo!**
- Tabellenänderungen immer in `RentalCore.sql` nachziehen  
- **Keine `_final`, `_new`, `_fixed` etc.** – alte Dateien immer löschen

---

## 🧰 4. Gemeinsame Entwicklungsrichtlinien

### File Management
- Alte Versionen sofort löschen  
- Keine Duplikate oder temporäre Dateien  
- Saubere Verzeichnisstruktur beibehalten  

### Professional Mindset
- Hoher Qualitätsanspruch  
- Klare, strukturierte Commits  
- Reproduzierbare Builds  
- Kein Feature bleibt ungetestet  

### Server Management
- Nach Änderungen sauber neustarten  
- Niemals `pkill server` verwenden  
- tmux-Sessions nicht stören  

### Sicherheit
- Alle Secrets prüfen, bevor Dateien gepusht werden  
- Nur Demo-Daten in Repos  
- `.env`-Dateien niemals pushen  

---

## 🌐 Zielumgebung

| Komponente | Beschreibung |
|-------------|---------------|
| **Server Root** | `/lager_weidelbach` |
| **RentalCore** | Auftragsmanagement-System |
| **WarehouseCore** | Physisches Lagermanagement |
| **Gemeinsame DB** | PostgreSQL (Komodo-Stack) |
| **Docker Images** | `nobentie/rentalcore`, `nobentie/warehousecore` |
| **Docker Stack** | docker03 via Komodo |
- DO NOT RESTART THE LOCAL DOCKER STACK. The docker stack runs on a diffrent server and I start it manually. so always build & push it to the dockerhub.
- Bitte IMMER zu gitlab pushen und falls nötig alle docker images builden und zu dockerhub pushen
- My Stack runs via Komodo (docker mgm like portainer) on my docker server (Hostname: docker03 user: noah, password: Nben@2024) DO NOT RESTART THE DOCKER STACK ON THIS SERVER MANUALLY ONLY I AM ALLOWED TO DO) you can inspect logs from the docker container or do some commands like to clear the mqqt history.
- Denk dran, dass alle *cores mit allen funktionen auf JEDEM Gerät / Server deployt werden soll. Also auch ohne datenbank etc. Das ganze soll nur mit der docker-compose.yml und der .env passieren.
- Du kannst auf meinen DOcker03 zugriefen (da läuft der Stack) aber du darfst dort nichts ändern, **NUR LESEN**. Hostname: docker03 User: noah. Der Public key ist hinterlegt.

---

## 🔐 5. SSH-Zugriff & Server-Berechtigungen

### Docker03 Server (Docker Stack Production)
- **Host:** `noah@docker03.nt.local` (auch als `noah@docker03` erreichbar)
- **SSH-Key:** Hinterlegt (Passwortlose Authentifizierung)
- **Stack-Verzeichnis:** `/opt/docker/komodo/stacks/tscores`
- **Berechtigungen:**
  - **Lesen:** Überall erlaubt (Logs, Config, Files inspizieren)
  - **Schreiben/Ändern:** **NUR MIT EXPLIZITER ERLAUBNIS** (immer vorher fragen!)
  - **Erlaubte Aktionen:**
    - Container neustarten (z.B. `docker restart <container>`)
    - Docker Images pullen (z.B. `docker pull nobentie/warehousecore:latest`)
    - Logs inspizieren (z.B. `docker logs <container>`)
  - **Verbotene Aktionen ohne Erlaubnis:**
    - Config-Dateien ändern
    - Container löschen
    - Volumes manipulieren

### GitLab Repositories
- Nach **jeder Änderung** am Code → pushen zum jeweiligen Repo
- Repo-URLs automatisch aus `.git/config` ermitteln
- **Commit Messages:** Keine Erwähnung von „Claude" oder „AI"
- **Personal Access Token:** `glpat-MUyzD2kDzRH0_wDl7EdwzG86MQp1OjQH.01.0w1mjxy3l`
  - GitLab-Instanz: `https://git.server-nt.de`
  - Verwenden für API-Calls (Labels, Boards, etc.) via curl wenn MCP nicht ausreicht

### Docker Hub
- **Account:** `nobentie/`
- **Images:** `nobentie/rentalcore`, `nobentie/warehousecore`
- **Versioning:** Vor dem Push auf DockerHub prüfen, welche Version die letzte war
- **IMMER pushen:** `1.X` (neue Version) **UND** `latest` Tag

### Workflow nach Code-Änderungen
1. ✅ Code ändern & testen
2. ✅ GitLab: `git push` zum entsprechenden Repo
3. ✅ Docker: Image builden (`docker build -t nobentie/<project>:1.X .`)
4. ✅ DockerHub: Version + Latest pushen
5. ✅ Server: Image pullen & Container neu starten (auf docker03 via Komodo)