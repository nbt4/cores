# Procurement-Finanzrechte für Schreibabläufe

2026-10-15: ProcurementCore 1.0.77 und Cores MCP 1.5.65.

Alle 21 preisführenden Angebots-, Bedarfs- und Bestellaktionen samt ihren
Vorbereitungen benötigen zusätzlich zum jeweiligen Aktionsrecht ausdrücklich
`cores:procurement:financial`. Vorschau, Dry-run und gespeicherte Erfolgsantworten
sind eingeschlossen. Produktanlage mit URL, Lieferant oder Angebotspreis wird
vor Shopanalyse/SQL geschützt; der Owner schützt initialOffer auch bei Nullpreis
vor Transaktion und Beleg. Reine Stammdaten bleiben finanzfrei.

MCP signiert die separate Finanzfreigabe mit realer Nutzerkennung und
Aktionsscope. Die Owner-API prüft diese vor jedem Beleg und behält die bisherigen
aktuellen Rollen-/Requester-, Versions-, Kontext- und Bestätigungsprüfungen bei.
Native Umgehungen über fehlenden Origin-Header, leere Cookie/Bearer-Auswahl und
fehlerhafte Zusatzclaims werden gesperrt. Normale UI-Sitzungen bleiben nutzbar;
ungestützte native MCP-Import-/Preisalarmschreibwege werden verweigert.
Die fünf fehlenden Supplier-Send-/Requisition-Order-Einträge sind im zentralen
Mutationsverzeichnis ergänzt; alle 446 vorhandenen Tools behalten Namen/Schemata.

Keine Schema-, Umgebungs- oder UI-Änderung. Bereits erteilte Tokens werden nicht
erweitert. Clients laden Metadaten neu, geben bei Bedarf den Finanzscope
zusätzlich in OAuth frei und erstellen eine neue Vorschau.

## Release-Reihenfolge

Beide Service-PRs unabhängig reviewen, passende Go-/PostgreSQL-/Race-/Frontend-
Prüfungen abschließen und mergen. Docker Hub vor dem Build auf letzte Tags
prüfen; Bilder aus committed Quellcode mit OCI-Revision als jeweilige neue Version
und latest veröffentlichen. Danach beide Submodulzeiger und Compose-Pins im
Dachrepository mergen. Auf docker03 zuerst ProcurementCore, dann MCP ausrollen;
Runtime-Inputs und andere Container unverändert erhalten. Die kurzen
Übergangsminuten können alte Delegationen sicher verweigern.

## Verifikation

Ausschließlich synthetische Daten in isoliertem lokalem PostgreSQL 16 `_test`.
Die vollständigen Go-Tests beider Dienste laufen mit `-count=1`, MCP mit allen
fünf Testdatenbank-URLs; Race prüft beide Auth-/API-/MCP-Grenzen. Die echte
HTTP-MCP-Matrix deckt alle 21 Aktionen und 21 Vorbereitungswerkzeuge ab.
Native Auth-Matrizen prüfen fehlende/falsche Finanzgrants, leere Cookie mit
Bearer-Fallback, fehlenden Origin, Nullpreis und falsch typisierte Claims vor
Datenzugriff. Persistierte Produkt-/Angebotsbelege geben nach Rechteentzug
keine Preise zurück; mit Freigabe bleibt der ursprüngliche Beleg unverändert.

Unabhängiges Review: keine verbleibenden blockierenden Findings. Die gefundenen
Cookie-/Claim-Randfälle sind behoben und mit Regressionstests abgesichert.
Service-Prüfprotokolle stehen jeweils in
`docs/PROCUREMENT_FINANCIAL_WRITES_TESTS.md`.

Issues [#4](https://github.com/nbt4/cores-mcp/issues/4) und
[#5](https://github.com/nbt4/cores-mcp/issues/5) bleiben `in_progress` für die
übrigen Rental-/Planner-/Dokument-/Undo- und Legacy-Writer-Abnahmen.

## Quellstände und lokale Gates

- ProcurementCore: [PR #10](https://github.com/nbt4/procurementcore/pull/10),
  `1cf145706cc0f7c92295ccbd38f413723c1a4a45`.
- Cores MCP: [PR #17](https://github.com/nbt4/cores-mcp/pull/17),
  `9b9e6bac8cea605f00a45d967c4a88487b358df2`.

Die Dachrepository-Gates liefen in dieser Reihenfolge erfolgreich:
`docker compose --env-file .env.example config --quiet`,
`./scripts/check-env-contract.sh`, `sh ./scripts/check-release.sh`,
`./scripts/check-design-system.sh`, `git diff --check`.

```text
Compose environment contract verified
Compose environment contract verified
Release image pins and inventory verified
Designsystem-Prüfung erfolgreich.
```

Vollständige Go-Beweisläufe mit allen passenden isolierten Testdatenbank-URLs:

```text
ok  	procurementcore/cmd/server	0.025s
ok  	procurementcore/internal/amazon	0.031s
ok  	procurementcore/internal/api	42.161s
ok  	procurementcore/internal/auth	0.022s
ok  	procurementcore/internal/config	0.018s
ok  	procurementcore/internal/database	7.156s
ok  	procurementcore/internal/jev	0.036s
ok  	procurementcore/internal/models	0.021s
ok  	procurementcore/internal/orderimport	0.014s
ok  	procurementcore/internal/scraper	0.266s
ok  	procurementcore/internal/service	0.009s
ok  	procurementcore/internal/auth	1.032s
ok  	procurementcore/internal/api	48.699s
ok  	github.com/nbt4/cores-mcp/cmd/server	0.014s
ok  	github.com/nbt4/cores-mcp/cmd/smoke	0.012s
ok  	github.com/nbt4/cores-mcp/internal/authn	0.062s
ok  	github.com/nbt4/cores-mcp/internal/config	0.007s
ok  	github.com/nbt4/cores-mcp/internal/httpx	0.010s
ok  	github.com/nbt4/cores-mcp/internal/mcpserver	21.620s
?   	github.com/nbt4/cores-mcp/internal/store	[no test files]
ok  	github.com/nbt4/cores-mcp/internal/authn	1.267s
ok  	github.com/nbt4/cores-mcp/internal/mcpserver	49.121s
```

Beide Dienste: `go vet ./...` und Serverbuild erfolgreich. Procurement-Frontend:
7 Testdateien, 29 Tests und Vite-Build erfolgreich. Keine UI-Quelländerung.
