# Warehouse-Finanzrechte für MCP

2026-10-18 · WarehouseCore **5.9.117**, MCP **1.5.72**

## Warehouse-Finanzrechte · WarehouseCore 5.9.117 / MCP 1.5.72

Produkt-/Paketpreise und Wartungs-/Defektkosten benötigen zusätzlich zum
Aktionsrecht ausdrücklich `cores:warehouse:financial`, auch für Nullpreise
und ausdrückliches Leeren. Das gilt vor Vorbereitung, Dry-run und Replay;
fehlende Finanzrechte lösen eine passende OAuth-Nachfreigabe aus.

Reine Stammdaten- und Lebenszykluspflege bleibt ohne Finanzscope möglich.
MCP und WarehouseCore entfernen dann Preis-/Kostenfelder aus Vorschauen,
Diffs und Antworten. Ausgelassene Preise werden bei Metadatenänderungen unter
Datensatzsperre erhalten. Vollständige Auditdaten und dauerhafte Belege bleiben
unverändert. Wiederholungen prüfen aktuelle Owner-Rechte erneut; nach einem
Finanzgrant kann derselbe native Erfolgsbeleg vollständig gelesen werden.

Delegierte Tokens sind vor jeder Browser-Session auf die benannten Warehouse-
Routen und ihren jeweiligen Aktionsscope begrenzt, einschließlich bisher
öffentlicher Geräte-Endpunkte. Native UI-Sitzungen bleiben nutzbar.
Keine neuen MCP-Tools, Eingabeschemas, Migrationen oder Umgebungsvariablen.
Der Gesamtkatalog bleibt bei 492 Tools; die übrigen Abnahmen für #4/#5 sind offen.

Servicevertrag: [Warehouse-Finanzrechte](../cores-mcp/docs/WAREHOUSE_FINANCIAL_WRITES.md).

Owner- und MCP-Prüfungen laufen mit synthetischen Daten in isoliertem lokalem
PostgreSQL 16. Root-CI behält alle bisherigen Prüfungen und ergänzt die neuen
Warehouse-Finanz-/Boundary-/Produkt-/Paket-Regressionen samt Middleware mit Race.

Release: unabhängiges Review, Go-/PostgreSQL-/Race-/Vet-/Build-Prüfungen, Images
aus committed GitHub-Quellcode nach Prüfung der jeweils letzten Docker-Hub-Version
mit Versions- und latest-Tag plus OCI-Revision veröffentlichen. Beide Gitlinks,
Compose-Pins und Inventory synchronisieren und validierten Suite-PR mergen.
Auf docker03 zuerst nur WarehouseCore, danach nur MCP aktualisieren.
Umgebungen, Volumes, Ports, Netzwerke und alle anderen Container erhalten;
Digest/Revision und Health/Ready/OAuth prüfen. Keine produktiven Fachdaten als
Testdaten verwenden. Authentifizierter kompletter Tool-Smoke bleibt ohne
vorhandenen statischen Lesetoken aus; die HTTP-/Scopeverträge sind lokal geprüft.

Parent-Issues #4/#5 bleiben für weitere Planner-, Dokument-, Undo- und vollständige
Legacy-Writer-Abnahmen in_progress.

## Geprüfter Quellstand

- [Warehouse PR #20](https://github.com/nbt4/warehousecore/pull/20),
  Merge `1e930bc066982c010c8b03e54fed1e9d6c2516a0`.
- [MCP PR #24](https://github.com/nbt4/cores-mcp/pull/24),
  Merge `223ab1c6bde72ffb0c0b5f25967defb16a203a68`.

Beide vollständigen Go-Suiten sowie Race bestanden mit `-count=1`:
MCP internal/mcpserver **31.848 s / 147.792 s**;
Warehouse internal/handlers **51.965 s / 78.592 s**.
Vet und Serverbuilds Exit 0. Warehouse `npm ci && npm run build` Exit 0,
Vite **11.15 s**. Unabhängiges Source-/Dokumentationsreview ohne verbleibende
P1/P2-Befunde; Warehouse-GitHub-Backend und Frontend erfolgreich.
Originale Ausgabe: [MCP-Beweise](../cores-mcp/docs/WAREHOUSE_FINANCIAL_WRITES_TESTS.md)
und [Owner-Beweise](../warehousecore/docs/WAREHOUSE_FINANCIAL_TESTS.md).
