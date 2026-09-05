#!/bin/sh
set -eu
if [ "$(id -u)" = 0 ]; then
  mkdir -p /backups
  chown postgres:postgres /backups
  chmod 700 /backups
  exec su-exec postgres "$0" "$@"
fi
for value in "${BACKUP_INTERVAL_HOURS:-24}" "${BACKUP_RETENTION_DAYS:-7}"; do
  case "$value" in ''|*[!0-9]*|0) echo "Backup intervals must be positive integers" >&2; exit 1;; esac
done
while :; do
  if backup-db.sh; then
    rm -f /backups/.last-failure
  else
    date +%s > /backups/.last-failure
    echo "Backup, restore verification or upload failed" >&2
    [ "${BACKUP_ONCE:-false}" = true ] && exit 1
  fi
  [ "${BACKUP_ONCE:-false}" = true ] && exit 0
  sleep "$((${BACKUP_INTERVAL_HOURS:-24} * 3600))"
done
