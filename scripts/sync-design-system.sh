#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
source_file="$repo_root/theme/tsunami-theme.css"
typescript_source="$repo_root/theme/cores-design.ts"

targets="
$repo_root/cores-dashboard/web/src/cores-theme.css
$repo_root/cores-dashboard/web/public/cores-theme.css
$repo_root/plannercore/web/src/cores-theme.css
$repo_root/procurementcore/web/src/cores-theme.css
$repo_root/rentalcore/web/src/cores-theme.css
$repo_root/rentalcore/web/static/css/cores-theme.css
$repo_root/warehousecore/web/src/cores-theme.css
"

typescript_targets="
$repo_root/cores-dashboard/web/src/lib/cores-design.ts
$repo_root/plannercore/web/src/lib/cores-design.ts
$repo_root/procurementcore/web/src/lib/cores-design.ts
$repo_root/rentalcore/web/src/lib/cores-design.ts
$repo_root/warehousecore/web/src/lib/cores-design.ts
"

if [ "${1:-}" = "--check" ]; then
  status=0
  for target in $targets; do
    if [ ! -f "$target" ] || ! cmp -s "$source_file" "$target"; then
      printf '%s\n' "Designsystem-Kopie ist nicht aktuell: ${target#"$repo_root/"}" >&2
      status=1
    fi
  done
  for target in $typescript_targets; do
    if [ ! -f "$target" ] || ! cmp -s "$typescript_source" "$target"; then
      printf '%s\n' "Designsystem-Helfer ist nicht aktuell: ${target#"$repo_root/"}" >&2
      status=1
    fi
  done
  exit "$status"
fi

for target in $targets; do
  mkdir -p "$(dirname -- "$target")"
  cp "$source_file" "$target"
done

for target in $typescript_targets; do
  mkdir -p "$(dirname -- "$target")"
  cp "$typescript_source" "$target"
done

printf '%s\n' "Designsystem in alle Core-Webclients synchronisiert."
