#!/bin/sh

# setup cron job for daily database backups

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"

# ensure backup script is executable
chmod +x "$BACKUP_SCRIPT"

# cron job: run daily at 2:00 AM
CRON_JOB="0 2 * * * $BACKUP_SCRIPT >> $SCRIPT_DIR/backup.log 2>&1"

# check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "cron job already exists"
    echo "current crontab:"
    crontab -l | grep "$BACKUP_SCRIPT"
else
    # add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "cron job added successfully"
    echo "backup will run daily at 2:00 AM"
fi

echo ""
echo "to view current crontab:"
echo "  crontab -l"
echo ""
echo "to remove the cron job:"
echo "  crontab -e"
echo "  (then delete the line containing backup.sh)"
