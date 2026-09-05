#!/bin/sh
set -eu
backup_dir="${BACKUP_DIR:-/backups}"
[ ! -f "$backup_dir/.last-failure" ]
[ -s "$backup_dir/.last-success" ]
last_success=$(head -n 1 "$backup_dir/.last-success")
case "$last_success" in ''|*[!0-9]*) exit 1;; esac
age=$(($(date +%s) - last_success))
[ "$age" -ge 0 ] && [ "$age" -lt "$((${BACKUP_INTERVAL_HOURS:-24} * 3600 + 3600))" ]
