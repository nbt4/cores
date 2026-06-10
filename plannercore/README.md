# Planner

Ein vollständiger, selbst gehosteter Klon von Microsoft Planner – mit Board, Raster-, Diagramm- und Zeitplanansicht, Buckets, Bezeichnungen, Checklisten, Kommentaren, Anhängen, Benutzerverwaltung und E-Mail-Benachrichtigungen über einen Microsoft-365-Tenant. Dark/Light-Mode inklusive, optimiert für jede Bildschirmgröße vom Smartphone bis zum Ultrawide-Monitor.

![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20PostgreSQL-31752f)

## Funktionen

**Pläne & Boards**
- Pläne mit Farbe, Symbol, Beschreibung, Favoriten und Planner-Hub-Übersicht
- Buckets: anlegen, umbenennen, löschen, per Drag & Drop sortieren
- Aufgaben per Drag & Drop verschieben (auch auf Touch-Geräten)
- Gruppierung des Boards nach **Bucket, Status, Priorität, Fälligkeitsdatum, Zugewiesen zu oder Bezeichnungen** – Ablegen in einer Gruppe ändert das jeweilige Feld (wie im Original)
- Plan kopieren, Export nach Excel (CSV), Plan verlassen/löschen

**Aufgaben**
- Status (Nicht begonnen / In Arbeit / Erledigt), Priorität (Dringend / Wichtig / Mittel / Niedrig)
- Start- und Fälligkeitsdatum mit Überfällig-Markierung
- 25 farbige Bezeichnungen, pro Plan frei benennbar
- Checklisten, Notizen, Kommentare, Dateianhänge (Upload/Download)
- Mehrfach-Zuweisung an Planmitglieder, Aufgabe kopieren
- Schnellerfassung direkt im Board, Inline-Bearbeitung im Raster

**Ansichten**
- **Board** – Kanban mit Schnellerfassung
- **Raster** – sortierbare Tabelle mit Inline-Bearbeitung (auf Mobilgeräten als Kartenliste)
- **Diagramme** – Status-Donut, Aufgaben je Bucket/Priorität/Mitglied
- **Zeitplan** – Monatskalender mit Fälligkeiten und nicht geplanten Aufgaben
- **Meine Aufgaben** – planübergreifend alles, was Ihnen zugewiesen ist
- Filter nach Stichwort, Fälligkeit, Priorität, Bezeichnung und Person

**Benutzer & Benachrichtigungen**
- Registrierung/Anmeldung (JWT), Profil mit Avatarfarbe, Passwort ändern
- „Passwort vergessen" per E-Mail-Link
- Benutzerverwaltung für Administratoren (anlegen, Rolle, Passwort zurücksetzen, löschen) – **der erste registrierte Benutzer wird automatisch Admin**
- In-App-Benachrichtigungen (Glocke) **und E-Mails über Microsoft 365** bei:
  - Zuweisung einer Aufgabe
  - neuem Kommentar zu eigenen/zugewiesenen Aufgaben
  - Aufnahme in einen Plan
  - bald fälligen und überfälligen Aufgaben (automatische Prüfung alle 30 Minuten)
- E-Mail-Benachrichtigungen pro Benutzer abschaltbar

**Oberfläche**
- Dark Mode, Light Mode oder Systemeinstellung
- Vollständig responsiv: einhändig bedienbares Board mit Snap-Scrolling, Vollbild-Dialoge und Drawer-Navigation auf dem Smartphone

## Schnellstart

Voraussetzung: Docker mit Compose.

```bash
cp .env.example .env
# .env anpassen: mindestens JWT_SECRET und DB_PASSWORD ändern!
docker compose up -d --build
```

Anschließend <http://localhost:8080> öffnen und das erste Konto registrieren – dieses erhält automatisch Administratorrechte. Möchten Sie die Selbstregistrierung danach unterbinden, setzen Sie `ALLOW_REGISTRATION=false`; neue Benutzer legt dann der Admin unter *Benutzerverwaltung* an.

Daten (PostgreSQL) und Dateianhänge liegen in Docker-Volumes (`pgdata`, `uploads`) und überstehen Neustarts und Updates.

## E-Mail über Microsoft 365 einrichten

Alle Benachrichtigungen werden über Ihren M365-Tenant versendet. Zwei Varianten stehen zur Auswahl (in `.env` über `MAIL_PROVIDER` wählbar). Ohne Konfiguration (`MAIL_PROVIDER=console`) werden E-Mails nur ins Server-Log geschrieben – praktisch zum Testen.

### Variante A: Microsoft Graph API (empfohlen)

1. [Entra Admin Center](https://entra.microsoft.com) → **App-Registrierungen** → **Neue Registrierung** (z. B. „Planner Mailer", nur Konten dieses Organisationsverzeichnisses).
2. In der App: **API-Berechtigungen** → **Berechtigung hinzufügen** → **Microsoft Graph** → **Anwendungsberechtigungen** → `Mail.Send` → anschließend **Administratorzustimmung erteilen**.
3. **Zertifikate & Geheimnisse** → **Neuer geheimer Clientschlüssel** → Wert kopieren.
4. In `.env` eintragen:

```ini
MAIL_PROVIDER=graph
GRAPH_TENANT_ID=<Verzeichnis-ID (Tenant)>
GRAPH_CLIENT_ID=<Anwendungs-ID (Client)>
GRAPH_CLIENT_SECRET=<geheimer Clientschlüssel>
MAIL_SENDER=planner@ihre-firma.de   # Absenderpostfach (UPN oder freigegebenes Postfach)
```

> **Tipp:** Beschränken Sie die App per [Application Access Policy](https://learn.microsoft.com/graph/auth-limit-mailbox-access) auf das Absenderpostfach, damit sie nicht aus beliebigen Postfächern senden kann:
> `New-ApplicationAccessPolicy -AppId <CLIENT_ID> -PolicyScopeGroupId planner@ihre-firma.de -AccessRight RestrictAccess`

### Variante B: SMTP AUTH (Office 365)

Erfordert ein Postfach mit aktivierter SMTP-Authentifizierung (Microsoft 365 Admin Center → Benutzer → E-Mail → *Authentifiziertes SMTP* aktivieren).

```ini
MAIL_PROVIDER=smtp
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=planner@ihre-firma.de
SMTP_PASS=<Passwort oder App-Kennwort>
MAIL_SENDER=planner@ihre-firma.de
```

Damit Links in E-Mails (z. B. „Aufgabe öffnen", Passwort-Reset) stimmen, `APP_URL` auf die öffentlich erreichbare Adresse der Installation setzen.

## Konfigurationsreferenz

| Variable | Standard | Beschreibung |
|---|---|---|
| `APP_PORT` | `8080` | Veröffentlichter Port der App |
| `APP_URL` | `http://localhost:8080` | Basis-URL für Links in E-Mails |
| `JWT_SECRET` | – | **Pflicht:** langer Zufallswert für Anmelde-Token |
| `DB_PASSWORD` | `planner` | Passwort der PostgreSQL-Datenbank |
| `ALLOW_REGISTRATION` | `true` | `false` = nur Admins legen Benutzer an (erster Benutzer darf sich immer registrieren) |
| `MAIL_PROVIDER` | `console` | `graph`, `smtp` oder `console` |
| `GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET` | – | App-Registrierung für Variante A |
| `MAIL_SENDER` | – | Absenderadresse |
| `SMTP_HOST/PORT/USER/PASS` | `smtp.office365.com:587` | Zugangsdaten für Variante B |

## Entwicklung ohne Docker

```bash
# PostgreSQL bereitstellen (Benutzer/DB/Passwort: planner)
cd server && npm install && npm run dev          # API auf :8080
cd web   && npm install && npm run dev           # Vite-Dev-Server auf :5173 (Proxy auf die API)
```

## Architektur

```
docker-compose.yml   → db (PostgreSQL 16) + app (Node 22)
server/              → Express-API, JWT-Auth, Mailer (Graph/SMTP), Scheduler
  src/routes/        → auth, users, plans, buckets, tasks, notifications
web/                 → React 18 + Vite, @hello-pangea/dnd (Drag & Drop, touchfähig)
```

Das Produktiv-Image baut das Frontend in einer Build-Stufe und liefert es als statische Dateien direkt aus dem API-Container aus – ein einziger Port, kein separater Webserver nötig.

## Hinweise für den Produktivbetrieb

- Betreiben Sie die App hinter einem Reverse Proxy mit HTTPS (z. B. Traefik, Caddy, nginx).
- `JWT_SECRET` und `DB_PASSWORD` unbedingt durch starke Zufallswerte ersetzen.
- Backups: Volume `pgdata` (Datenbank) und `uploads` (Anhänge) sichern.
