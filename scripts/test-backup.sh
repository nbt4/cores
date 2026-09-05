#!/bin/sh
set -eu
image=${1:-cores-backup-test:stabilization}
test_dir=$(mktemp -d /tmp/cores-backup-test.XXXXXX)
test_name="cores-backup-test-$(basename "$test_dir")"
cleanup() {
  docker rm -f "$test_name" >/dev/null 2>&1 || true
  rmdir "$test_dir"
}
trap cleanup EXIT HUP INT TERM
docker run -d --name "$test_name" --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=isolated-backup-test -e POSTGRES_DB=cores_test postgres:16-alpine >/dev/null
attempt=0
until docker exec "$test_name" pg_isready -U postgres >/dev/null 2>&1; do
  attempt=$((attempt+1))
  [ "$attempt" -lt 30 ] || exit 1
  sleep 1
done
docker exec "$test_name" psql -U postgres -d cores_test -v ON_ERROR_STOP=1 \
  -c "CREATE TABLE backup_probe (id integer PRIMARY KEY, value text NOT NULL); INSERT INTO backup_probe VALUES (1, 'restore this row');" >/dev/null
docker run --rm --network "container:$test_name" \
  -e PGHOST=127.0.0.1 -e PGUSER=postgres -e PGDATABASE=cores_test \
  -e PGPASSWORD=isolated-backup-test -e BACKUP_ONCE=true "$image"
if docker run --rm --network "container:$test_name" \
  -e PGHOST=127.0.0.1 -e PGUSER=postgres -e PGDATABASE=missing_database \
  -e PGPASSWORD=isolated-backup-test -e BACKUP_ONCE=true "$image"; then
  echo "Missing source database was incorrectly accepted" >&2
  exit 1
fi
docker run --rm --user postgres --entrypoint /bin/sh "$image" -c \
  'printf "corrupt dump" > /tmp/corrupt.dump; if verify-backup.sh /tmp/corrupt.dump; then exit 1; fi'
echo "Backup restore and failure-path tests passed"
