# Mietprodukt-Korrektur: Live-Release 5.3.124 / 1.5.62

Der Nutzer hat am 08.10.2026 mit „go live“ den Live-Release beauftragt.
Produktiv laufen vor diesem Release RentalCore 5.3.123 und MCP 1.5.61 gesund.
Eine ausschließlich lesende Schema-Abfrage hat bestätigt, dass
`job_rental_equipment.position_id` und `rental_unit_price` noch fehlen.

## Reihenfolge

1. Service- und Schema-Draft-PRs unabhängig reviewen lassen.
2. Der Nutzer mergt die geprüften PRs gemäß AGENTS.md. Kein Agent merge/push auf main.
3. Ein Mensch spielt die additive Migration von debian01 per SSH ein.
4. Aus den gemergten Service-Commits die freigegebenen Images 5.3.124 / 1.5.62
   mit dem unveränderten Release-Werkzeug bauen und veröffentlichen.
5. Erst nach den Service-Merges die Cores-Submodul-Zeiger und beide Compose-Pins
   auf die freigegebenen neuen Releases aktualisieren, Vertragstests, Draft-PR,
   Review und menschlicher Merge. Andere Dienste/Volumes/Ports bleiben unverändert.
6. Komodo-Stack cores aktualisieren; nur RentalCore und MCP neu erstellen.
7. Gesunde exakte Image-IDs/Revisionen, API-Health und MCP-Bereitschaft lesend prüfen.

Keine automatische Reparatur von JOB001165 oder anderen bestehenden Jobs.
Keine produktiven Buchungen, Mutationen oder MCP-Schreibtests beim Live-Check.

## Manueller Migrationsschritt

Auf debian01 aus dem geprüften Cores-Worktree ausführen. Dieser Befehl ist
für die menschliche Ausführung dokumentiert; der Agent führt ihn nicht aus:

```bash
cd /opt/dev/cores-rental-product-logic
ssh docker03 'docker exec -i postgres sh -c '"'"'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction'"'"'' < migrations/postgresql/049_rental_position_cost_link.sql
```

Die Migration ist identisch zur RentalCore-Migration 051. Sie verändert keine
bestehenden Positionen oder Zuordnungsdaten, sondern ergänzt nullable Link und
Preis-Snapshot, eindeutigen Index, Linkvalidierung und Kosten-Trigger. Beide
vollständigen SQL-Dateien wurden gegen die lokale PostgreSQL-16-Testdatenbank
geprüft, einschließlich einer wiederholten Anwendung bei vorhandenem Altbestand.

Nach der menschlichen Ausführung wird ausschließlich lesend verifiziert:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema=current_schema() AND table_name='job_rental_equipment'
  AND column_name IN ('position_id','rental_unit_price')
ORDER BY column_name;
```

Zusätzlich müssen `idx_jre_position`, `jre_linked_cost_snapshot` sowie die vier
Trigger `validate_job_rental_position_link`, `sync_job_rental_day_costs` und
`sync_job_rental_position_costs` und `normalize_job_rental_captured_cost` vorhanden sein. Vorher keinen neuen Code deployen.

## Basisstand

Der Kandidat übernimmt RentalCore origin/main ada49f6 einschließlich des
Terminradars und der separat gemergten Bestandsformatierung. MCP-Basis ist
origin/main fe8c76e; Cores-Basis ist origin/main 93b94c3. Die bereits veröffentlichten
Änderungen wurden nicht durch einen älteren Checkout ersetzt.

Prüfprotokoll und PR-/Review-Referenzen werden nach den Kandidaten-Gates ergänzt.

## Review-Korrektur: Kompatibilität mit altem RentalCore

Das unabhängige Review hat eine doppelte Kostenskalierung beim alten Handler
nach Schema-vor-Code-Rollout beziehungsweise Code-Rollback reproduziert. Der
neue BEFORE-Kostentrigger normalisiert aus dem vorhandenen Snapshot und macht
die zweite alte Skalierung wirkungslos. Tests prüfen beide Tagesrichtungen,
Legacy-NULL-Snapshot, Nullpreise und den blockierten Repair inkonsistenter
Snapshots. Vorhandene SQL-Dateien außerhalb dieser unveröffentlichten neuen
Migration wurden nicht geändert.
