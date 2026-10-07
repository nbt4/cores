# Release: Mietprodukte am Job

Geplante Abbilder: `nobentie/rentalcore:5.3.122` und
`nobentie/cores-mcp:1.5.61`. Andere Dienst-Pins, Ports, Netzwerke und Volumes
bleiben unverändert. Die Dienst-Commits werden vor Veröffentlichung gemergt;
Entwurfs-PRs und menschliche Merge-Freigabe sind erforderlich. Der Nutzer hat
den Livegang dieser Erweiterung ausdrücklich angefordert.

## Reihenfolge

1. Dienst-PRs prüfen und durch den Nutzer mergen. Lokale Images entstehen aus
   den exakt eingecheckten Dienstquellen, einschließlich OCI-Revisionslabel.
2. Nach dem Merge die versionierten Abbilder veröffentlichen. Keine bereits
   veröffentlichte Versionsnummer überschreiben.
3. Den Suite-Release-PR mit beiden neuen Pins und Dienst-Commits mergen.
4. Über den bestehenden Komodo-Stack `cores` die Git-Quelle aktualisieren.
   Zuerst nur RentalCore, danach nur Cores-MCP ausrollen. Bestehende Stack-
   Umgebung und Volume-Namen verwenden. PostgreSQL wird nicht neu erstellt.
5. Gesunde Container, exakte Image-ID/Revisionslabel, Rental-Health-Version
   und MCP-Readiness prüfen. Keine produktiven Fachmutationen ausführen.
   Die Smoke-Suite aus `cmd/smoke` darf laut Dienst-AGENTS.md nur lokal laufen.
6. MCP-Client-Definitionen aktualisieren. Die beiden neuen Tools benötigen
   persönliche Rental-Create- und separat erteilte Finanzrechte. Jede Anlage
   braucht eine frische Vorschau und eine eigene fachliche Bestätigung.

## Verhalten

Das neue Werkzeugpaar weist ausschließlich vorhandene aktive
Fremdmiet-Katalogartikel zu. Quantity und Miettage sind explizit. Der
Lieferanten-Tagesmietpreis und `multiply_by_days` bestimmen die Mietkosten;
Kundenpreis und Auswirkungen stehen in der Vorschau. Fehlende Lieferantenpreise
und vorhandene Zuordnungen blockieren Create. Zuordnung, Jobversion,
Jobhistorie, Audit und dauerhafter Wiederholungsbeleg bilden eine Transaktion.

Die Änderung fügt keinen Start-Schema-Code hinzu und benötigt keine Migration
auf der laufenden Produktionsdatenbank. Das bestehende `job_rental_equipment`
und die bereits vorhandenen Audit-/Receipt-Tabellen werden verwendet.

## Prüfprotokolle

Die vollständigen Dienstprüfungen stehen jeweils in
`docs/JOB_EXTERNAL_EQUIPMENT_TESTS.md` der beiden Dienst-Repositories. Sie
umfassen echte lokale PostgreSQL-Prüfungen, OAuth/Transport, Replay nach
Rechteentzug, Duplikate, fehlende Preise, veraltete Vorschauen und Audit-Rollback.
Die bestehenden 43 RentalCore-Formatabweichungen sind vom Nutzer ausdrücklich
als Ausnahme freigegeben; der reparierte Frontend-Lint hat null Fehler und fünf
sichtbare vorhandene Hook-Warnungen. Neue Abhängigkeiten wurden nicht hinzugefügt.

Die Suite-Gates werden vor dem Release-PR in der bindenden Reihenfolge geprüft
und ihre echte Ausgabe hier ergänzt.

## Geprüfte Dienst-Commits

- RentalCore 5.3.122: `e31f09ed85a4d0af6326a52a4a787fac4d10ee48`.
- Cores-MCP 1.5.61: `0807e364d2332c22d1693ef5801e74c73cfb374f`.

Die Release-Prüfung auf docker03 war ausschließlich lesend: Die laufenden
Abbilder sind RentalCore 5.3.121 und Cores-MCP 1.5.60, beide gesund. Die
bestehenden Zuordnungs-, Katalog-, Historien-, Audit- und Receipt-Tabellen
sind vorhanden. Der Stack steht auf dem bisherigen Suite-Commit; es wurde
kein Deployment ausgelöst.

## Suite-Gates

Die Gates liefen nacheinander; alle vier Commands endeten mit Exit 0.
`docker compose config --quiet` prüft Syntax ohne Deployment-Secrets. Es
meldet ausschließlich die in der lokalen Umgebung ungesetzten optionalen
Jev/OpenRouter/MQTT-Werte. Der Backup-Dienst wurde nicht geändert.

### Compose-Syntax

```text
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"OPENROUTER_API_KEY\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"JEV_ENABLED\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"OPENROUTER_SITE_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"OPENROUTER_APP_NAME\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"JEV_API_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"JEV_MODEL\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"JEV_TIMEOUT\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"JEV_MIN_CONFIDENCE\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"JEV_API_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"JEV_MIN_CONFIDENCE\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"OPENROUTER_API_KEY\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"JEV_ENABLED\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"JEV_MODEL\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"OPENROUTER_SITE_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"JEV_TIMEOUT\" variable is not set. Defaulting to a blank string."
time="2026-10-07T17:17:52+02:00" level=warning msg="The \"OPENROUTER_APP_NAME\" variable is not set. Defaulting to a blank string."
```

### Umgebungs-Vertrag

```text
Compose environment contract verified
```

### Release-Vertrag

```text
Compose environment contract verified
Release image pins and inventory verified
```

### Designsystem

```text
Designsystem-Prüfung erfolgreich.
```

## Lokale Abbilder und Review

Beide Docker-Abbilder wurden erfolgreich aus `git archive HEAD` gebaut, mit
OCI-Quell- und Revisionslabel. Sie wurden noch nicht nach Docker Hub übertragen.

| Abbild | Lokale Image-ID | Quellen-Commit |
|---|---|---|
| `nobentie/rentalcore:5.3.122` | `sha256:6b699a6925fe28b1b987c36ee3e6f5d19be8215c75ba850efbaebb19481d19bc` | `e31f09ed85a4d0af6326a52a4a787fac4d10ee48` |
| `nobentie/cores-mcp:1.5.61` | `sha256:d2f7a05bce388f4dab241a31383eae36ead257b45dfa9a36da9e7699a03ff847` | `0807e364d2332c22d1693ef5801e74c73cfb374f` |

RentalCores finaler Docker-Build hat auch die OCR-Runtime mit den vorhandenen
Imports (`click`, `pandas`, `pdfplumber`, `rapidfuzz`) geprüft.

Ein separater Review-Agent hat die beiden Dienst-Diffs und den Suite-Release-
Diff statisch geprüft und keine blockierenden Findings gemeldet. Geprüft wurden
Authentifizierung, aktuelle Rechte vor Replay, Vorschau-/Versionsbindung, Preise,
Duplikate, atomare Historie/Audit/Receipt, MCP/OAuth/Schemas, Frontend-Importe
und zusammenpassende Pins/Commits. Der Review führte keine eigenen Tests und
keine Browser-/Image-/Produktionsprüfung aus. Zusätzlich wurden die neuen
Tests mit sichtbaren Testnamen ohne Cache erneut lokal ausgeführt:

### MCP/OAuth/Referenzauflösung

```text
=== RUN   TestPositionOAuthDiscoveryAndChallengeAcrossHTTP
--- PASS: TestPositionOAuthDiscoveryAndChallengeAcrossHTTP (1.21s)
=== RUN   TestExternalRentalAssignmentReferenceResolution
--- PASS: TestExternalRentalAssignmentReferenceResolution (0.12s)
=== RUN   TestExternalRentalAssignmentDelegationDryRunRetryAndRights
--- PASS: TestExternalRentalAssignmentDelegationDryRunRetryAndRights (0.00s)
=== RUN   TestExternalRentalAssignmentScopesAndCompleteSchema
--- PASS: TestExternalRentalAssignmentScopesAndCompleteSchema (0.00s)
PASS
ok  	github.com/nbt4/cores-mcp/internal/mcpserver	1.346s
```

### RentalCore-Zuweisung

```text
=== RUN   TestRentalJobExternalEquipmentAtomicAssignmentAndGuards
--- PASS: TestRentalJobExternalEquipmentAtomicAssignmentAndGuards (1.25s)
PASS
ok  	go-barcode-webapp/internal/handlers	1.288s
```

## Veröffentlichung angehalten

Am 2026-10-07 hat GitHub den Push von `feat/mcp-job-external-equipment` nach
`nbt4/cores-mcp` zweimal mit `Internal Server Error` abgelehnt. Das Konto hat
laut GitHub-API ausdrücklich Push-Rechte. Die GitHub-Request-IDs waren
`FE9B:33290B:2235A7:2697B8:6AC661B2` und
`F71F:8536A:235D1D:27C84B:6AC661F6`. Gemäß AGENTS.md Abschnitt 11 wurden
weitere Push-Versuche angehalten. Es bestehen deshalb noch keine GitHub-PRs
für dieses Paket.

Die lokale Entwicklung, Tests, Review-Unterlagen und Images sind fertig.
GitHub-Veröffentlichung, menschlicher Merge, Docker-Hub-Push und produktiver
Rollout stehen aus. Die erteilte Deployment-Freigabe gilt weiterhin für dieses
Release-Paket. Der nächste Schritt ist ein freigegebener neuer Push-Versuch,
anschließend die Entwurfs-PRs und der menschliche Merge gemäß Workflow.
