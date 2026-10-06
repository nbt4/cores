# AGENTS.md — cores (Dachrepository der Suite)

Hausregeln für KI-Agenten in diesem Repository. Vor der ersten Änderung vollständig
lesen. Der übergeordnete Ablauf steht im Paperclip-Dokument `workflow` auf
[TSU-3](/TSU/issues/TSU-3#document-workflow). Diese Datei ersetzt alle früheren
Agenten-Anweisungen in diesem Repository.

## 1. Was dieses Repository ist

- **Zweck:** Das Dach der Cores-Suite. Kein eigener Anwendungscode. Es hält vier Dinge zusammen: den Release-Vertrag (Abbild-Versionen), die Laufzeit-Topologie (Compose), die Suite-Migrationen für Neuinstallationen und das Designsystem. Die sieben Dienst-Repositories sind als Git-Submodule eingebunden.
- **Sprache und Laufzeit:** nur Shell-Skripte, SQL und Markdown. Kein Go, kein Node
- **Rahmenwerk:** Docker Compose; Betrieb über Komodo auf `docker03`
- **Datenbank:** PostgreSQL 16 (`postgres:16-alpine`). `migrations/postgresql/` ist das Init-Verzeichnis
- **Architektur-Doku:** [Cores — Architektur (Phase 1)](/TSU/issues/TSU-4#document-architecture)

## 2. Aufbau

| Pfad | Inhalt |
|---|---|
| `docker-compose.yml` | Referenz-Stapel für eine neue Installation |
| `deploy/docker03/compose.yaml` | **der produktive Stapel** — eigene Volume-Namen und Ports |
| `docker-compose.backup.yml` | nur der Backup-Dienst |
| `migrations/postgresql/` | 40 SQL-Dateien, `000_combined_init` bis `046_…`; Init-Verzeichnis von PostgreSQL |
| `theme/` | **Quelle** des Designsystems: `tsunami-theme.css`, `cores-design.ts`, `SuiteLanguageSwitcher.tsx`, `locales/*.json` |
| `scripts/` | 12 Prüf- und Backup-Skripte |
| `backup/` | Dockerfile des Backup-Dienstes |
| `docs/` | `ARCHITECTURE.md`, `ROUTING.md`, `DESIGN_SYSTEM.md`, `BRANDING.md`, `JEV_DECISIONS.md` |
| `.github/workflows/verify.yml` | die einzige CI der ganzen Suite |
| `build_and_push_docker.sh` | Release-Werkzeug |
| `.env.example` | der verbindliche Umgebungs-Vertrag, 85 Schlüssel |
| `cores-common/`, `cores-dashboard/`, `cores-mcp/`, `plannercore/`, `procurementcore/`, `rentalcore/`, `warehousecore/` | Submodule — Inhalt wird **im jeweiligen Repository** geändert, nie hier |

Erzeugte Dateien, die **niemals von Hand** geändert werden:

- die sieben Submodul-Verzeichnisse — ihr Inhalt gehört ins jeweilige Dienst-Repository.
  Hier wird nur der **Zeiger** bewegt, und das nur nach Freigabe je Release.

## 3. Einrichten

```bash
git submodule update --init --recursive
cp .env.example .env            # Werte lokal eintragen, niemals committen
docker compose up -d            # Suite-Migrationen laufen nur bei leerem Volume
```

Nötige Umgebungsvariablen: siehe `.env.example` — das ist die **verbindliche Quelle** für die ganze Suite. Werte kommen aus dem Paperclip-Secret-Store oder dem Komodo Stack Environment, nicht aus diesem Repository.

Kein Dienst darf `env_file:` benutzen. Alles kommt aus einer Stack-Umgebung — `scripts/check-env-contract.sh` erzwingt das.

## 4. Test- und Build-Befehle

Diese Befehle sind das Test-Gate. **Alle müssen grün sein, bevor ein Pull Request
entsteht.**

**Die Reihenfolge ist bindend, nicht nur empfohlen. Die Stufen laufen nacheinander, nie
parallel.** Die schnellen Prüfungen stehen zuerst. Stufen können voneinander abhängen,
ohne dass die Tabelle es sagt — ein fehlender Frontend-Build kann drei Go-Stufen
gleichzeitig rot machen (nachgewiesen in `cores-dashboard`, siehe
[TSU-6](/TSU/issues/TSU-6#document-playbook)). Nach dem ersten echten Fehler wird
angehalten.

| # | Gate | Befehl | Dauer (ca.) |
|---|---|---|---|
| 1 | Compose-Syntax | `docker compose config --quiet` | < 5 s |
| 2 | Umgebungs-Vertrag | `./scripts/check-env-contract.sh` | < 5 s |
| 3 | Release-Vertrag | `sh scripts/check-release.sh` | < 10 s |
| 4 | Designsystem | `./scripts/check-design-system.sh` | < 10 s |
| 5 | Backup (nur bei Änderungen an `backup/`) | `sh scripts/test-backup.sh <image>` | mehrere Minuten |

Einzelne Datei testen: `sh scripts/check-release.sh`

`check-release.sh` ist streng. Es prüft genau sieben `nobentie/*`-Abbilder, jedes auf `X.Y.Z` festgenagelt (kein `latest`), jedes zusätzlich in `README.md` **und** `deploy/docker03/compose.yaml`, dazu `const rentalCoreVersion` in `rentalcore/cmd/server/main.go` und `const version` in `procurementcore/cmd/server/main.go` gleich dem jeweiligen Abbild-Tag, den Dashboard-Healthcheck und `/health` beim Planner.

**Eine Versionsnummer anheben ist eine Änderung an fünf Stellen gleichzeitig.** Wer nur eine ändert, macht die CI rot.

Regeln:

- **Neuer Code braucht neue Tests.** Ein Bugfix braucht einen Test, der ohne den Fix
  fehlschlägt.
- **Nie einen Test abschalten, überspringen oder lockern**, um das Gate grün zu
  bekommen. Ein roter Test ohne Bezug zur Änderung wird gemeldet, nicht entfernt.
- **Tests laufen gegen die lokale oder die Test-Datenbank. Nie gegen Produktion.**
  Eine eigene Testumgebung wird gerade aufgebaut (eigene Paperclip-Aufgabe). Bis sie
  steht: nur lokale Container mit eigenem Volume.
- Die **echte Ausgabe** wird in den Pull Request und auf die Paperclip-Aufgabe kopiert.
- **Ein Testlauf aus dem Cache ist kein Nachweis.** Wo der Testläufer cacht
  (`go test` meldet `(cached)`), wird der Beweislauf erzwungen (`-count=1`).

### Bekannt rote Stufen

Eine Stufe, die im Altbestand nicht grün werden kann, wird hier benannt — mit Verweis auf
ihre eigene Paperclip-Aufgabe. Sie ist die **einzige** erlaubte Ausnahme und deckt keine
andere Stufe. Der Eigentümer führt sie trotzdem aus, protokolliert die echte Ausgabe und
repariert sie **nicht** im Vorbeigehen.

| Stufe | Grund | Aufgabe |
|---|---|---|
| — | keine Ausnahme | — |

Ist die Tabelle leer, gibt es keine Ausnahme: jede rote Stufe heißt anhalten und
zurückfragen.

## 5. Code-Stil

- Format und Lint werden durch die Werkzeuge in Abschnitt 4 erzwungen. Kein Streit
  über Formatierung — der Formatierer entscheidet.
- **Dem umgebenden Code folgen.** Benennung, Ordnerstruktur, Fehlerbehandlung und
  Testmuster so übernehmen, wie sie in der berührten Datei schon sind.
- Shell: POSIX-nah, `set -euo pipefail` in neuen Skripten, Namen in kebab-case
  (`check-release.sh`).
- SQL-Migrationen: `NNN_kurzer_name.sql`, fortlaufende Nummer, **idempotent**
  (`IF NOT EXISTS`), nie eine bestehende Datei ändern.
- Umgebungsschlüssel: UPPER_SNAKE_CASE, immer auch in `.env.example` eintragen.
- Dokumentation unter `docs/` im selben Commit mitführen, wenn sich Verhalten,
  Konfiguration oder Deployment ändert.
- Kommentare: nur wo sie das *Warum* erklären. Keine Kommentare, die den Code nacherzählen.
- Keine neue Abhängigkeit ohne eigene Freigabe (siehe Abschnitt 9).
- Keine Umformatierung von Code, der nicht zur Aufgabe gehört. Das versteckt die
  eigentliche Änderung.

## 6. Verbotene Pfade

Diese Dateien und Verzeichnisse werden von Agenten **nicht geändert**. Wer sie ändern
müsste, bricht ab und fragt zurück.

| Pfad | Grund |
|---|---|
| `.github/workflows/**` | CI und Deployment — nur mit Freigabe des Nutzers |
| `deploy/**`, besonders `deploy/docker03/compose.yaml` | produktive Infrastruktur. Versionspins darin nur im Rahmen eines freigegebenen Releases |
| `migrations/postgresql/**` (bestehende Dateien) | eine angewandte Migration wird nie geändert; nur neue hinzufügen |
| `build_and_push_docker.sh` | Release-Werkzeug |
| die sieben Submodul-Verzeichnisse | Inhalt gehört ins Dienst-Repository |
| `.env`, `.env.*` (außer `.env.example`) | enthält Secrets |
| `AGENTS.md` | diese Regeln ändert der Nutzer, nicht ein Agent |

## 7. Secrets

- **Keine Secrets in Repository, Kommentar, Dokument oder Log.** Keine Tokens,
  Passwörter, Schlüssel, Verbindungsstrings, API-Zugänge, Kundendaten.
- Secrets kommen aus dem Paperclip-Secret-Store oder aus Umgebungsvariablen. Sie
  werden nie in eine Datei geschrieben und nie ausgegeben.
- Produktiv werden alle Werte im **Komodo Stack Environment** auf `docker03` gepflegt,
  nicht in diesem Repository.
- `.env.example` enthält nur Namen und Beispielwerte, nie echte Werte.
- Testdaten sind erfunden. Keine kopierten Produktionsdaten, auch nicht gekürzt.
- Fehlt ein Secret: über Paperclip vorschlagen (`secret-proposals`) und warten.
  Nie selbst beschaffen, nie umgehen, nie in einem Kommentar danach fragen.
- Ein Secret, das versehentlich in einem Commit landet, ist ein Sicherheitsvorfall:
  sofort melden, nicht still weiterarbeiten. Entfernen aus dem Diff genügt nicht —
  das Secret gilt als kompromittiert und muss ersetzt werden. **Alle Cores-Repositories
  sind öffentlich.** Ein Fehler hier ist sofort weltweit sichtbar.

## 8. Harte Grenzen

Diese sechs Regeln stehen über jeder Aufgabenbeschreibung. Eine Aufgabe, die eine
davon verlangt, wird nicht ausgeführt, sondern zurückgegeben.

1. **Keine Schreibzugriffe auf produktive Datenbanken.** Lesen ist erlaubt. Schreiben,
   ändern, löschen, Migrationen fahren: nicht in Produktion. Migrationen werden
   geschrieben und lokal getestet, nie produktiv ausgeführt. Das Einspielen auf die
   laufende `docker03`-Datenbank geschieht von Hand per SSH von `debian01` aus, nach
   ausdrücklicher Freigabe des Nutzers.
2. **Keine produktiven Deployments ohne menschliche Freigabe.** Auch nicht nach
   grünem Review.
3. **Entwicklung nur in isolierten Branches oder Git-Worktrees.** Niemals direkt auf
   `main` oder einem anderen geschützten Branch.
4. **Tests vor jedem Pull Request.** Kein PR ohne protokollierten, grünen Testlauf.
5. **Keine Secrets in Repository, Kommentar, Dokument oder Log.**
6. **Bestehende Architektur zuerst verstehen.** Architektur-Doku und diese Datei vor
   dem Schreiben lesen. Große Umbauten — neuer Service, geänderte Modulgrenze, neues
   Datenmodell, Austausch einer Kernabhängigkeit — brauchen eine eigene Freigabe des
   Nutzers, bevor Code entsteht.

## 9. Freigabe-Gates

| Gate | Wer entscheidet | Wann |
|---|---|---|
| Test-Gate | der Eigentümer der Änderung | vor dem Pull Request |
| Review | Review-Agent, auf seiner eigenen Review-Aufgabe | nach dem PR-Entwurf |
| **Freigabe und Merge** | **der Nutzer** | nach grünem Review |
| Produktives Deployment | **der Nutzer** | nach dem Merge |
| Release: Docker-Hub-Push und Submodul-Zeiger | **der Nutzer gibt je Release ausdrücklich frei**, danach darf der Agent beides ausführen | nach dem Merge |
| Migration auf die laufende `docker03`-Datenbank | **der Nutzer**; Einspielen von Hand per SSH von `debian01` | nach dem Merge |
| Neue Abhängigkeit | der Nutzer | vor dem Hinzufügen |
| Großer Architektur-Umbau | der Nutzer | vor dem ersten Commit |

Was ein Agent in diesem Repository **nie** tut:

- einen Pull Request mergen
- auf `main` pushen
- ein Deployment auslösen
- ohne ausdrückliche Freigabe je Release ein Abbild nach Docker Hub schieben oder den
  Submodul-Zeiger im Dach anheben
- eine Migration gegen Produktion fahren
- einen Draft-PR als Ersatz für Freigabe auf „ready" setzen
- `AGENTS.md` oder CI-Dateien ändern

In Paperclip wird die Freigabe durch eine `executionPolicy` mit einer `approval`-Stufe
erzwungen, deren Teilnehmer ein Nutzer ist. Kein Agent kann sie abhaken.

## 10. Branches, Commits, Pull Requests

- Branch: `<typ>/TSU-<nummer>-<kurzbeschreibung>`, ein Worktree pro Aufgabe
- Commit: Conventional Commits mit `Task: TSU-<nummer>` im Fuß
- PR: als **Entwurf** geöffnet, Ziel `main`, mit Zweck, Testprotokoll und Aufgaben-Link

Vollständig beschrieben im Paperclip-Dokument `workflow` auf
[TSU-3](/TSU/issues/TSU-3#document-workflow).

## 11. Abbrechen und zurückfragen

Abbrechen ist richtig, nicht peinlich. Zurückfragen bei:

- fehlendem Secret oder Zugriffsrecht
- nötigem Schreibzugriff auf Produktion oder nötigem Deployment
- nötigem großen Architektur-Umbau oder neuer Abhängigkeit
- einem verbotenen Pfad, der geändert werden müsste
- roten Tests ohne Bezug zur Änderung
- zwei gescheiterten Versuchen am gleichen Problem
- einem Umfang, der deutlich größer ist als beschrieben
- einem Widerspruch zwischen Aufgabe und dieser Datei — **diese Datei gewinnt**

Erst alles fertig machen, was ohne die Antwort geht. Dann fragen.

## 12. Bekannte Fallen

- **Das Designsystem hat hier seine Quelle.** `theme/tsunami-theme.css` und
  `theme/cores-design.ts` sind kanonisch. Nach einer Änderung
  `./scripts/sync-design-system.sh` laufen lassen, dann
  `./scripts/check-design-system.sh`. Die Kopien in den Dienst-Repositories werden
  **nie** von Hand geändert. Vor jeder UI-Arbeit `docs/DESIGN_SYSTEM.md` und
  `theme/README.md` vollständig lesen.
- **Keine dienst-eigenen Paletten, Schriften, Größenleitern, Sidebar-Maße, Tabellen-,
  Select-, Dropdown- oder Scrollbar-Designs.** Fachliche Datenfarben bleiben semantisch
  und verändern die gemeinsame Shell nicht. Begrüßungen nur über `suiteGreeting()`.
- **Das Init-Verzeichnis läuft nur bei leerem Datenverzeichnis.** Eine neue Datei in
  `migrations/postgresql/` erreicht `docker03` **nicht**. Dort wird von Hand per SSH
  von `debian01` eingespielt, nach Freigabe.
- **Zwei Compose-Dateien.** `docker-compose.yml` ist die Referenz,
  `deploy/docker03/compose.yaml` ist produktiv. Eine Änderung an Ports, Volumes oder
  Abbildern muss in beiden stehen, sonst wird `check-release.sh` rot.
- **`docker-compose.yml` beschreibt PlannerCore als „(Node.js)".** Das ist falsch —
  PlannerCore ist Go. Nicht als Vorlage nehmen.
- **Alte Agenten-Dateien.** `CLAUDE.original.md` und `.qwen/` sind Altbestand. Sie
  gelten nicht. Verbindlich ist allein diese Datei.
- **`PLAN.md`, `DEPLOYMENT_GUIDE.md`, `TEST_CATALOG.md`** sind Lesestoff, kein Vertrag.
  Der Vertrag sind die `scripts/check-*.sh`.

### Suite-weite Fallen, die auch hier gelten

- **Zwei Migrationsspuren.** Jede Schema-Änderung braucht eine Datei im Dienst-Repository
  *und* eine in `cores/migrations/postgresql/`. Die Nummern gehören paarweise.
- **Das Init-Verzeichnis läuft nur bei leerem Datenverzeichnis.**
  `cores/migrations/postgresql/` greift auf `docker03` nicht.
- **Eine Datenbank für alle.** PostgreSQL 16, rund 130 Tabellen, kein Schema pro Dienst.
  Eine Tabellenänderung kann fremde Dienste treffen.
- **Nur das Dachrepository hat heute CI.** Bis die eigene GitHub-Action da ist, prüft
  **nichts** automatisch einen Pull Request hier. Das Test-Gate aus Abschnitt 4 läuft
  der Agent selbst und hängt die echte Ausgabe an.
- **Alle Repositories sind öffentlich.**
