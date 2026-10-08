# Release: Terminradar, RentalCore 5.3.123

Der Nutzer hat das produktive Ausrollen des konkreten Terminradar-Fixes
freigegeben. Die TSU-Zuordnung ist auf Nutzerwunsch für diese Arbeit entfallen.
Der Merge bleibt nach den Repo-Regeln dem Nutzer vorbehalten; ohne einen Merge
oder eine ausdrückliche Ausnahme dafür erfolgt weder Veröffentlichung noch
Deployment. Alle folgenden Release-Aktionen sind vorbereitet, noch nicht ausgeführt.

Das Release verwendet den geprüften RentalCore-Commit
`df545b917aa7f02cacb778fb2350099accf01185`, auf Basis des aktuellen
main mit allen Funktionen des produktiven Releases 5.3.122. Die Versionskonstante,
Referenz-Compose, produktive Compose und README nennen einheitlich 5.3.123;
der Submodul-Zeiger zeigt auf denselben geprüften Dienst-Commit.
Andere Dienst-Pins, Ports, Volumes und Umgebungsschlüssel werden nicht geändert.

Der [Dienst-PR #17](https://github.com/nbt4/rentalcore/pull/17) behebt automatische
Aktualisierung, lokale Tageswechsel und das Verdrängen laufender/kommender
Termine durch überfällige Jobs. Ein Teilfehler bricht die Partneranfrage ab;
Navigation räumt beide Anfragen auf. Zwölf Node20-Regressionsfälle und lokale
Chromium-Prüfungen mit erfundenen Daten bestehen. Der Teilfehlertest schlägt ohne
Fix nachweislich fehl. Die Go-Prüfung lief mit `-count=1`; unveränderte
PostgreSQL-Integrationstests überspringen sich mangels Testdatenbank selbst.
Die vom Nutzer erlaubten 43 vorhandenen Formatabweichungen sind dokumentiert;
Lint, Frontend-Build, Go-Build, Go-Tests und Vet sind grün.
[Ungekürztes Dienst-Testprotokoll](../rentalcore/docs/validation/terminradar-release-5.3.123.md).

Ein eigener Review-Agent hat den finalen Dienst-PR geprüft, den zuvor gefundenen
Teilfehler-Abbruch erneut beurteilt und keine weiteren Findings gemeldet.
Er hat die zwölf Node20-Regressionsfälle selbst frisch ausgeführt. Die übrigen
Gates und Browserprüfungen wurden anhand des tatsächlichen Testprotokolls
geprüft. Keine eigenen Produktions- oder Datenbanktests im Review.
Der Suite-PR wird separat nach Erstellung geprüft.

## Lokales Release-Abbild

Das Abbild entstand ausschließlich aus `git archive` des genannten Commits.
Das OCI-Revisionslabel wurde gegen den Submodul-Commit geprüft. Die OCR-Imports
wurden anschließend frisch in einem lokalen Container mit deaktiviertem Netzwerk
und überschriebenem Einstiegspunkt geprüft; der Server wurde dabei nicht gestartet.

```text
Image: nobentie/rentalcore:5.3.123
Image-ID: sha256:5e615db4340b17453f8a41f2b972133181431c2e8ff31acfa855344d072c2db8
Quellen-Commit: df545b917aa7f02cacb778fb2350099accf01185
```

## Vorgesehener Rollout

1. Nutzer-Merge des geprüften Dienst-PRs.
2. Prüfen, dass 5.3.123 auf Docker Hub weiterhin unveröffentlicht ist; das exakte
   lokale Release-Abbild veröffentlichen. Keine bestehende Version überschreiben.
3. Nutzer-Merge des Suite-Release-PRs.
4. Git-Quelle des bestehenden Komodo-Stacks `cores` auf docker03 aktualisieren.
   Nur RentalCore mit dessen bestehender Stack-Umgebung und Volumes ausrollen.
5. Image-ID und OCI-Revisionslabel, Container-Health und öffentliche
   RentalCore-Health-Version 5.3.123 lesend prüfen. Keine produktiven Fachmutationen
   und keine Produktions-Smoke- oder Integrationstests durchführen.

Die Änderung ergänzt keine Migration und keinen Start-Schema-Code. Das
bestehende Startverhalten wird nicht erweitert. Der bisherige Tag 5.3.122 bleibt
als Rückkehrversion erhalten, falls der neue Container nicht gesund wird.

## Tatsächliche Suite-Gates

Die vier Pflichtstufen liefen auf dem isolierten Release-Worktree nacheinander
und endeten jeweils mit Exit 0. Compose prüft ohne Deployment-Secrets; es meldet
nur ungesetzte optionale Variablen. Der Backup-Dienst wurde nicht geändert.

### Compose-Syntax

`docker compose config --quiet`

```text
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"JEV_MODEL\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"JEV_TIMEOUT\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"JEV_MIN_CONFIDENCE\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"OPENROUTER_SITE_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"OPENROUTER_APP_NAME\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"OPENROUTER_API_KEY\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"JEV_API_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"JEV_ENABLED\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"JEV_TIMEOUT\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"OPENROUTER_APP_NAME\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"JEV_API_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"JEV_MIN_CONFIDENCE\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"OPENROUTER_SITE_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"JEV_MODEL\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"OPENROUTER_API_KEY\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"JEV_ENABLED\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-08T08:23:32+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
```

### Umgebungs-Vertrag

`./scripts/check-env-contract.sh`

```text
Compose environment contract verified
```

### Release-Vertrag

`sh scripts/check-release.sh`

```text
Compose environment contract verified
Release image pins and inventory verified
```

### Designsystem

`./scripts/check-design-system.sh`

```text
Designsystem-Prüfung erfolgreich.
```

## Image-Build: Exit 0

Letzte tatsächliche Build-Ausgabe:

```text
#32 [stage-3  8/13] RUN /opt/ocr-venv/bin/python3 -c "import click, pandas, pdfplumber, rapidfuzz"
#32 CACHED

#33 [stage-3  9/13] COPY --from=frontend-builder /app/web/dist web/dist
#33 DONE 0.2s

#34 [stage-3 10/13] COPY --from=builder /app/web/static web/static
#34 DONE 0.5s

#35 [stage-3 11/13] COPY --from=builder /app/web/templates web/templates
#35 DONE 0.4s

#36 [stage-3 12/13] COPY --chown=appuser:appgroup migrations/ migrations/
#36 DONE 1.1s

#37 [stage-3 13/13] RUN mkdir -p uploads logs archives keys /var/lib/branding/logos && 	chown -R appuser:appgroup /app /var/lib/branding
#37 DONE 2.5s

#38 exporting to image
#38 exporting layers
#38 exporting layers 0.6s done
#38 writing image sha256:5e615db4340b17453f8a41f2b972133181431c2e8ff31acfa855344d072c2db8 done
#38 naming to docker.io/nobentie/rentalcore:5.3.123 0.0s done
#38 DONE 0.7s
```

## Frische OCR-Runtime-Prüfung: Exit 0

```text
OCR runtime imports OK
```
