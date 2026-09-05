FROM postgres:16-alpine
RUN apk add --no-cache curl su-exec
COPY --chmod=755 scripts/backup-db.sh scripts/verify-backup.sh scripts/upload-backup.sh scripts/backup-health.sh /usr/local/bin/
COPY --chmod=755 backup/entrypoint.sh /usr/local/bin/cores-backup
HEALTHCHECK --interval=60s --timeout=5s --start-period=300s --retries=3 CMD backup-health.sh
ENTRYPOINT ["cores-backup"]
