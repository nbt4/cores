#!/bin/sh
set -eu
# Read the unexpanded Compose file, so this check does not need deployment secrets.
images=$(sed -n 's/^[[:space:]]*image: \(nobentie\/[^[:space:]]*\).*/\1/p' docker-compose.yml)
[ "$(printf '%s\n' "$images" | wc -l)" -eq 7 ] || { echo "Expected six Core images and the backup image" >&2; exit 1; }
for image in $images; do
  printf '%s\n' "$image" | grep -Eq '^nobentie/[a-z-]+:[0-9]+\.[0-9]+\.[0-9]+$' || {
    echo "Unpinned suite image: $image" >&2; exit 1;
  }
  grep -Fq "$image" README.md || { echo "Release missing from README: $image" >&2; exit 1; }
  grep -Fq "image: $image" deploy/docker03/compose.yaml || { echo "docker03 release differs: $image" >&2; exit 1; }
done
if grep -Eq 'auth/me.*\|\| true' docker-compose.yml; then
  echo "Dashboard healthcheck masks failures" >&2
  exit 1
fi
echo "Release image pins and inventory verified"
