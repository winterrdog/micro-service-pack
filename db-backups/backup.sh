#!/bin/sh

# automated postgresql backup script
# backs up both auth and payment databases

set -e

# configuration
BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$BACKUP_DIR/backup.log"

# database configurations
AUTH_CONTAINER="auth-db"
AUTH_DB="nest"
AUTH_USER="postgres"

PAYMENT_CONTAINER="payments-db"
PAYMENT_DB="payments"
PAYMENT_USER="postgres"

# logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "starting database backup process"

# backup auth database
log "backing up auth database..."
AUTH_BACKUP_FILE="$BACKUP_DIR/auth_db_${TIMESTAMP}.sql.gz"
docker exec -t "$AUTH_CONTAINER" pg_dump -U "$AUTH_USER" -d "$AUTH_DB" --clean --if-exists | gzip > "$AUTH_BACKUP_FILE"

if [ -f "$AUTH_BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$AUTH_BACKUP_FILE" | cut -f1)
    log "auth database backup completed: $AUTH_BACKUP_FILE ($BACKUP_SIZE)"
else
    log "error: auth database backup failed"
    exit 1
fi

# backup payment database
log "backing up payment database..."
PAYMENT_BACKUP_FILE="$BACKUP_DIR/payment_db_${TIMESTAMP}.sql.gz"
docker exec -t "$PAYMENT_CONTAINER" pg_dump -U "$PAYMENT_USER" -d "$PAYMENT_DB" --clean --if-exists | gzip > "$PAYMENT_BACKUP_FILE"

if [ -f "$PAYMENT_BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$PAYMENT_BACKUP_FILE" | cut -f1)
    log "payment database backup completed: $PAYMENT_BACKUP_FILE ($BACKUP_SIZE)"
else
    log "error: payment database backup failed"
    exit 1
fi

# cleanup old backups (keep last 7 days)
log "cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "auth_db_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "payment_db_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# count remaining backups
AUTH_COUNT=$(find "$BACKUP_DIR" -name "auth_db_*.sql.gz" -type f | wc -l)
PAYMENT_COUNT=$(find "$BACKUP_DIR" -name "payment_db_*.sql.gz" -type f | wc -l)
log "backup retention: $AUTH_COUNT auth backups, $PAYMENT_COUNT payment backups"

log "backup process completed successfully"
