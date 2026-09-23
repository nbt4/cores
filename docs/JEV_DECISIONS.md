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
- ProcurementCore: bei widersprüchlichen JSON-LD-/Microdata-Datensätzen das
  Hauptprodukt einer importierten Produktseite auswählen.

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

Beim OCR- und Katalogabgleich werden ausschließlich die Beschreibung einer
einzelnen Position und eine begrenzte Menge fachlich vorselektierter
Kandidatenmerkmale wie SKU, Name, Hersteller, Modell, Kategorie oder
Lieferanten-SKU übertragen. Vollständige PDF-Dateien,
Dokumenttexte, Kunden- und Kontaktdaten, Preise, Zugangsdaten sowie sonstige
Jobdaten werden nicht an OpenRouter gesendet.

Beim Produktlinkimport gehen zusätzlich nur Host, URL-Pfad ohne Parameter,
Seitentitel, sichtbare Überschrift und begrenzte Produktkandidatenmerkmale an
Jev. Vollständiges HTML, Preisfelder und URL-Parameter werden nicht übertragen.
Jev wählt ausschließlich zwischen den aus der Seite extrahierten Produkten und
der bisherigen Vorschau. Bei einer geänderten Produktidentität wird der Preis
zur manuellen Prüfung geleert; die Shop-Adapter bleiben für Artikelmerkmale und
Preisquellen aktiv. Blockiert ein Shop schon den Abruf der Seite, kann Jev keine
fehlenden Produktdaten ergänzen.

Dokument- und Katalogtexte werden ausdrücklich als Daten markiert. Jev darf nur
eine der serverseitig erzeugten Kandidaten-IDs oder `no_match` beziehungsweise
beim Produktlinkimport `keep` zurückgeben; jede Antwort wird vor der Verwendung
validiert.
