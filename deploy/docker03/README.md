# Cores stack on docker03

The production deployment is one Compose project named `cores`. Its canonical
definition is `deploy/docker03/compose.yaml`; all substitutions are documented
once in the repository-root `.env.example`.

## Komodo configuration

Create or update the Stack with these settings:

- Source: Git repository
- Repository: `https://github.com/nbt4/cores.git`
- Branch: `main`
- Compose file: `deploy/docker03/compose.yaml`
- Project name: `cores`
- Environment: the production values corresponding to `.env.example`

Relative bind mounts are resolved from the directory containing this Compose
file. The MCP knowledge mount therefore uses `../../knowledge` to reach the
repository-root knowledge directory after Komodo clones the repository.

Komodo stores the Stack Environment as the stack `.env` and passes it to
Compose. Mark credentials and tokens as secret variables. Do not add additional
service-specific `.env` files; `ADAMHALL_*`, `OPENROUTER_API_KEY`, and all other
settings belong to the single Stack Environment.
Add every `JEV_*` and `OPENROUTER_*` entry from `.env.example` there, including
the empty `OPENROUTER_API_KEY` placeholder until a key is available. Compose
passes these entries to RentalCore and ProcurementCore without inline defaults.

The Compose source is maintained in Git. Edit environment values in Komodo;
edit Compose in this repository and redeploy the Stack. The explicit
`name: cores` also keeps manual and Komodo deployments in the same Compose
project.

Komodo Periphery must have outbound DNS and HTTPS access to `github.com`, since
Periphery performs the clone on the target server. If Komodo's backend network
is declared `internal: true`, attach the Periphery service to an additional
egress-capable network without publishing its port. Keep the `km` CLI version
aligned with the Komodo Core version when automating Stack updates.

Before a deployment, validate the contract without reading any secret values:

```bash
./scripts/check-env-contract.sh
docker compose --env-file .env -f deploy/docker03/compose.yaml config --quiet
```

## Lagerplatzpflege (30.09.2026)

WarehouseCore `5.9.89` und Cores MCP `1.5.20` ergänzen die versionsgesicherte
Lagerplatzpflege. WarehouseCore installiert die idempotente Migration
`046_warehouse_location_version` beim Start. Neue Datenbankvolumes erhalten
denselben Trigger über die Umbrella-Migration `019_warehouse_location_version`.
Der Trigger erhöht `storage_zones.updated_at` bei allen Schreibpfaden. Es sind
keine zusätzlichen Umgebungsvariablen erforderlich; die Ausführung nutzt den
bestehenden OAuth-Scope `cores:warehouse:update` und Warehouse-Adminrechte.

Cores MCP `1.5.20` bietet im OAuth-Dialog außerdem die ausdrückliche Auswahl
Nur Lesen oder Lesen und Schreiben. Bestehende lesende Tokens bleiben lesend;
für Schreibtools den Connector neu verbinden und Lesen und Schreiben wählen.
Es ist keine neue Konfiguration nötig; `MCP_ENABLE_WRITES=true` bleibt erforderlich.

## Hersteller- und Markenpflege (30.09.2026)

WarehouseCore `5.9.91` und Cores MCP `1.5.21` ergänzen die eigenständige
Hersteller- und Markenpflege mit Vorschau und Versionsprüfung. WarehouseCore
installiert die idempotente Migration `047_warehouse_master_version` beim Start;
neue Datenbankvolumes erhalten dieselben Trigger über die Umbrella-Migration
`020_warehouse_master_version`. Die Trigger erhöhen `manufacturer.updated_at`
und `brands.updated_at` bei allen Updates. Ein Herstellerwechsel wird blockiert,
wenn verknüpfte Produkte nicht bereits diese Zuordnung verwenden.

Es sind keine zusätzlichen Umgebungsvariablen nötig. Die Ausführung benötigt
`MCP_ENABLE_WRITES=true`, Warehouse-Adminrechte und den bestehenden Scope
`cores:warehouse:update` oder `cores:write`. Für die vier neuen Werkzeuge die
Tool-Liste im MCP-Client aktualisieren. Vorschauen benötigen ebenfalls den
passenden Schreib-Scope und Warehouse-Administratorrechte.

WarehouseCore `5.9.91` bewahrt bei der historischen Kategorieübersetzung bereits
vorhandene Zielkategorien und ihre Referenzen. Migration `048` (Umbrella `021`)
setzt die Markenidentität auf Name plus Hersteller, einschließlich einer
eindeutigen NULL-Herstellergruppe. Dafür ist PostgreSQL >=15 nötig; der Stack
verwendet Version 16. Es werden keine Kategorien oder Zuordnungen gelöscht.

## Kategoriepflege und Entfernen (30.09.2026)

WarehouseCore `5.9.92` und Cores MCP `1.5.22` ergänzen versionsgesicherte Updates
und das explizit bestätigte Entfernen ungenutzter Haupt-, Unter- und dritter
Kategorien. Produkte oder Kinder sperren die Löschung; widersprüchliche
Produktzuordnungen sperren Elternwechsel. Es gibt kein Cascade oder MCP-Undo.

WarehouseCore installiert `049_warehouse_category_version` beim Start;
frische Datenbankvolumes erhalten dieselben Trigger über Umbrella-Migration
`022_warehouse_category_version`. Die Trigger versionieren auch UI-/Importpfade.
Es sind keine neuen Umgebungsvariablen erforderlich. `MCP_ENABLE_WRITES=true`
und Warehouse-Adminrechte bleiben nötig. Updates verwenden
`cores:warehouse:update`; das Entfernen benötigt neu `cores:warehouse:delete`
oder Legacy `cores:write`. Bestehende granulare Update-Tokens dürfen nicht
löschen; für Löschrechte den Connector neu autorisieren. Tool-Liste im Client
aktualisieren; die zwölf neuen Werkzeuge liefern ihre Felder über
`cores.entities.schema` (`update_fields`, `delete_fields`).

## Produktpakete (30.09.2026)

WarehouseCore `5.9.93` und Cores MCP `1.5.23` bieten geführtes Anlegen und
Bearbeiten von Produktpaketen mit vollständigen Inhalten und optionalen
Bestandteilen. Vorhandene Jobnutzung sperrt Preis- und Inhaltsänderungen;
Metadaten bleiben bearbeitbar. Es werden weder Bestände bewegt noch Produkte
erzeugt. Vier neue Werkzeuge; Schema-Discovery enthält auch `item_fields`.

WarehouseCore installiert `050_warehouse_package_version` beim Start, frische
Volumes erhalten die Trigger über Umbrella-Migration `023`. Versionierung
umfasst Paketmetadaten und Einzelzeilenänderungen in UI-/Importpfaden.
Keine neuen Umgebungsvariablen oder Scopes: Warehouse-Admin und vorhandener
Create-/Update-Scope oder Legacy `cores:write` sind erforderlich.

WarehouseCore `5.9.94` / Cores MCP `1.5.24` ergänzen Einzelgeräte-Anlage und
Metadatenpflege sowie Archivierung/Restore, redigierte Geräte-Audits und den
kontrollierten Rückweg der eigenen letzten unveränderten MCP-Feldänderung.
Migration `051` läuft beim Warehouse-Start; `024_warehouse_device_version.sql`
initialisiert frische Umbrella-Datenbanken. Jede Geräteänderung versioniert;
Archivierung deaktiviert Scan-Kennungen, Restore prüft Referenzen/Kapazität.
Der MCP registriert 173 Werkzeuge (65 Abfragen, 54 Vorschauen, 54 Ausführungen).
Die neuen Aktionen benötigen Warehouse-Admin und create/update/archive-Scope,
Bestätigung, Version und Idempotenz; Archivierung/Revert zusätzlich eine
Geräte- bzw. Audit-gebundene Phrase. Keine endgültige Geräte-Löschung.

WarehouseCore `5.9.95` / Cores MCP `1.5.25` ergänzen geführte Paket-Archivierung
und Restore sowie redigierte Paket-Audits. Admin/archive-Scope, exakte Version,
Idempotenz und Paket-gebundene Phrase sind erforderlich. Aktive Jobs/offene
Reservierungen sperren; Restore prüft Produkte/Bestandteile. Beide Aktionen
setzen Website-Sichtbarkeit auf false und erhalten Historie/Inhaltszeilen.
Keine neue Migration; vorhandene Paket-Versionstrigger gelten weiter.
Geräte-Abhängigkeiten behandeln fehlenden Jobstatus nun ebenfalls als offen.
Der MCP bietet 178 Werkzeuge: 66 Abfragen, 56 Vorschauen, 56 Ausführungen.

WarehouseCore `5.9.96` / Cores MCP `1.5.26` ergänzen Lagerplatz-Archivierung,
Restore und redigierte Audits. Admin/archive-Scope, Version, Idempotenz und
Lagerplatz-gebundene Phrase sind erforderlich. Bestand, aktive Nachfahren,
Heimat-Cases sowie offene Aufgaben/Inventuren sperren. Restore prüft Hierarchie
und Identität; unveränderte MCP-Archive erhalten den belegten Betriebszustand,
ältere/bearbeitete Archive werden gesperrt aktiviert. Keine neue Migration;
vorhandener Lagerplatz-Versionstrigger aus Root `019` bleibt maßgeblich.
Der MCP bietet 183 Werkzeuge: 67 Abfragen, 58 Vorschauen, 58 Ausführungen.
