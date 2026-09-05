#!/bin/sh
set -eu
umask 077
export PGDATABASE="${PGDATABASE:-${POSTGRES_DB:-rentalcore}}"
export PGUSER="${PGUSER:-${POSTGRES_USER:-rentalcore}}"
export PGHOST="${PGHOST:-postgres}"
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"
backup_dir="${BACKUP_DIR:-/backups}"
mkdir -p "$backup_dir"
stamp=$(date -u +%Y%m%d_%H%M%S)
pending="$backup_dir/cores-$stamp.dump.partial"
archive="$backup_dir/cores-$stamp.dump"
trap 'rm -f "$pending"' EXIT HUP INT TERM
pg_dump --format=custom --file="$pending"
verify-backup.sh "$pending"
mv "$pending" "$archive"
(cd "$backup_dir" && sha256sum "$(basename "$archive")") > "$archive.sha256"
if [ -n "${BACKUP_WEBDAV_URL:-}" ]; then
  upload-backup.sh "$archive"
  upload-backup.sh "$archive.sha256"
fi
# Rotation only follows a verified, successfully uploaded backup.
find "$backup_dir" -maxdepth 1 -type f -name 'cores-*.dump*' -mtime "+${BACKUP_RETENTION_DAYS:-7}" -delete
date +%s > "$backup_dir/.last-success.tmp"
mv "$backup_dir/.last-success.tmp" "$backup_dir/.last-success"
echo "Verified backup completed: $(basename "$archive")"
