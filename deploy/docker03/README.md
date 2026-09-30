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
