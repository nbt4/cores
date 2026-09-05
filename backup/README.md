# Cores database backups

`nobentie/cores-backup:1.0.0` runs the suite's scheduled PostgreSQL backups.
Every dump is restored into a separate temporary PostgreSQL cluster inside the
backup container before it is marked successful. The verification cluster only
listens on a private Unix socket and never restores into the source database.

Backups are written atomically, use mode 0600, include SHA-256 checksums and are
retained locally for `BACKUP_RETENTION_DAYS` (default 7). The interval is controlled
by `BACKUP_INTERVAL_HOURS` (default 24). Failed attempts mark the container
unhealthy; stale successful backups also fail the healthcheck.

Set `BACKUP_WEBDAV_URL` to a dedicated HTTPS collection under the existing
Nextcloud account, for example
`https://cloud.example.com/remote.php/dav/files/backup-user/cores-backups/`.
The parent collection must already exist. The existing
`NEXTCLOUD_WEBDAV_USER` and `NEXTCLOUD_WEBDAV_PASSWORD` credentials are used.
When configured, both dump and checksum must upload successfully before local
rotation and the success marker advance. Remote retention is managed separately;
the service never deletes remote backups.

Without `BACKUP_WEBDAV_URL`, protection covers database mistakes but not loss of
the Docker host. A WebDAV server on that same host also needs an independent
external backup to protect against host loss. Database dumps include sensitive suite data: restrict the backup
account and collection. Uploaded files, branding assets, OAuth registrations,
Mosquitto configuration and LED mapping volumes require separate file backups.
Keep the deployment's `.env` and encryption keys in protected recovery storage.

Build and test:

```sh
docker build -f backup/Dockerfile -t cores-backup-test:stabilization .
sh scripts/test-backup.sh cores-backup-test:stabilization
```

For an immediate production backup, run
`docker compose exec db-backup backup-db.sh` when no scheduled backup is running.
Inspect `docker compose logs db-backup` and Docker health after each deployment.
