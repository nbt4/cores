#!/bin/sh
set -eu
[ "$#" = 1 ] && [ -s "$1" ] || { echo "Usage: upload-backup.sh <file>" >&2; exit 1; }
: "${BACKUP_WEBDAV_URL:?Set a dedicated backup directory URL}"
: "${NEXTCLOUD_WEBDAV_USER:?Missing WebDAV user}"
: "${NEXTCLOUD_WEBDAV_PASSWORD:?Missing WebDAV password}"
case "$BACKUP_WEBDAV_URL" in https://*) ;; *) echo "Backup WebDAV requires HTTPS" >&2; exit 1;; esac
destination="${BACKUP_WEBDAV_URL%/}"
# Existing collections return 405; other errors must fail the backup.
status=$(curl --silent --show-error --connect-timeout 15 --max-time 60 \
  --user "$NEXTCLOUD_WEBDAV_USER:$NEXTCLOUD_WEBDAV_PASSWORD" \
  --request MKCOL --output /dev/null --write-out '%{http_code}' "$destination/")
case "$status" in 201|405) ;; *) echo "Backup collection failed: HTTP $status" >&2; exit 1;; esac
curl --fail --silent --show-error --retry 3 --connect-timeout 15 --max-time 1800 \
  --user "$NEXTCLOUD_WEBDAV_USER:$NEXTCLOUD_WEBDAV_PASSWORD" \
  --upload-file "$1" "$destination/$(basename "$1")"
echo "WebDAV upload completed: $(basename "$1")"
