# database backup and restore

automated backup system for postgresql databases with 7-day retention policy.

## overview

this system backs up two databases:

- auth database (nest) from auth-db container
- payment database (payments) from payments-db container

backups are compressed with gzip and stored in this directory.

## quick start

```bash
# make scripts executable
chmod +x db-backups/*.sh

# run manual backup
./db-backups/backup.sh

# setup automated daily backups (choose one)
./db-backups/cron-setup.sh           # option 1: using cron
./db-backups/systemd-timer-setup.sh  # option 2: using systemd
```

## backup script

essentially, the backup script (`backup.sh`) performs these tasks:

1. creates compressed sql dumps of both databases
2. saves backups with timestamp: `auth_db_YYYYMMDD_HHMMSS.sql.gz`
3. removes backups older than 7 days
4. logs all operations to `backup.log`

### manual backup

```bash
cd db-backups
./backup.sh
```

output files:

- `auth_db_20251128_120000.sql.gz` - auth database backup
- `payment_db_20251128_120000.sql.gz` - payment database backup
- `backup.log` - operation log

### backup retention

the script automatically deletes backups older than 7 days. to change retention:

```bash
# edit backup.sh and change this line:
RETENTION_DAYS=7  # change to desired number of days
```

## automated backups

### option 1: cron (recommended)

setup daily backups at `2:00 AM`:

```bash
./cron-setup.sh
```

verify cron job:

```bash
crontab -l
```

remove cron job:

```bash
crontab -e
# delete the line containing backup.sh
```

### option 2: `systemd` timer (for `systemd`-based systems)

setup daily backups at 2:00 AM:

```bash
./systemd-timer-setup.sh
```

useful commands:

```bash
# check timer status
sudo systemctl status db-backup.timer

# list all timers
sudo systemctl list-timers

# run backup immediately
sudo systemctl start db-backup.service

# view logs
sudo journalctl -u db-backup.service

# disable timer
sudo systemctl disable db-backup.timer
```

## restore procedure

### step 1: list available backups

```bash
ls -lh db-backups/*.sql.gz
```

example output:

```
auth_db_20251128_120000.sql.gz
auth_db_20251127_120000.sql.gz
payment_db_20251128_120000.sql.gz
payment_db_20251127_120000.sql.gz
```

### step 2: stop services (recommended)

```bash
docker compose stop app_a1 app_a2 app_b1 app_b2
```

this prevents new data from being written during restore.

### step 3: restore database

restore auth database:

```bash
./db-backups/restore.sh auth db-backups/auth_db_20251128_120000.sql.gz
```

restore payment database:

```bash
./db-backups/restore.sh payment db-backups/payment_db_20251128_120000.sql.gz
```

the script will ask for confirmation before proceeding.

### step 4: restart services

```bash
docker compose start app_a1 app_a2 app_b1 app_b2
```

### step 5: verify restore

check auth service:

```bash
curl -k https://localhost/a/health
```

check payment service:

```bash
curl -k https://localhost/b/health
```

## restore examples

### restore auth database from yesterday

```bash
# find yesterday's backup
ls -lh db-backups/auth_db_*.sql.gz

# restore it
./db-backups/restore.sh auth db-backups/auth_db_20251127_120000.sql.gz
```

### restore payment database from specific date

```bash
# restore from november 25
./db-backups/restore.sh payment db-backups/payment_db_20251125_120000.sql.gz
```

### restore both databases

```bash
# stop services
docker compose stop app_a1 app_a2 app_b1 app_b2

# restore auth database
./db-backups/restore.sh auth db-backups/auth_db_20251128_120000.sql.gz

# restore payment database
./db-backups/restore.sh payment db-backups/payment_db_20251128_120000.sql.gz

# restart services
docker compose start app_a1 app_a2 app_b1 app_b2
```

## testing backup and restore

### test 1: create test data

```bash
# register a test user
curl -k -X POST https://localhost/a/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "backup-test@example.com",
    "phone": "+256700999999",
    "password": "TestPass123!"
  }'
```

### test 2: create backup

```bash
./db-backups/backup.sh
```

verify backup files exist:

```bash
ls -lh db-backups/*.sql.gz | tail -2
```

### test 3: modify data

```bash
# register another user
curl -k -X POST https://localhost/a/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "after-backup@example.com",
    "phone": "+256700888888",
    "password": "TestPass123!"
  }'
```

### test 4: restore from backup

```bash
# stop services
docker compose stop app_a1 app_a2

# restore auth database
./db-backups/restore.sh auth db-backups/auth_db_YYYYMMDD_HHMMSS.sql.gz

# restart services
docker compose start app_a1 app_a2

# wait for services to start
sleep 3
```

### test 5: verify restore

the first user should exist:

```bash
curl -k -X POST https://localhost/a/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "backup-test@example.com",
    "password": "TestPass123!"
  }'
```

the second user should not exist (created after backup):

```bash
curl -k -X POST https://localhost/a/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "after-backup@example.com",
    "password": "TestPass123!"
  }'
# should return error: invalid credentials
```

## troubleshooting

### backup fails with "container not found"

ensure containers are running:

```bash
docker ps | grep -E "auth-db|payments-db"
```

start containers if needed:

```bash
docker compose up -d
```

### restore fails with "permission denied"

ensure restore script is executable:

```bash
chmod +x db-backups/restore.sh
```

### backup files are too large

backups are compressed with gzip. to check uncompressed size:

```bash
gunzip -c db-backups/auth_db_20251128_120000.sql.gz | wc -c
```

### cron job not running

check cron service is running:

```bash
sudo systemctl status cron
```

check cron logs:

```bash
grep CRON /var/log/syslog | tail -20
```

### `systemd` timer not running

check timer status:

```bash
sudo systemctl status db-backup.timer
```

check service logs:

```bash
sudo journalctl -u db-backup.service -n 50
```

## backup file format

backup files are compressed sql dumps containing:

- database schema (tables, indexes, constraints)
- all data from all tables
- `--clean` flag: drops existing objects before recreating
- `--if-exists` flag: prevents errors if objects don't exist

to view backup contents without restoring:

```bash
gunzip -c db-backups/auth_db_20251128_120000.sql.gz | less
```

## security notes

- backup files contain sensitive data (passwords are hashed)
- store backups in a secure location
- consider encrypting backups for production use
- restrict file permissions: `chmod 600 db-backups/*.sql.gz`
- do not commit backup files to version control

## monitoring

check backup log:

```bash
tail -f db-backups/backup.log
```

check last backup time:

```bash
ls -lt db-backups/*.sql.gz | head -2
```

check backup sizes:

```bash
du -h db-backups/*.sql.gz
```

count available backups:

```bash
ls db-backups/auth_db_*.sql.gz | wc -l
ls db-backups/payment_db_*.sql.gz | wc -l
```
