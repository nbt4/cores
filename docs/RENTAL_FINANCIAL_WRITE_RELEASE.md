# Rental-Finanzrechte für MCP-Schreibabläufe

2026-10-17 · RentalCore **5.3.130** / Cores MCP **1.5.71**

## Rental-Finanzrechte · RentalCore 5.3.130 / MCP 1.5.71

Preisführende Rental-Aktionen verlangen vor Vorschau, Ausführung und Replay
separat `cores:rental:financial`. Organisatorische Jobänderungen bleiben ohne
Finanzfreigabe möglich; Umsatz-/Rabattfelder werden aus Antworten ausgeblendet,
vollständige gespeicherte Belege bleiben erhalten. Gerätezuweisung behält ihren
Update-Scope und verlangt zusätzlich Finanzzugriff. Delegierte Tokens können
keine normalen Job-/History-Endpunkte als Browser-Sitzung verwenden.

Zuerst RentalCore, danach MCP deployen; Laufzeitkonfiguration und Volumes
behalten. Keine Migration, neuen Tools oder Änderungen an anderen Diensten.
Servicevertrag: [Rental-Finanzrechte](../cores-mcp/docs/RENTAL_FINANCIAL_WRITES.md).
Die MCP-Issues #4/#5 bleiben für die übrigen Abnahmepunkte in_progress.

## Vertrag und Grenzen

Zwölf preisführende Aktionen (jeweils plus Vorbereitung): drei Auftragspositions-
aktionen, vier Fremdmietkatalog-Aktionen, vier Fremdmietzuweisungs-Aktionen und
Gerätezuweisung. Finanzprüfung erfolgt zusätzlich zu den bestehenden Nutzer-,
Admin- und Aktionsrechten vor Vorbereitung, Dry-run und gespeicherten Antworten.
Jobfelder revenue/discount/discount_type/multiply_by_days/prices_include_tax
verlangen auch für explizite Null-/False-Werte Finanzzugriff und lösen eine
konkrete OAuth-Nachfreigabe aus. Bestehende Tokens werden nicht erweitert.

Owner und MCP entfernen ohne Finanzfreigabe Umsatz, Endumsatz, Rabatt,
Rabattart, Mehrtagesberechnung und Steuerkennzeichnung rekursiv aus Job-
Vorschauen, Diffs und Erfolgsantworten. Der Owner projiziert nur HTTP-Antworten;
vollständige Auditdaten und gespeicherte Belege werden unverändert erhalten.
Kontext, exakte Versionen und Bestätigungsphrasen bleiben intakt. Mit erneutem
Finanzrecht kann derselbe ursprüngliche Beleg wieder vollständig gelesen werden.
Summenänderungen durch positionsbasierte Neuberechnung bleiben gesperrt.

Vor jeglichem UI-Session-Fallback prüft RentalCore vorhandene Cookie-/Bearer-
Delegationen. Nur POST auf benannte MCP-Endpunkte oder die bestehende exakte
Gerätezuweisungsroute ist erlaubt; Herkunft MCP/AI ist erforderlich.
Gerätezuweisung bindet aktuelle aktive Adminidentität, Nutzer-ID, bisherigen
Update-Scope und separaten Finanzclaim. Native UI-Sitzungen ohne Delegation
bleiben gültig. Material- und Staffing-Kontext sowie deren Historien wurden
geprüft: ihre veröffentlichten Felder enthalten bereits keine Finanzdaten.

Die Legacy-Gerätezuweisung besitzt weiterhin keinen vollständigen atomaren
Owner-Preview-/Audit-/Replay-Vertrag; dessen Abnahme bleibt separat offen.
Ebenso offen: Warehouse-/Planner-Finanzschreiber, weitere Planner-Entitäten,
Dokumente und zusätzliche Undo-Pfade. Parent-Issues werden nicht geschlossen.

## Rollout

Beide Serviceänderungen unabhängig reviewen und validieren, auf GitHub mergen,
Docker Hub auf letzte Versionen prüfen und aus committed Quellcode die jeweils
nächste Version sowie latest mit OCI-Quellrevision veröffentlichen. Anschließend
beide Gitlinks und Compose-Pins im Dachrepository synchron mergen. Auf docker03
nur RentalCore, danach MCP aktualisieren. Runtime-Umgebungen, Volumes, Ports,
Netzwerke und IDs aller anderen Container erhalten. Image-Digest, Quellrevision,
Health und MCP-Readiness prüfen. Produktive Geschäftsdaten bleiben unverändert.

## Quellstände und geprüfte Nachweise

- RentalCore [PR29](https://github.com/nbt4/rentalcore/pull/29),
  `1affda93f491d5df9f28ad10a49d422388e43c61`.
- MCP [PR23](https://github.com/nbt4/cores-mcp/pull/23),
  `24401338c40e730e49e3e6d0f2fccf62535fa06b`.

Beide Dienste vollständig gegen isoliertes PostgreSQL16 geprüft:
`go test -count=1 ./...`, `go test -race -count=1 ./...`, `go vet ./...`
und Serverbuild erfolgreich. Owner-Handlers85.047s, Race65.636s;
MCP-Server27.954s, Race135.450s. Rental-Frontend baut mit npm ci und
npm run build erfolgreich (Vite9.35s). Unabhängiges Review beider
Service-Diffs und der Suite-Konfiguration ohne verbleibende P1/P2-Findings.
Die Suite-CI behält alle bisherigen Tests und führt zusätzlich die neuen
Owner-Finanz-/Delegations-/Job-Receipt-Regressionen mit PostgreSQL und Race aus.
Vollständige echte Ausgaben: [Owner](../rentalcore/docs/RENTAL_FINANCIAL_TESTS.md)
und [MCP](../cores-mcp/docs/RENTAL_FINANCIAL_WRITES_TESTS.md).

Lokale Suite-Gates in Reihenfolge erfolgreich:
`docker compose --env-file .env.example config --quiet`,
`./scripts/check-env-contract.sh`, `sh ./scripts/check-release.sh`,
`./scripts/check-design-system.sh`, `git diff --check`.

```text
Compose environment contract verified
Compose environment contract verified
Release image pins and inventory verified
Designsystem-Prüfung erfolgreich.
```

Live-Prüfungen verwenden Health/Ready und öffentliche OAuth-Metadaten.
Der vorhandene Produktions-MCP hat keinen statischen Lesetoken für einen
vollständigen authentifizierten Tool-Smoke; HTTP-Autorisierung und sämtliche
Scoped-Deskriptoren sind lokal getestet. Keine produktiven Fachdaten ändern.
