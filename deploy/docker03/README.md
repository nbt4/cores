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
