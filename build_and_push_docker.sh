#!/usr/bin/env bash
set -euo pipefail
service=${1:?Usage: build_and_push_docker.sh <service> <version>}
version=${2:?Supply the next sequential X.Y.Z version}
case "$service" in cores-dashboard|rentalcore|warehousecore|plannercore|procurementcore|cores-mcp) repo="$service"; dockerfile=Dockerfile;;
  cores-backup) repo=.; dockerfile=backup/Dockerfile;;
  *) echo "Unknown suite image: $service" >&2; exit 1;;
esac
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Invalid version" >&2; exit 1; }
release_dir=$(mktemp -d /tmp/cores-release.XXXXXX)
trap 'rm -f "$release_dir/tags.json" "$release_dir/tags"; rmdir "$release_dir"' EXIT
url="https://hub.docker.com/v2/repositories/nobentie/$service/tags?page_size=100"
: > "$release_dir/tags"
while [ -n "$url" ]; do
  status=$(curl --silent --show-error --retry 3 --output "$release_dir/tags.json" --write-out '%{http_code}' "$url")
  if [ "$status" = 404 ] && [ ! -s "$release_dir/tags" ]; then break; fi
  [ "$status" = 200 ] || { echo "Docker Hub tag lookup failed: HTTP $status" >&2; exit 1; }
  jq -r '.results[].name | select(test("^[0-9]+\\.[0-9]+\\.[0-9]+$"))' "$release_dir/tags.json" >> "$release_dir/tags"
  url=$(jq -r '.next // empty' "$release_dir/tags.json")
done
latest=$(sort -V "$release_dir/tags" | tail -1)
expected=1.0.0
if [ -n "$latest" ]; then expected=$(printf '%s\n' "$latest" | awk -F. '{print $1"."$2"."($3+1)}'); fi
[ "$version" = "$expected" ] || { echo "Latest is ${latest:-none}; expected $expected, got $version" >&2; exit 1; }
revision=$(git -C "$repo" rev-parse HEAD)
# Build only committed source. Unrelated local edits never enter released images.
git -C "$repo" archive HEAD | docker build -f "$dockerfile" \
  --label "org.opencontainers.image.revision=$revision" \
  --label "org.opencontainers.image.source=https://github.com/nbt4/${service/cores-backup/cores}" \
  -t "nobentie/$service:$version" -t "nobentie/$service:latest" -
docker push "nobentie/$service:$version"
docker push "nobentie/$service:latest"
echo "Published $service:$version from $revision"
