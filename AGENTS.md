# Repository Guidelines

## Autonomie und dauerhafte Operationsfreigabe

Der Nutzer hat diese Freigabe am 12. Oktober 2026 ausdrücklich für das
Cores-Dachrepository und alle Cores-Dienst-Repositories erteilt. Dieser Abschnitt
hat bei widersprüchlichen Freigabe-, Draft-, Merge-, Deployment- oder
TSU-Vorgaben Vorrang. Er betrifft die Arbeit des Entwicklungsagenten; fachliche
Benutzerrechte, OAuth-Scopes und Bestätigungen in den Anwendungen bleiben gültig.

- Beauftragte Arbeiten eigenständig bis zum geprüften und veröffentlichten Ergebnis
  abschließen. Keine erneute Einzelfreigabe für die folgenden Operationsschritte
  verlangen, wenn sie zum Auftrag gehören.
- Änderungen committen und zu GitHub pushen; PRs erstellen, reviewen, freigeben,
  von Draft auf ready setzen und nach erfolgreichen Prüfungen selbst mergen.
  Ein menschlicher Merge oder eine separate Paperclip-Review-Aufgabe ist keine Pflicht.
  Für umfangreiche Änderungen ein unabhängiges Review durch einen Review-Agenten
  nutzen und konkrete Befunde vor dem Merge beheben.
- Auf Arbeitsbranches oder in Worktrees entwickeln. `main` nach erfolgreicher
  Validierung eigenständig aktualisieren, bevorzugt durch einen PR-Merge.
  Keine fremden Änderungen überschreiben oder ungeprüft force-pushen.
- Docker-Abbilder aus committed Quellcode bauen und nach Prüfung des zuletzt
  veröffentlichten Tags mit der nächsten fortlaufenden Version und `latest` nach
  Docker Hub pushen. Submodul-Zeiger, Versionspins und Release-Dokumentation synchron halten.
- Über die vorkonfigurierten Komodo- und SSH-Zugänge auf `docker03` eigenständig
  deployen, Images pullen und die betroffenen Dienste starten, stoppen oder neu starten.
  Laufzeitumgebung und Volumes erhalten; anschließend Image, Quellrevision und
  Healthchecks prüfen. Andere Dienste nur ändern, wenn der Auftrag es erfordert.
- Build-, CI-, Deployment-Konfiguration und `AGENTS.md` im Aufgabenumfang pflegen.
  Prüfungen dürfen dadurch nicht ausgeschaltet oder zur Verdeckung von Fehlern
  gelockert werden. Fehler selbst diagnostizieren und beheben; erst bei tatsächlich
  fehlendem Zugang, fehlender Information oder unklarem Umfang nachfragen.
- Tests passend zur Änderung durchführen und die echte Ausgabe protokollieren.
  Code- und Release-Gates weiterhin in der dokumentierten Reihenfolge ausführen;
  Go-Beweisläufe mit `-count=1`. Reine Dokumentations- oder `AGENTS.md`-Änderungen
  brauchen Diff-/Strukturprüfungen, keinen erneuten Anwendungsbuild oder Image-Release.
- Branches verständlich nach dem Thema benennen; Conventional Commits verwenden.
  Eine TSU-Nummer oder Paperclip-Aufgabe ist optional, kein Arbeits- oder Release-Gate.
- Bestehende Zugangsdaten nur über vorkonfigurierte Sessions, Laufzeitumgebungen
  oder Secret-Manager verwenden. Keine Secrets in Repository, PR, Kommentar oder Log
  schreiben; keine privaten Laufzeit- oder Produktionsdaten zu Testdaten machen.
- Destruktive Produktionsdatenänderungen und manuelle Schema-/Migrationseingriffe
  benötigen einen konkreten Auftrag dafür; die allgemeine Git-/Deployment-Freigabe
  ersetzt diesen Auftrag nicht. Datenbanktests ausschließlich lokal oder in einer
  isolierten Testumgebung ausführen. Große fachliche Umbauten bei unklarem Auftrag
  zunächst klären.

## Project Structure & Module Organization
- `docker-compose.yml` orchestrates all Core services, PostgreSQL 16, and Mosquitto; keep service names aligned with upstream app repos.
- `rentalcore/` (Go) handles job and customer flows; key paths are `cmd/server`, `internal/`, `web/`, and migrations.
- `warehousecore/` (Go) mirrors the layout for warehouse features; shared validators live in `internal/validation`.
- Root `migrations/` and `RentalCore.sql` document the shared database; update when schema changes span services.
- Deployment examples in `nginx-reverse-proxy.conf`, `docker-compose.*.yml`, and `docs/` must mirror port, domain, or env changes.
- Ensure both cores stay fully deployable and feature-complete with one `docker-compose.yml` plus `.env` on any host.

## Build, Test & Development Commands
- Managed environment runs on `docker03.nt.local` (user `noah`, SSH key installed); Komodo API access is allowed here to redeploy stacks, pull images, start/stop/restart stacks, and inspect logs as needed.

- `docker compose logs -f rentalcore|warehousecore` — stream logs.

- `make build`, `make run`, `make dev-setup` inside `rentalcore/` — compile, run, or bootstrap dependencies.
- `make build`, `make test`, `go test ./...` inside `warehousecore/` — build and test.
- Before releases, build and push each image with the next sequential version tag plus `latest` (e.g., `docker build -t nobentie/rentalcore:1.2.0 -t nobentie/rentalcore:latest . && docker push ...`).

## Operations & Access
- Docker Hub username: `nobentie` (may reuse existing login); images live at `nobentie/rentalcore` and `nobentie/warehousecore`.

## Coding Style & Naming Conventions
- Run `gofmt` (or `go fmt ./...`) before review; apply `goimports` when imports change.
- Keep `internal/` packages scoped by domain (`jobs`, `validation`, `mqtt`) and avoid cross-package coupling.
- Follow identifier patterns: PascalCase for exports, camelCase for locals, uppercase snake case for config keys.
- Static assets in `web/` use kebab-case filenames and established folder splits (`css/`, `js/`, `img/`).

## Verbindliches Cores Designsystem
- Vor jeder UI-Arbeit `docs/DESIGN_SYSTEM.md` und `theme/README.md` vollständig lesen; diese Regeln gelten für jeden bestehenden und zukünftigen Core.
- `theme/tsunami-theme.css` und `theme/cores-design.ts` sind die einzigen kanonischen Quellen für Suite-Tokens, globale Primitives, Datumslogik und Begrüßungen. Generierte Kopien unter `*/web/src/cores-theme.css`, `*/web/src/lib/cores-design.ts` und `rentalcore/web/static/css/cores-theme.css` niemals direkt bearbeiten.
- Nach Änderungen am Designsystem `./scripts/sync-design-system.sh` ausführen und vor jedem UI-Commit `./scripts/check-design-system.sh` ausführen.
- Keine service-spezifischen Paletten, Schriftarten, Größenleitern, Sidebar-Maße, Tabellen-, Select-, Dropdown- oder Scrollbar-Designs einführen. Fachliche Datenfarben bleiben semantisch und dürfen die gemeinsame Shell nicht verändern.
- Neue oder überarbeitete Dashboards müssen dem Dashboard-Vertrag in `docs/DESIGN_SYSTEM.md` und den `suite-dashboard*`-/`suite-kpi*`-Primitives folgen. Begrüßungen werden ausschließlich über `suiteGreeting()` erzeugt.
- Bei jeder UI-Änderung alle betroffenen Breakpoints sowie Tastaturfokus, Kontrast, Light/Dark und leere/ladende/fehlerhafte Zustände prüfen; relevante README- und Design-Dokumentation im selben Commit aktualisieren.

## Testing Guidelines
- Mirror the source tree with package-level `_test.go` files and favor table-driven cases.
- Run `go test ./...` from each service root before pushing; add coverage whenever touching `internal` logic or SQL migrations.
- For database-impacting changes, refresh root migrations and validate with `docker compose up` against a clean volume.

## Deployment Discipline
- Treat `github.com/nbt4/cores` as the canonical umbrella repository for the complete Cores stack. Every Core service must be present as a Git submodule, including ProcurementCore and future services.
- After every service release, update and commit all changed service submodule pointers in `cores`, and keep the root Compose files, service inventory, README, and deployment documentation synchronized with the released versions.
- Finish umbrella releases by autonomously merging the validated `cores` release PR into `main`; keep the canonical stack synchronized with the deployed versions.
- For runtime changes, build and push the matching Docker image after validation and checking the latest published tag. Documentation-only changes do not require a new image.
- GitHub (`github.com/nbt4`) is the only source-code remote and source of truth.
- Mirror the build by pushing code to GitHub (per-service repo + `cores` if affected) so image and source stay in sync.
- Before starting a build, check Docker Hub for the most recent matching image tag and bump to the next sequential version, then push both the new tag and `latest` alongside the corresponding GitHub commit.
- Always push work to GitHub and refresh all relevant README files when behavior, configuration, or deployment steps change.
- I AM LOGGED IN YOU CAN JUST EXECUTE THE NEEDED COMMANDS
## Commit & Pull Request Guidelines
- Use imperative, present-tense commit subjects (e.g., `Ensure default admin seeding matches new RBAC`) capped at 72 characters.
- Group related work per service; cross-cutting updates should call out both modules and referenced schema changes in the body.
- PRs must describe the scenario, list test commands, link issues, and include UI screenshots when `web/` assets change.
- Highlight secrets or domain changes for release notes and request review from both service owners on shared infrastructure updates.

## Issues
- When you are working on an Issue change the Label to in_progress.
- When your are done and solved the issue, change the label to done and try to close the Issue
- Report the completed task and relevant remaining blockers after verification; continue work already requested by the user.
