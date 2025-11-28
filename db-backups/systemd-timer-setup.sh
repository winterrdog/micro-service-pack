#!/bin/sh

# setup systemd timer for daily database backups (alternative to cron)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
SERVICE_NAME="db-backup"

# ensure backup script is executable
chmod +x "$BACKUP_SCRIPT"

echo "creating systemd service and timer files..."

# create systemd service file
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=PostgreSQL Database Backup Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=$BACKUP_SCRIPT
User=$USER
StandardOutput=append:$SCRIPT_DIR/backup.log
StandardError=append:$SCRIPT_DIR/backup.log

[Install]
WantedBy=multi-user.target
EOF

# create systemd timer file
sudo tee /etc/systemd/system/${SERVICE_NAME}.timer > /dev/null <<EOF
[Unit]
Description=Daily PostgreSQL Database Backup Timer
Requires=${SERVICE_NAME}.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# reload systemd and enable timer
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}.timer
sudo systemctl start ${SERVICE_NAME}.timer

echo "systemd timer setup completed"
echo ""
echo "useful commands:"
echo "  check timer status:  sudo systemctl status ${SERVICE_NAME}.timer"
echo "  list all timers:     sudo systemctl list-timers"
echo "  run backup now:      sudo systemctl start ${SERVICE_NAME}.service"
echo "  view logs:           sudo journalctl -u ${SERVICE_NAME}.service"
echo "  disable timer:       sudo systemctl disable ${SERVICE_NAME}.timer"
