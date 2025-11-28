#!/bin/sh

# restore postgresql database from backup

set -e

# usage function
usage() {
    echo "usage: $0 <auth|payment> <backup_file>"
    echo ""
    echo "examples:"
    echo "  $0 auth db-backups/auth_db_20251128_120000.sql.gz"
    echo "  $0 payment db-backups/payment_db_20251128_120000.sql.gz"
    exit 1
}

# check arguments
if [ $# -ne 2 ]; then
    usage
fi

SERVICE=$1
BACKUP_FILE=$2

# validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "error: backup file not found: $BACKUP_FILE"
    exit 1
fi

# set database configuration based on service
case $SERVICE in
    auth)
        CONTAINER="auth-db"
        DB_NAME="nest"
        DB_USER="postgres"
        ;;
    payment)
        CONTAINER="payments-db"
        DB_NAME="payments"
        DB_USER="postgres"
        ;;
    *)
        echo "error: invalid service. use 'auth' or 'payment'"
        usage
        ;;
esac

echo "restoring $SERVICE database from: $BACKUP_FILE"
echo "container: $CONTAINER"
echo "database: $DB_NAME"
echo ""
read -p "this will overwrite the current database. continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "restore cancelled"
    exit 0
fi

echo "starting restore process..."

# restore database
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
    echo "restore completed successfully"
else
    echo "error: restore failed"
    exit 1
fi
