# Cores Designsystem

Dieses Verzeichnis ist die technische Quelle der Wahrheit für das Erscheinungsbild der gesamten Cores Suite.

- `tsunami-theme.css` enthält die verbindlichen Tokens, globalen Bedienelemente und Dashboard-Primitives.
- `.suite-search-field` aus `tsunami-theme.css` ist der verbindliche Wrapper für Suchfeld, vertikal zentrierte Lupe und kollisionsfreien Texteinsatz.
- `cores-design.ts` enthält die einheitliche Datums-, Anzeigenamen- und Begrüßungslogik.
- [`../docs/DESIGN_SYSTEM.md`](../docs/DESIGN_SYSTEM.md) beschreibt die Produkt- und Anwendungsregeln.
- `../scripts/sync-design-system.sh` verteilt die kanonische CSS-Datei in alle eigenständig deploybaren Core-Repositories.
- `cores-dashboard/web/public/cores-theme.css` stellt dieselben Primitives für serverseitige OAuth- und Protokollseiten unter der stabilen Suite-URL `/cores-theme.css` bereit.
- `../scripts/check-design-system.sh` verhindert fehlende oder veraltete Theme-Kopien und nicht standardisierte Dashboard-Begrüßungen.

## Arbeitsablauf

1. Ausschließlich `theme/tsunami-theme.css` im Umbrella-Repository ändern.
2. `./scripts/sync-design-system.sh` ausführen.
3. Die betroffene Oberfläche nur mit vorhandenen Tokens oder den `suite-*`-Primitives implementieren.
4. `./scripts/check-design-system.sh` und anschließend die Web-Builds aller betroffenen Services ausführen.
5. Kanonische Datei, generierte Service-Kopien, Dokumentation und Submodule gemeinsam veröffentlichen.

Die Kopien in den Service-Repositories sind absichtlich eingecheckt: Jeder Core muss ohne das Umbrella-Repository eigenständig gebaut und deployt werden können. Sie dürfen nicht direkt bearbeitet werden.
