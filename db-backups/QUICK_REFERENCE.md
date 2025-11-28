# database backup quick reference

## common commands

### backup

```bash
# manual backup now
./db-backups/backup.sh

# setup automated daily backups
./db-backups/cron-setup.sh

# check backup log
tail -f db-backups/backup.log

# list backups
ls -lh db-backups/*.sql.gz
```

### restore

```bash
# restore auth database
./db-backups/restore.sh auth db-backups/auth_db_20251128_120000.sql.gz

# restore payment database
./db-backups/restore.sh payment db-backups/payment_db_20251128_120000.sql.gz
```

### full restore procedure

```bash
# 1. stop services
docker compose stop app_a1 app_a2 app_b1 app_b2

# 2. restore databases
./db-backups/restore.sh auth db-backups/auth_db_YYYYMMDD_HHMMSS.sql.gz
./db-backups/restore.sh payment db-backups/payment_db_YYYYMMDD_HHMMSS.sql.gz

# 3. restart services
docker compose start app_a1 app_a2 app_b1 app_b2

# 4. verify
curl -k https://localhost/a/health
curl -k https://localhost/b/health
```

## cron management

```bash
# view cron jobs
crontab -l

# edit cron jobs
crontab -e

# remove all cron jobs
crontab -r
```

## systemd management

```bash
# check timer status
sudo systemctl status db-backup.timer

# run backup now
sudo systemctl start db-backup.service

# view logs
sudo journalctl -u db-backup.service -n 50

# disable timer
sudo systemctl disable db-backup.timer
```

## troubleshooting

```bash
# check containers are running
docker ps | grep -E "auth-db|payments-db"

# check backup file contents
gunzip -c db-backups/auth_db_20251128_120000.sql.gz | less

# check disk space
df -h .

# check backup sizes
du -h db-backups/*.sql.gz

# count backups
ls db-backups/auth_db_*.sql.gz | wc -l
```

## backup file naming

format: `{service}_db_{timestamp}.sql.gz`

examples:

- `auth_db_20251128_145405.sql.gz` - auth database backup from nov 28, 2025 at 14:54:05
- `payment_db_20251128_145405.sql.gz` - payment database backup from nov 28, 2025 at 14:54:05

## retention policy

- backups older than 7 days are automatically deleted
- change retention in `backup.sh`: `RETENTION_DAYS=7`
- manual cleanup: `find db-backups -name "*.sql.gz" -mtime +7 -delete`
