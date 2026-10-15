# Cores MCP 1.5.64: Finanz-Lesezugriff

Teilabschluss zu [Issue #4](https://github.com/nbt4/cores-mcp/issues/4) und
[Issue #5](https://github.com/nbt4/cores-mcp/issues/5). Beide Parent-Issues bleiben
`in_progress`; weitere Writer-Finanzrechte, Rental-/Planner-Lifecycle, Dokumente
und definierte Undo-Pfade sind noch offen.

## Quelle und Image

- Dienst-PR: [cores-mcp #16](https://github.com/nbt4/cores-mcp/pull/16).
- Gemergter Dienststand: `bfde0bdfac9af10c050dbc07ce6dfce04088785b`.
- Image: `nobentie/cores-mcp:1.5.64` plus `latest`; Docker Hub wurde vor dem
  Build auf den zuletzt veröffentlichten Tag 1.5.63 geprüft.
- Build aus `git archive` des gemergten Stands, mit OCI-Quell-/Revisionslabels.
- Nur der MCP-Pin und dessen Submodulzeiger ändern sich. Keine Migration, neue
  Abhängigkeit, neue Umgebungsvariable oder Owner-/Frontend-Serviceänderung.

## Verhalten

Geldwerte in lesenden Werkzeugen benötigen das separat gewährte Finanzrecht
des besitzenden Dienstes. Operative Identitäten, Mengen, Termine und Status
bleiben in gemischten Antworten erhalten. Alle sechs Procurement-Audit-Aliase
projizieren ebenfalls Finanzfelder. Rental-Fremdmietpreise gehören zum Rental-
Scope. Rein finanzielle Werkzeuge veröffentlichen OAuth-Scopes und liefern
gezielte Challenges; bestehende vollständige Job-/Positionssperren bleiben.

Query-Projektion, Filter, Sortierung, Joins, Gruppierung und Kennzahlen prüfen
den tatsächlichen Quellfeldscope. Preisgerankte Lieferanten/Preisverläufe sind
SQL-seitig geschützt. Gepoolte Verbindungen können keinen fremden Finanzgrant
übernehmen. Bestehende Auftraggeber-/Mitglieds-/Benutzerrechte gelten zusätzlich.

Der OAuth-Dialog erklärt die konkret angefragten drei Finanzbereiche in DE/EN.
Finanzen und Schreiben bleiben getrennt; Finanzzugriff ist standardmäßig
gesperrt. Read-only-Konfigurationen unterstützen ausdrücklich angefragten
Finanzlesezugriff; Token-Refresh erweitert keine Freigaben.
CSP blockierte außerdem SVG-Inline-Styles: unveränderte Logopfade verwenden
jetzt gleichwertige Präsentationsattribute; die CSP wird nicht gelockert.

[Felder und Ablauf](../cores-mcp/docs/FINANCIAL_READ_ACCESS.md),
[echte Dienst-Prüfausgaben](../cores-mcp/docs/FINANCIAL_READ_ACCESS_TESTS.md),
[Screenshots](../cores-mcp/docs/screenshots/financial-consent/).

## Prüfungen

Vollständige Go-Tests mit `-count=1` und allen PostgreSQL-Testvariablen gegen
einen isolierten lokalen PostgreSQL-16-Testcontainer; Vet und Serverbuild;
Auth-/MCP-Race-Tests; echte HTTP-MCP-Inferenz-/Audit-Alias-/Pool-/Fremdmiet-
Scope-Tests und OAuth-Descriptor-/Challenge-Tests sind erfolgreich. Browser
prüft DE/EN, Light/Dark, sieben Suite-Breakpoints, Readonly/No-finance,
Tastatur/Touch, Label-/Logokontrast und Overflow unter tatsächlicher CSP.
Keine Produktions-Fachdaten als Testdaten. Unabhängiges Review ohne verbleibende
Findings; der gefundene Alias-Bypass und der Logo-CSP-Befund sind abgesichert.

Die Suite-Gates liefen am 2026-10-15 in der dokumentierten Reihenfolge mit
Exit 0. Compose meldet nur lokal nicht gesetzte optionale Variablen.

### Compose-Syntax

```text
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"OPENROUTER_API_KEY\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"JEV_ENABLED\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"JEV_TIMEOUT\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"JEV_MIN_CONFIDENCE\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"JEV_MODEL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"OPENROUTER_SITE_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"JEV_API_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"OPENROUTER_APP_NAME\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"JEV_ENABLED\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"JEV_MODEL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"JEV_TIMEOUT\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"OPENROUTER_API_KEY\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"JEV_API_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"JEV_MIN_CONFIDENCE\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"OPENROUTER_SITE_URL\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"OPENROUTER_APP_NAME\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"LED_MQTT_USER\" variable is not set. Defaulting to a blank string."
time="2026-10-15T15:50:15+02:00" level=warning msg="The \"LED_MQTT_PASS\" variable is not set. Defaulting to a blank string."
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

## Rollout

Nach erfolgreicher Suite-CI und Veröffentlichung des versionierten Images
Suite-PR mergen. Den bestehenden Komodo-Checkout mit Submodulen aktualisieren.
Image-Digest und OCI-Revision sowie vollständige Umgebung, Named Volumes/
Bindmounts/Tmpfs, Netzwerke und Ports vor dem Recreate prüfen. Ausschließlich
MCP mit `docker compose up -d --no-deps --wait cores-mcp` ausrollen.
Anschließend genaue Image-ID/Revision, `/health` Version 1.5.64 und `/ready`
HTTP 200 prüfen; alle übrigen Container müssen ihre IDs behalten.

Bestehende KI-Clients laden die 446 Tooldefinitionen neu und geben benötigte
Finanzscopes ausdrücklich über OAuth frei. Gespeicherte Tokens werden nicht
stillschweigend erweitert. Keine produktiven Finanz-/Geschäftsdatenabrufe
oder Schreiboperationen als Deploymenttest.
