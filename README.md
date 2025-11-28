# microservices setup

this repository contains 2 microservices:

- **service a (auth-svc)**: authentication service on port `3000`
- **service b (payment-svc)**: payment processor service on port `4000`

service B depends on service A for token authentication.

## quick start

```bash
# start all services
./setup.sh
```

> **note**: the entrypoint scripts automatically run database migrations (`prisma migrate deploy`) before starting each service.

## service urls

**via nginx reverse proxy (recommended):**

- auth service: https://localhost/a/ (load balanced across 2 instances)
- payment service: https://localhost/b/ (load balanced across 2 instances)
- auth service docs: https://localhost/a/docs
- payment service docs: https://localhost/b/docs
- health checks: https://localhost/health/service_a and https://localhost/health/service_b

**direct access (for development):**

- auth database: `localhost:5432`
- payment database: `localhost:5433`

> **note**: services are load balanced by nginx across 2 instances each. use `-k` flag with curl to accept self-signed certificate.

## usage flow

1. **register a user** (service a):

```bash
curl -k -X POST https://localhost/a/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "+256700000000",
    "password": "securepass123!"
  }'
```

2. **login to get token** (service a):

```bash
curl -k -X POST https://localhost/a/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "password": "securepass123!"
  }'
```

3. **create payment with token** (service b):

```bash
curl -k -X POST https://localhost/b/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "amount": 10000,
    "currency": "UGX",
    "paymentmethod": "MOBILE_MONEY",
    "customerphone": "+256700000000",
    "customeremail": "customer@example.com"
  }'
```

## architecture

```
                    ┌──────────────────┐
                    │  nginx (443)     │
                    │  reverse proxy   │
                    │  load balancer   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  service A  │  │  service A  │  │  service B  │ ...
    │  instance 1 │  │  instance 2 │  │  instance 1 │
    │  (auth api) │  │  (auth api) │  │  (payment)  │
    └─────────────┘  └─────────────┘  └──────┬──────┘
                                              │
                                              │ http auth check
                                              │ POST /auth/me
                                              ▼
                                       (service A)
```

- nginx load balances requests across 2 instances of each service
- service b validates requests by forwarding bearer tokens to service a's `/auth/me` endpoint
- rate limiting: 100 requests/minute per IP
- ssl/tls with self-signed certificate

## development

to work on individual services:

```bash
# service a only
cd service-A/auth-svc
docker-compose up

# service b only (requires service a running)
cd service-B/payment-processor-svc
docker-compose up
```

## nginx configuration

nginx provides:

- **load balancing**: round-robin across 2 instances per service
- **ssl/tls**: https on port 443 (self-signed cert)
- **rate limiting**: 100 requests/minute per IP
- **health checks**: `/health/service_a` and `/health/service_b`
- **access logging**: detailed logs with upstream info

view nginx logs:

```bash
docker exec nginx-proxy tail -f /var/log/nginx/access.log
```

regenerate ssl certificate:

```bash
./generate-ssl.sh
```

see [NGINX_GUIDE.md](./NGINX_GUIDE.md) for detailed nginx documentation and troubleshooting.

## database backups

automated backup system with 7-day retention policy.

quick start:

```bash
# manual backup
./db-backups/backup.sh

# setup automated daily backups (2:00 AM)
./db-backups/cron-setup.sh

# restore from backup
./db-backups/restore.sh auth db-backups/auth_db_YYYYMMDD_HHMMSS.sql.gz
./db-backups/restore.sh payment db-backups/payment_db_YYYYMMDD_HHMMSS.sql.gz
```

see [db-backups/README.md](./db-backups/README.md) for complete backup and restore documentation.

## documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - detailed system architecture and network topology
- [NGINX_GUIDE.md](./NGINX_GUIDE.md) - nginx configuration and troubleshooting
<!-- - [PRESENTATION_PLAN.md](./PRESENTATION_PLAN.md) - demo video script and timing -->
<!-- - [DEMO_CHECKLIST.md](./DEMO_CHECKLIST.md) - preparation checklist for recording -->
<!-- - [demo-commands.txt](./demo-commands.txt) - ready-to-use commands for demo -->
- [db-backups/README.md](./db-backups/README.md) - backup and restore guide

## notes

- i did the whole of task 1 and parts of task 2 i.e. 2 through 4 only.
- i could have finished everything... but i fell sick of malaria, last friday, and only gained back good health on wednesday thus having only 2 days to do the assignment herein.
