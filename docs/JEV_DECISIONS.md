# Jev-Entscheidungsschicht

RentalCore und ProcurementCore können optional das Decision-Modell Jev über
OpenRouter verwenden. Die Integration ergänzt das bestehende Matching; sie
ersetzt weder OCR noch fachliche Validierung.

## Abgedeckte Entscheidungen

- RentalCore: OCR-Position gegen Produkte, Pakete, Mietmaterial und
  Dienstleistungen.
- ProcurementCore: offene PDF-Bestellposition gegen Procurement-Produkte.
- ProcurementCore: Kandidaten für die explizite Verknüpfung eines
  Procurement-Artikels mit WarehouseCore neu ordnen.

Gespeicherte Zuordnungen, exakte Identifikatoren und manuelle Entscheidungen
haben Vorrang. Preise, Mengen, Summen, Datumswerte, Berechtigungen und
Schreibbestätigungen werden niemals durch Jev festgelegt. Ein Warehouse-Link
wird nur nach der bestehenden Benutzeraktion gespeichert.

## Konfiguration

| Variable | Wert in `.env.example` | Bedeutung |
|---|---|---|
| `OPENROUTER_API_KEY` | leer | Laufzeit-Secret; leer deaktiviert Jev |
| `JEV_ENABLED` | `true` | Mit `false` explizit deaktivieren |
| `JEV_API_URL` | `https://openrouter.ai/api/alpha/decisions` | OpenRouter Decisions API |
| `JEV_MODEL` | `typesafe/jev-1.13` | Gepinnte Modellversion |
| `JEV_TIMEOUT` | `3s` | Timeout pro Request |
| `JEV_MIN_CONFIDENCE` | `0.70` | Untergrenze für übernommene Vorschläge |
| `OPENROUTER_SITE_URL` | leer | Optionaler OpenRouter-Attributionsheader |
| `OPENROUTER_APP_NAME` | `Cores` | Optionaler OpenRouter-Attributionsheader |

Alle acht Variablen werden explizit im Komodo Stack Environment gepflegt; die
Compose-Dateien reichen sie ohne eigene Standardwerte an RentalCore und
ProcurementCore weiter. `.env.example` enthält die Vorlage für neue Hosts.
Der API-Key darf nur in einer nicht versionierten Deployment-`.env` oder einem
Secret-Manager liegen. Er wird nicht protokolliert. Ein leerer Key, ein
Netzwerkfehler, ein Timeout, eine ungültige Antwort oder eine zu geringe
Konfidenz führen zum bisherigen lokalen Matching; der Benutzerworkflow bleibt
verfügbar.

## Datenminimierung

Übertragen werden ausschließlich die Beschreibung einer einzelnen Position und
eine begrenzte Menge fachlich vorselektierter Kandidatenmerkmale wie SKU, Name,
Hersteller, Modell, Kategorie oder Lieferanten-SKU. Vollständige PDF-Dateien,
Dokumenttexte, Kunden- und Kontaktdaten, Preise, Zugangsdaten sowie sonstige
Jobdaten werden nicht an OpenRouter gesendet.

Dokument- und Katalogtexte werden ausdrücklich als Daten markiert. Jev darf nur
eine der serverseitig erzeugten Kandidaten-IDs oder `no_match` zurückgeben; jede
Antwort wird vor der Verwendung validiert.
