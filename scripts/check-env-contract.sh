#!/bin/sh
set -eu

compose_files="docker-compose.yml deploy/docker03/compose.yaml"

declared=$(sed -n 's/^\([A-Z][A-Z0-9_]*\)=.*/\1/p' .env.example | sort)
duplicates=$(printf '%s\n' "$declared" | uniq -d)
if [ -n "$duplicates" ]; then
  echo "Duplicate keys in .env.example:" >&2
  printf '%s\n' "$duplicates" >&2
  exit 1
fi

referenced=$(
  grep -hoE '\$\{[A-Z][A-Z0-9_]*' $compose_files |
    sed 's/^${//' |
    sort -u
)
missing=$(printf '%s\n' "$referenced" | while IFS= read -r key; do
  printf '%s\n' "$declared" | grep -qx "$key" || printf '%s\n' "$key"
done)
if [ -n "$missing" ]; then
  echo "Compose variables missing from .env.example:" >&2
  printf '%s\n' "$missing" >&2
  exit 1
fi

for file in $compose_files; do
  grep -q '^name: cores$' "$file" || {
    echo "$file must declare the Compose project name 'cores'" >&2
    exit 1
  }
  if grep -Eq '^[[:space:]]+env_file:' "$file"; then
    echo "$file must use the single stack environment instead of service-specific env files" >&2
    exit 1
  fi
done

legacy='APP_BASE_URL|DASHBOARD_URL|PLANNER_APP_URL|RENTAL_PUBLIC_URL|WAREHOUSE_PUBLIC_URL'
if grep -hoE '\$\{[A-Z][A-Z0-9_]*' $compose_files | sed 's/^${//' | grep -Eq "^($legacy)$"; then
  echo "Compose input uses a legacy URL alias; use the canonical *CORE_PUBLIC_URL key" >&2
  exit 1
fi

echo "Compose environment contract verified"
