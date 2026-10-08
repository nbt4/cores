# Suite-Prüfprotokoll und genaue Änderungsliste

Stand: 2026-10-08. Drei isolierte Worktrees, je Branch `fix/rental-product-logic`:

- `/opt/dev/rentalcore-rental-product-logic` (Basis `e969e64`)
- `/opt/dev/cores-mcp-rental-product-logic` (Basis `0807e36`)
- `/opt/dev/cores-rental-product-logic` (Basis `62b2aeb`)

Keine Commits, Pull Requests, Releases, Deployments oder Änderungen an
Submodul-Zeigern. Bestehende Arbeitskopien samt fremden Änderungen erhalten.
Die TSU-Nummer wurde nicht vorgegeben; die Branches tragen den fachlichen Namen.

## Verbindliche Suite-Gates

Die Compose-/Release-/Theme-Verträge wurden gegen den vorhandenen Dachcheckout
`/opt/dev/cores` mit initialisierten Submodulen geprüft. Die neue Migration wurde
separat auf der wegwerfbaren lokalen PostgreSQL-16-Datenbank angewandt, nach
sämtlichen vorhandenen Suite-Init-Migrationen. Keines der Vertragsskripte oder
Compose-Dateien wurde verändert. Die Gate-Reihenfolge blieb verbindlich:

1. `docker compose config --quiet` — Exit 0. Warnungen über nicht gesetzte
   optionale Jev/OpenRouter-Schlüssel; keine Secretwerte ausgegeben.
2. `./scripts/check-env-contract.sh` — Exit 0. Echte Ausgabe:

   ```text
   Compose environment contract verified
   ```

3. `sh scripts/check-release.sh` — Exit 0. Echte Ausgabe:

   ```text
   Compose environment contract verified
   Release image pins and inventory verified
   ```

4. `./scripts/check-design-system.sh` — Exit 1, bestehende PlannerCore-Kopien.
   Echte Ausgabe:

   ```text
   Designsystem-Kopie ist nicht aktuell: plannercore/web/src/cores-theme.css
   Designsystem-Helfer ist nicht aktuell: plannercore/web/src/lib/cores-design.ts
   Sprachumschalter-Kopie ist nicht aktuell: plannercore/web/src/lib/SuiteLanguageSwitcher.tsx
   Deutsche Basisübersetzung ist nicht aktuell: plannercore/web/src/lib/cores-locales/de.json
   Englische Basisübersetzung ist nicht aktuell: plannercore/web/src/lib/cores-locales/en.json
   ```

   Der Nutzer hat ausdrücklich erlaubt, diesen fremden Bestandsfehler zu
   dokumentieren. Keine dieser Dateien wurde im Rahmen dieser Korrektur geändert.

Backup-Dateien wurden nicht geändert; das bedingte Backup-Gate ist nicht anwendbar.

RentalCore: Frontend-Lint/Build, Go-Build, sämtliche Go-Tests mit aktivierter
lokaler PostgreSQL-Integration, Vet und UI-Payloadtests grün. Der vorhandene
Formatfehler in 43 unberührten Dateien ist ausdrücklich vom Nutzer als
Bestandsabweichung freigegeben; alle geänderten Go-Dateien sind formatiert.
Siehe RentalCore `docs/RENTAL_POSITION_TESTS.md` für echte Ausgaben.

Cores-MCP: vollständige Go-Tests mit aktivierter lokaler PostgreSQL-Abfrageprüfung,
Vet und Server-Build grün. Bestehende Owner-DDLs wurden nach ausdrücklicher
Freigabe nur in der lokalen Testdatenbank ergänzt. Keine Tests zur Umgehung
fehlender Tabellen deaktiviert; keine fremden Bestandsmigrationen verändert.
Siehe MCP `docs/RENTAL_POSITION_TESTS.md` für echte Ausgaben.

Beide neuen Kostenlink-Migrationsdateien sind inhaltlich identisch (`cmp`, Exit 0).
Die Migration ist idempotent und verändert keine bestehenden Zuordnungsdaten.
`git diff --check` ist in allen drei Worktrees grün.
Ein manueller Browserlauf wurde nicht durchgeführt; React-Anlagepayload,
Job-API-Read und tatsächlicher Analytics-Endpunkt sind automatisiert geprüft.
JOB001165 und sämtliche Produktionsdaten sind unverändert.

## Genaue Liste geänderter und neu hinzugefügter Dateien

### RentalCore (18 Dateien)

- `README.md`
- `docs/JOB_EXTERNAL_EQUIPMENT_MCP.md`
- `docs/RENTAL_POSITION_TESTS.md`
- `internal/handlers/analytics_drilldown.go`
- `internal/handlers/analytics_drilldown_test.go`
- `internal/handlers/position_handler.go`
- `internal/handlers/position_validation_test.go`
- `internal/handlers/rental_job_external_equipment_mcp.go`
- `internal/handlers/rental_job_external_equipment_mcp_integration_test.go`
- `internal/handlers/rental_job_mcp.go`
- `internal/handlers/rental_position_costs.go`
- `internal/models/enhanced_models.go`
- `internal/repository/position_repository.go`
- `migrations/051_rental_position_cost_link.sql`
- `web/src/components/JobPositionsPanel.tsx`
- `web/src/lib/api.ts`
- `web/src/lib/rental-position.ts`
- `web/tests/rental-position.test.mjs`

### Cores-MCP (11 Dateien)

- `README.md`
- `docs/JOB_EXTERNAL_EQUIPMENT_MCP.md`
- `docs/RENTAL_POSITION_TESTS.md`
- `docs/TOOL_CATALOG.md`
- `internal/mcpserver/tool_oauth.go`
- `internal/mcpserver/tool_oauth_test.go`
- `internal/mcpserver/tools_rental.go`
- `internal/mcpserver/tools_rental_job_external_equipment.go`
- `internal/mcpserver/tools_rental_job_external_equipment_integration_test.go`
- `internal/mcpserver/tools_rental_job_external_equipment_test.go`
- `internal/mcpserver/tools_schema.go`

### Cores (3 Dateien)

- `docs/RENTAL_POSITION_COSTS.md`
- `docs/RENTAL_POSITION_TESTS.md`
- `migrations/postgresql/049_rental_position_cost_link.sql`


## Release-Vorbereitung nach „go live“

Die oben stehenden Basis-/Dateilisten dokumentieren den ursprünglichen
Entwicklungsabschluss vor dem Live-Auftrag. Anschließend wurden isoliert
Implementierungscommits erstellt und die aktuellen main-Stände übernommen.
Die neuen Tags sind RentalCore 5.3.124 und Cores-MCP 1.5.62. Die Service-Versionen
sind im jeweiligen Kandidaten aktualisiert; keine neuen Images veröffentlicht.

Die Suite-Prüfungen wurden erneut gegen diesen Cores-Worktree mit exakt
initialisierten, bereits auf origin/main freigegebenen Submodulen ausgeführt:

- `docker compose config --quiet`: Exit 0, Warnungen über ungesetzte lokale
  optionale Stack-Eingaben, keine Secretwerte.
- `./scripts/check-env-contract.sh`: Exit 0, `Compose environment contract verified`.
- `sh scripts/check-release.sh`: Exit 0, `Compose environment contract verified`
  und `Release image pins and inventory verified`.
- `./scripts/check-design-system.sh`: Exit 0, `Designsystem-Prüfung erfolgreich.`

Damit benötigt dieser exakt gepinnte Suite-Checkout keine Theme-Ausnahme.
RentalCore hat separat die auf main gemergte Bestandsformatierung übernommen;
`gofmt -l .` ist vollständig grün. Frontend-Build/Lint, Go-Build, uncached
PostgreSQL-Tests, Vet und 14 Frontendtests wurden nach dem Merge erneut erfolgreich
ausgeführt. MCP-Tests, Vet und Server-Build wurden ebenfalls erneut grün ausgeführt.

Die neue Root-Migration 049 wurde mit allen bestehenden Root-Init-Migrationen
und den bekannten Owner-DDLs auf einem eigenen lokalen Test-Volume geprüft.
Produktiv fehlen die beiden neuen Kostenlink-Spalten noch; der Code wird vor dem
menschlichen Migrationsschritt nicht ausgerollt. Menschlicher Merge und Migration
bleiben gemäß AGENTS.md erforderlich. Ablauf: `docs/RENTAL_POSITION_LIVE.md`.

Die Review-Korrektur ergänzt den vierten Trigger
`normalize_job_rental_captured_cost`. Vollständiger neuer RentalCore-Beweislauf,
Vet, erneute lokale Anwendung der Root-Migration bei bereits vorhandenem Schema,
Migrationsvergleich und git diff --check sind grün. Die alte Handler-Skalierung
wird dadurch sowohl beim Update als auch bei einem Code-Rollback neutralisiert.
