#!/bin/bash
set -e

# PostgreSQL Backup Script for Cores
# Uses environment variables from the compose file

DB_NAME="${POSTGRES_DB:-rentalcore}"
DB_USER="${POSTGRES_USER:-rentalcore}"
DB_HOST="${PGHOST:-postgres}"
BACKUP_DIR="/backups"
RETENTION_DAILY=7
RETENTION_WEEKLY=4
DATE=$(date +%Y%m%d)
WEEK=$(date +%Y-W%V)

# Tägliches Backup
PGPASSWORD="$PGPASSWORD" pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -Fc > "$BACKUP_DIR/cores-daily-$DATE.dump"

# Weekly Backup (nur Montags)
if [ $(date +%u) -eq 1 ]; then
  cp "$BACKUP_DIR/cores-daily-$DATE.dump" "$BACKUP_DIR/cores-weekly-$WEEK.dump"
fi

# Rotation: lösche tägliche Backups älter als 7 Tage
find $BACKUP_DIR -name "cores-daily-*.dump" -mtime +$RETENTION_DAILY -delete

# Rotation: behalte nur die letzten 4 weekly Backups
ls -t $BACKUP_DIR/cores-weekly-*.dump 2>/dev/null | tail -n +$((RETENTION_WEEKLY+1)) | xargs rm -f

echo "Backup completed: $(date)"
