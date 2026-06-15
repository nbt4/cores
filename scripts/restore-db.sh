#!/bin/bash
set -e

# PostgreSQL Restore Script for Cores
# Usage: restore-db.sh <backup-file>

if [ -z "$1" ]; then
  echo "Usage: restore-db.sh <backup-file>"
  exit 1
fi

DB_NAME="${POSTGRES_DB:-rentalcore}"
DB_USER="${POSTGRES_USER:-rentalcore}"
DB_HOST="${PGHOST:-postgres}"

PGPASSWORD="$PGPASSWORD" pg_restore -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists "$1"

echo "Restore completed: $1"
