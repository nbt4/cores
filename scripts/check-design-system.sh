#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)

"$script_dir/sync-design-system.sh" --check

for service in cores-dashboard plannercore procurementcore rentalcore warehousecore; do
  main_file="$repo_root/$service/web/src/main.tsx"
  if ! grep -q "./cores-theme.css" "$main_file"; then
    printf '%s\n' "Theme-Import fehlt: ${main_file#"$repo_root/"}" >&2
    exit 1
  fi
done

if grep -R -n --include='*.tsx' -E '>Moin([,!.<]|$)|Guten Überblick' \
  "$repo_root/cores-dashboard/web/src" \
  "$repo_root/plannercore/web/src" \
  "$repo_root/procurementcore/web/src" \
  "$repo_root/rentalcore/web/src" \
  "$repo_root/warehousecore/web/src"; then
  printf '%s\n' "Nicht standardisierte Dashboard-Begrüßung gefunden." >&2
  exit 1
fi

printf '%s\n' "Designsystem-Prüfung erfolgreich."
