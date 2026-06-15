#!/bin/bash
set -e

# Upload latest backup to Nextcloud via WebDAV

NEXTCLOUD_URL="${NEXTCLOUD_WEBDAV_URL:-https://nextcloud.server-nt.de/remote.php/dav/files/noah/cores-backups/}"
NEXTCLOUD_USER="${NEXTCLOUD_WEBDAV_USER:-}"
NEXTCLOUD_PASS="${NEXTCLOUD_WEBDAV_PASSWORD:-}"

LATEST=$(ls -t /backups/cores-daily-*.dump 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
  echo "No backup file found in /backups/"
  exit 1
fi

if [ -z "$NEXTCLOUD_USER" ] || [ -z "$NEXTCLOUD_PASS" ]; then
  echo "NEXTCLOUD_WEBDAV_USER or NEXTCLOUD_WEBDAV_PASSWORD not set"
  exit 1
fi

curl -u "$NEXTCLOUD_USER:$NEXTCLOUD_PASS" -T "$LATEST" "${NEXTCLOUD_URL}$(basename $LATEST)"

echo "Uploaded: $LATEST"
