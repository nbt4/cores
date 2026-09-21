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

The Compose source is maintained in Git. Edit environment values in Komodo;
edit Compose in this repository and redeploy the Stack. The explicit
`name: cores` also keeps manual and Komodo deployments in the same Compose
project.

Before a deployment, validate the contract without reading any secret values:

```bash
./scripts/check-env-contract.sh
docker compose --env-file .env -f deploy/docker03/compose.yaml config --quiet
```
