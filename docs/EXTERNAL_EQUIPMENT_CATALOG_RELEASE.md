# Release: Fremdmietkatalog über MCP

## Versionen und Quellen

| Dienst | Image | Gemergter Quellstand |
| --- | --- | --- |
| RentalCore | `nobentie/rentalcore:5.3.126` | `1f545b644ece785347c6a5f3f01d441cdbaaacda` ([PR #25](https://github.com/nbt4/rentalcore/pull/25)) |
| Cores MCP | `nobentie/cores-mcp:1.5.63` | `d93324bf2ced92c1df5fef5a68f9500c227dfb36` ([PR #15](https://github.com/nbt4/cores-mcp/pull/15)) |

Die zuletzt veröffentlichten Docker-Hub-Tags wurden vor dem Build geprüft:
RentalCore 5.3.125 und MCP 1.5.62. Die nächsten fortlaufenden Tags und `latest`
werden aus `git archive` der gemergten Quellstände mit OCI-Revisionslabels
gebaut. Beide Compose-Dateien, Dienstinventar und Submodulzeiger sind synchron.
Andere Dienste behalten ihre Versionspins.

## Verhalten

`rental.external_equipment.prepare_create/create` ergänzt die eigenständige
Anlage aktiver Fremdmiet-Katalogartikel mit Bezeichnung, Kategorie, Lieferant
und getrenntem Einkaufs-/Kundenmietpreis. Beide Preise sind ausdrücklich
anzugeben; Nullpreise sind erlaubt. Ein optionaler Rental-Lieferantenkontakt
muss aktiv sein und zum Namen passen. Exakte Name/Lieferant-Duplikate werden
auch bei inaktiven Einträgen gesperrt. Ähnliche Treffer verlangen bewusste Prüfung.

Die geführte Vorschau bindet alle Felder, Lieferantenidentität und Kandidaten.
Aktuelle Rental-Adminrechte, Create-Scope, separat erteilter Finanzscope,
exakter Kontext, gebundene Bestätigung und Idempotenz sind erforderlich.
Datensatz, Audit und dauerhafter Wiederholungsbeleg committen gemeinsam.
Wiederholungen prüfen aktuelle Rechte erneut. Lagerartikel, Bestand, Beschaffung
und Jobzuordnungen werden nicht angelegt. Zur anschließenden Jobplanung dienen
die bestehenden `rental.job_external_equipment`-Werkzeuge.

Keine neue Migration, Abhängigkeit oder Umgebungsvariable.
[Anleitung](../cores-mcp/docs/EXTERNAL_EQUIPMENT_CATALOG.md).

## Validierung

- RentalCore: Frontend-Lint (0 Fehler, 5 bestehende Warnungen), Frontend-Build,
  `make build`, `go test -count=1 ./...` mit lokalem PostgreSQL 16 und `go vet ./...`.
- Owner-Integration zusätzlich mit `-race -count=1`: Pflichtfelder, beide Preise,
  Unicode-Grenzen, Lieferantenidentität, Duplikate, konkurrierende DB-Verbindungen,
  Vorschau/Bestätigung, Rechteentzug vor Replay, veraltete Kontexte, Audit-Rollback
  und erfolgreicher Retry. Ausschließlich synthetische lokale Daten.
- MCP: `go test -p 1 -count=1 ./...` mit allen fünf PostgreSQL-Testvariablen und
  lokalem Suite-Schema, Vet, Serverbuild, Auth-/MCP-Race-Tests. Signierte Delegation,
  Dry-run, Retry/Replay, Rechte, Quellen/Zeitstempel, Schema und HTTP-OAuth-Discovery.
- Unabhängiges Review: Requestgrößenbefund auf 256 KiB korrigiert und mit Unicode
  abgesichert. Keine verbleibenden Blocker.

Echte Ausgaben: [RentalCore](../rentalcore/docs/EXTERNAL_EQUIPMENT_CATALOG_TESTS.md),
[MCP](../cores-mcp/docs/EXTERNAL_EQUIPMENT_CATALOG_TESTS.md).

Die Suite-Gates liefen am 2026-10-15 in der Reihenfolge Compose-Syntax,
Umgebungsvertrag, Releasevertrag und Designsystem, jeweils Exit 0. Compose
meldete ausschließlich lokal nicht gesetzte optionale LED-/Jev-/OpenRouter-Werte.

### Compose-Syntax

```text
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"OPENROUTER_SITE_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"OPENROUTER_APP_NAME\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"JEV_ENABLED\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"JEV_MIN_CONFIDENCE\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"JEV_TIMEOUT\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"OPENROUTER_API_KEY\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"JEV_MODEL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"JEV_API_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"JEV_MIN_CONFIDENCE\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"JEV_MODEL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"JEV_API_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"OPENROUTER_API_KEY\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"JEV_ENABLED\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"JEV_TIMEOUT\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"OPENROUTER_SITE_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:03:07+02:00" level=warning msg="The \"OPENROUTER_APP_NAME\" variable is not set. Defaulting to a blank string."
```

### Umgebungsvertrag

```text
Compose environment contract verified
```

### Releasevertrag

```text
Compose environment contract verified
Release image pins and inventory verified
```

### Designsystem

```text
Designsystem-Prüfung erfolgreich.
```

## Rollout und Client-Aktualisierung

Nach erfolgreichen PR-Prüfungen und Veröffentlichung der versionierten Images
wird der kanonische Suite-PR gemergt. Der bestehende Komodo-Checkout auf docker03
erhält den exakten Suite-Commit und seine Submodule. Vor dem Neustart werden
Image-Revisionslabel und unveränderte Laufzeitumgebung, Volumes, Netzwerke und
Ports geprüft. Erst RentalCore mit `docker compose up -d --no-deps --wait`,
danach MCP; alle übrigen Container bleiben erhalten. Laufende Image-ID und
Revisionslabel, Rental-Healthversion 5.3.126 und MCP-Readiness werden geprüft.
Keine produktiven Fachmutationen oder manuellen Migrationen als Release-Test.

Clients laden ihre MCP-Werkzeugdefinitionen per Refresh/Rescan neu. Der
schreibfähige Katalog umfasst 446 Werkzeuge (112 Abfragen, 167 Vorschauen,
167 Ausführungen). Falls erforderlich, Create- und Finanzrechte separat per
OAuth nachfreigeben. Die erste echte Kataloganlage benötigt anschließend
ihre eigene fachlich bestätigte Vorschau.
