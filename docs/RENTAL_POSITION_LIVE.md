# Mietprodukt-Korrektur: Live-Release 5.3.124 / 1.5.62

Der Nutzer hat am 08.10.2026 mit „go live“ den Live-Release beauftragt.
Produktiv laufen vor diesem Release RentalCore 5.3.123 und MCP 1.5.61 gesund.
Eine ausschließlich lesende Schema-Abfrage hat bestätigt, dass
`job_rental_equipment.position_id` und `rental_unit_price` noch fehlen.

## Ausdrückliche Release-Delegation

Der Nutzer hat anschließend ausdrücklich angewiesen: „merge du bitte und mach
das alles live. ignorier die anforderung“. Diese Freigabe gilt für den vorliegenden
Release und delegiert Merge, produktive Schema-Migration, Image-Veröffentlichung,
Release-Pins und Deployment an den Agenten. AGENTS.md wurde nicht geändert.

## Ausgeführte und verbleibende Release-Schritte

Die unabhängig geprüften PRs RentalCore #21, Cores-MCP #12 und Cores #19 wurden
mit exakt gebundenem Head-Commit gemergt:

- RentalCore: `5f5e07c758b3f1c5a4fc41807a71160b5d882ce4`
- Cores-MCP: `e99893b9769992900b98899defdcd4b53b816fb9`
- Cores-Schema: `e4ef9a38b8e6dde965d9a79e01c5c8e97e65ae37`

Die jeweils gemergten Dateibäume sind identisch zu den zuvor getesteten und
reviewten Kandidaten. Die additive Root-Migration 049 wurde von debian01 per SSH
atomar auf docker03 angewandt (`ON_ERROR_STOP`, einzelne Transaktion,
Lock-Timeout 5 s, Statement-Timeout 60 s). Beide Spalten und alle vier Trigger
wurden anschließend lesend bestätigt. Die vorhandenen Positionen und
Lieferantenkosten von JOB001165 sind nach Prüfsummenvergleich unverändert.
Keine automatische Reparatur oder Testbuchung in Produktion.

Aus den gemergten Commits werden mit dem unveränderten Release-Werkzeug die
Images 5.3.124 / 1.5.62 veröffentlicht. Beide Compose-Dateien, Release-Inventar
und Submodul-Zeiger werden mit den grünen Suite-Verträgen als Release-PR geprüft.
Nach dessen Merge wird der bestehende Komodo-Git-Checkout aktualisiert und
nur RentalCore sowie MCP werden in der Reihenfolge Owner → MCP neu erstellt.
Vor dem Neustart muss die gerenderte Stack-Umgebung exakt den bestehenden
Container-Eingaben entsprechen; Werte werden nicht ausgegeben oder geändert.
Andere Dienste, Volumes und Ports bleiben unverändert.

Abschließend exakte Image-IDs, Quellrevisionen, Health/Bereitschaft,
Schema-Guards und die unveränderten Prüfsummen von JOB001165 bestätigen.
Aktuelle Secrets bleiben ausschließlich in der bestehenden Stack-Umgebung.

## Datenbank-Schema

Migrationen `051_rental_position_cost_link.sql` (RentalCore) und
`049_rental_position_cost_link.sql` (Cores) sind bytegleich. Verifiziert:

```text
position_id|bigint
rental_unit_price|numeric
normalize_job_rental_captured_cost
sync_job_rental_day_costs
sync_job_rental_position_costs
validate_job_rental_position_link
```

Die Migration enthält keine direkte UPDATE-/INSERT-/DELETE-Datenreparatur.
Vorhandene Zuordnungen werden erst in einem separat bestätigten Repair verändert.

## Review-Korrektur: Kompatibilität mit altem RentalCore

Das unabhängige Review hat eine doppelte Kostenskalierung beim alten Handler
nach Schema-vor-Code-Rollout beziehungsweise Code-Rollback reproduziert. Der
neue BEFORE-Kostentrigger normalisiert aus dem vorhandenen Snapshot und macht
die zweite alte Skalierung wirkungslos. Tests prüfen beide Tagesrichtungen,
Legacy-NULL-Snapshot, Nullpreise und den blockierten Repair inkonsistenter
Snapshots. Vorhandene SQL-Dateien außerhalb dieser unveröffentlichten neuen
Migration wurden nicht geändert.

## Veröffentlichte Images

Mit `build_and_push_docker.sh` aus den gemergten Commits veröffentlicht:

| Image | Quellrevision | Registry-Digest |
|---|---|---|
| `nobentie/rentalcore:5.3.124` | `5f5e07c758b3f1c5a4fc41807a71160b5d882ce4` | `sha256:d19cbc2c3b4c638b9e1feee916f8214fda271b2aa6d72dfffbe2283a1aec27d7` |
| `nobentie/cores-mcp:1.5.62` | `e99893b9769992900b98899defdcd4b53b816fb9` | `sha256:ea13a264a0160ce772e6609e71c42a757946f0bf209f60f70b41c0619d56e66c` |

Die Tags `latest` wurden durch das unveränderte Release-Werkzeug mitgeführt;
Compose verwendet ausschließlich die fest gepinnten Versionen.

Nach Aktualisierung beider Pins und Submodule liefen die Suite-Gates wieder in
verbindlicher Reihenfolge grün:

```text
Compose config: Exit 0 (lokale optionale ENV-Warnungen)
Compose environment contract verified
Compose environment contract verified
Release image pins and inventory verified
Designsystem-Prüfung erfolgreich.
```

Diese Release-Änderung bewegt ausschließlich die beiden freigegebenen
Service-Zeiger und Image-Pins; keine fremden Dienste/Volumes/Ports verändert.
