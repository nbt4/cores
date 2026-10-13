# WarehouseCore 5.9.114: Statuswechsel von Lageraufgaben

## Release und Freigabe

WarehouseCore `5.9.114` behebt den PostgreSQL-Typkonflikt beim Statuswechsel über
`PATCH /api/v1/warehouse/tasks/{id}/status`. Der Parameter wird in Zuweisung und
`CASE` ausdrücklich als `text` typisiert. Die Health-Version muss zum neuen
Abbild-Tag passen. Es gibt keine Änderung an Schema, Konfiguration, Ports oder
Volumes; andere Dienste erhalten keine neuen Images.

Die Pins für `nobentie/warehousecore:5.9.114` sind in `docker-compose.yml`,
`deploy/docker03/compose.yaml` und `README.md` synchronisiert. Der geprüfte
[Service-PR #16](https://github.com/nbt4/warehousecore/pull/16) wurde mit der
expliziten Nutzerfreigabe am 12. Oktober 2026 gemergt. Das veröffentlichte Abbild
wurde durch `build_and_push_docker.sh` aus dem gemergten Quellstand
`e65e7d1eb6591e19938c84a46dfb994c0bc9b67f` gebaut und mit `5.9.114` sowie `latest`
veröffentlicht. Beide Tags haben den Registry-Digest
`sha256:16fcce38634f8c38a1aff32d231b29a6747e9420a6c8b66ba4f2a02caa901286`.

Das separate Review von `34f4a65..e341c58` fand keine konkreten Fehler im Diff.
Der gemergte Quellstand hat denselben Baum wie der geprüfte Commit. Das Abbild
ist `linux/amd64`, passend zu `docker03`; die lokale veröffentlichte Image-ID ist
`sha256:46fe7489a4a774f045a3c1db1cd9d9e929d29de58dac90cf89e885312ea8c494`.
Die vollständige Prüf- und Build-Ausgabe steht im Service-PR und Release-Protokoll.
`npm ci` meldet 30 bestehende Audit-Funde (1 niedrig, 4 moderat, 24 hoch,
1 kritisch) für die unveränderten Abhängigkeiten. Diese Funde sind im PR dokumentiert.

Alle sieben Submodule enthalten zusätzlich die neue Operationsfreigabe in
`AGENTS.md`. Diese Dokumentations-Commits basieren auf den bisherigen Suite-Pins,
beim Warehouse auf dem oben genannten Release-Commit. Ein Vergleich bestätigt,
dass diese sieben zusätzlichen Commits ausschließlich `AGENTS.md` verändern.
Andere, noch nicht veröffentlichte Dienständerungen werden damit nicht in die
Suite übernommen. Die Regeln sind zugleich in den jeweiligen Dienst-`main`-Branches
über die getrennten Autonomie-PRs gemergt.

## Nachweis

Am 11. Oktober 2026 wurde unter PostgreSQL 16 der Fehler mit dem unveränderten
Handler reproduziert. Der neue Regressionstest verwendet die tatsächliche
`VARCHAR(20)`-Spalte und dieselbe Status-Constraint wie Migration 039. Ohne Fix
antworten alle vier gültigen Statuswerte mit HTTP 400. Mit Fix bestehen
Statuswechsel, Zeitstempelprüfung und negative Anfragefälle.

Die neun Formatfehler sowie alle 49 Frontend-Lintfehler und drei Hook-Warnungen
wurden auf Wunsch des Nutzers korrigiert. Formulare, Rollen, Gerätebaum- und
Labelantworten sind typisiert; Fehlerdaten werden geprüft. Auth-Context und Hook
sind für Fast Refresh getrennt, Ladecallbacks sind stabil und der doppelte
Packlisten-Ladeeffekt ist entfernt. Vier zusätzliche Frontendtests prüfen
Fehlermeldungen und Fallbacks ohne neue Abhängigkeit.

Format, Frontend-Lint, Frontend-Build, Go-Build, Frontendtests, vollständige Go-Tests
mit PostgreSQL (`GOFLAGS=-count=1`) und `go vet ./...` sind grün. Der bestehende
optionale Chromium-Test wird im normalen Testlauf ohne Opt-in ausgelassen. Die
bestehenden Test- und Lintregeln wurden nicht gelockert. Branches und Commits
verwenden ausdrücklich keine TSU-Referenz.

Die Suite-Prüfungen wurden für die vorbereiteten Pins nacheinander ausgeführt:

```text
docker compose --env-file .env.example config --quiet
[Exit 0, leere Ausgabe; ausschließlich Beispielwerte für die Syntaxprüfung]

./scripts/check-env-contract.sh
Compose environment contract verified

sh scripts/check-release.sh
Compose environment contract verified
Release image pins and inventory verified

./scripts/check-design-system.sh
Designsystem-Prüfung erfolgreich.
```

## Produktionsstand und Rollout

Am 11. Oktober 2026 bestätigten HTTP-Healthcheck und ausschließlich lesende
Docker-Inspektion auf `docker03` folgenden Stand:

```text
{"service":"warehousecore","status":"ok","version":"5.9.113"}
HTTP 200
nobentie/warehousecore:5.9.113 running healthy
```

Der [Suite-PR #23](https://github.com/nbt4/cores/pull/23) wurde am 13. Oktober 2026
nach grünen lokalen Gates, grüner GitHub-CI und separatem Review gemergt.
Der produktive Checkout wurde über die vorhandene Komodo-Periphery auf
`3f3546fb083a02c7b717fd96bd92df50a5a66fcc` aktualisiert, einschließlich der
festgelegten Submodulstände. Die acht `AGENTS.md` enthalten die dauerhafte
Operationsfreigabe; die Details stehen in `AGENT_AUTONOMY.md`.

Der Rollout auf `docker03` aktualisierte ausschließlich WarehouseCore mit
`docker compose up -d --no-deps --wait`. Vor dem Neustart wurden Image-Digest
und OCI-Quellrevision geprüft. Die komplette bestehende Laufzeitumgebung wurde
ausschließlich im Arbeitsspeicher übernommen; Secrets wurden weder geschrieben
noch ausgegeben. Vorprüfung und Nachprüfung bestätigten unveränderte Umgebung,
Volumes, Netzwerkzuordnung und Ports. Alle anderen Stack-Container behielten
ihre Container-ID.

Der ausschließlich lesende Live-Nachweis am 13. Oktober 2026 ergab:

```text
DEPLOYED nobentie/warehousecore:5.9.114 healthy
Image ID: sha256:46fe7489a4a774f045a3c1db1cd9d9e929d29de58dac90cf89e885312ea8c494
Source revision: e65e7d1eb6591e19938c84a46dfb994c0bc9b67f
All other stack containers unchanged; runtime environment preserved

GET https://cores.tsunami-events.de/warehousecore/api/v1/health
{"service":"warehousecore","status":"ok","version":"5.9.114"}
HTTP 200
nobentie/warehousecore:5.9.114 running healthy
```

Produktive Aufgaben oder Bestände wurden nicht zu Testzwecken verändert.
Es wurden keine manuellen Produktionsmigrationen ausgeführt.
