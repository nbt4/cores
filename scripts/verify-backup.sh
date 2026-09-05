#!/bin/sh
set -eu
[ "$#" = 1 ] && [ -s "$1" ] || { echo "Usage: verify-backup.sh <dump>" >&2; exit 1; }
archive=$1
verify_dir=$(mktemp -d /tmp/cores-restore.XXXXXX)
cleanup() {
  pg_ctl -D "$verify_dir/data" -m immediate -w stop >/dev/null 2>&1 || true
  # Only the directory just allocated for this verification is removed.
  rm -rf "$verify_dir"
}
trap cleanup EXIT HUP INT TERM
# Separate temporary PostgreSQL cluster, Unix socket only.
initdb -D "$verify_dir/data" -U postgres -A trust --no-locale > "$verify_dir/init.log" 2>&1
pg_ctl -D "$verify_dir/data" -o "-k $verify_dir -h '' -p 55432" -l "$verify_dir/server.log" -w start >/dev/null
export PGHOST="$verify_dir" PGPORT=55432 PGUSER=postgres PGPASSWORD='' PGDATABASE=restore_check
unset PGSSLMODE PGSERVICE PGSERVICEFILE PGOPTIONS
createdb restore_check
pg_restore --exit-on-error --no-owner --no-privileges --dbname=restore_check "$archive"
tables=$(psql -X -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
[ "$tables" -gt 0 ] || { echo "Restored backup contains no application tables" >&2; exit 1; }
echo "Restore verified: $tables application tables"
