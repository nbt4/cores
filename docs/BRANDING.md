# Cores Brand Guide

## Markenarchitektur

Cores ist eine Familie eigenständiger Produktmarken unter einer gemeinsamen
Unternehmensmarke. In der Anwendung steht immer das Produkt im Vordergrund;
rechtliche, transaktionale und physische Ausgaben tragen die
Unternehmensmarke.

| Kontext | Primäre Marke | Variante |
|---|---|---|
| Erweiterte Sidebar, Desktop-Header | jeweiliges Produkt | `horizontalOnDark` |
| Eingeklappte/mobile Navigation | jeweiliges Produkt | `markOnDark` |
| Login und Splashscreen | jeweiliges Produkt | `stackedOnDark`, darunter „by …“ |
| Browser-Tab | jeweiliges Produkt | `favicon` |
| Installierte PWA | jeweiliges Produkt | `appIcon` / `maskableIcon` |
| Rechnung, Angebot, E-Mail | Unternehmen | `horizontalOnLight`, ersatzweise `print` |
| Geräte- und Versandetikett | Unternehmen | `print` |

Produkt- und Unternehmenslogo dürfen nicht gegeneinander ausgetauscht werden.
Ein Produktlogo gehört insbesondere nicht auf Rechnungen oder physische
Etiketten. Auf dunklen Flächen wird `OnDark`, auf hellen Flächen `OnLight`
verwendet; „Dark“ beschreibt den Hintergrund, nicht die Logofarbe.

## Asset-Empfehlungen

- `mark*`, `favicon`, `appIcon`, `maskableIcon`: annähernd quadratisch
  (Seitenverhältnis 0,8–1,25).
- `horizontal*`: Seitenverhältnis 1,4–6,0.
- `stacked*`: Seitenverhältnis 0,7–1,7.
- Abweichende Seitenverhältnisse werden nicht abgelehnt; die Oberflächen
  skalieren Logos unverzerrt innerhalb der verfügbaren Fläche.
- Digital: SVG oder transparentes PNG; es gibt keine feste Dateigrößengrenze.
- Druck: zusätzlich JPEG; für RentalCore-Labels PNG/JPEG verwenden.
- Maskable Icons: das vollständige Motiv muss innerhalb der zentralen 60 %
  liegen. Ein farbiger Hintergrund gehört in die Datei.
- Logos niemals verzerren, drehen, mit Effekten versehen oder ohne
  ausreichenden Kontrast einsetzen.

## Verwaltung und Auslieferung

Alle individuellen Assets werden unter **Cores Dashboard → Administration →
Branding** hochgeladen. `cores-dashboard` schreibt die semantische Zuordnung in
`branding_config.assets_json`; die Dateien liegen im gemeinsamen Docker-Volume
`tscores_branding-data`. Jeder Service stellt seine öffentliche
`/api/v1/branding`-Konfiguration selbst bereit und prüft Änderungen minütlich.
PWA-Manifeste werden dynamisch und ohne Browser-Cache erzeugt.

Die Spalten `logo_*_sidebar`, `logo_*_login`, `favicon_*` und die Größenfelder
bleiben nur für ältere Clients erhalten. Neue Oberflächen verwenden
ausschließlich die semantischen Asset-Rollen.

## Integrierte Standardassets

Die kanonischen Dateien liegen unter `logos/<produkt>/`. Für jedes Produkt sind
schwarze und weiße Varianten als Bildmarke (`*_icon`), horizontales Logo
(`*_side`) und gestapeltes Logo (`*_full`) in SVG und PNG vorhanden.

Nach einer Änderung synchronisiert folgendes Kommando die Dateien und erzeugt
die vier PWA-Icons neu:

```bash
./scripts/sync-branding-assets.sh
```

Individuelle Uploads im gemeinsamen Volume werden dabei nicht verändert.
