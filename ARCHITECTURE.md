# system architecture

## network topology

```
┌─────────────────────────────────────────────────────────────────┐
│                         external clients                        │
│                    (browser, curl, postman)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ https (port 443)
                             │ http (port 80 → redirects to 443)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      nginx reverse proxy                        │
│                                                                 │
│  features:                                                      │
│  • ssl/tls termination (self-signed cert)                       │
│  • load balancing (round-robin)                                 │
│  • rate limiting (100 req/min per ip)                           │
│  • health checks                                                │
│  • access logging                                               │
│                                                                 │
│  routes:                                                        │
│  • /a/* → auth service                                          │
│  • /b/* → payment service                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   app_a1    │  │   app_a2    │  │   app_b1    │  ...
    │             │  │             │  │             │
    │ auth svc    │  │ auth svc    │  │ payment svc │
    │ port 3000   │  │ port 3000   │  │ port 4000   │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
                            │ internal http
                            │ (docker network)
                            │
           ┌────────────────┴────────────────┐
           │                                 │
           ▼                                 ▼
    ┌─────────────┐                  ┌─────────────┐
    │  auth-db    │                  │ payments-db │
    │             │                  │             │
    │ postgresql  │                  │ postgresql  │
    │ port 5432   │                  │ port 5432   │
    │             │                  │             │
    │ database:   │                  │ database:   │
    │   nest      │                  │   payments  │
    └─────────────┘                  └─────────────┘
```

## component details

### nginx reverse proxy

- **container**: nginx-proxy
- **image**: nginx:alpine
- **ports**: 80 (http), 443 (https)
- **purpose**:
  - ssl/tls termination
  - load balancing across service instances
  - rate limiting and security
  - centralized access logging

### auth service (service a)

- **instances**: app_a1, app_a2
- **technology**: nestjs + typescript
- **database**: postgresql (auth-db)
- **endpoints**:
  - POST /auth/register - register new user
  - POST /auth/login - login and get jwt token
  - POST /auth/me - validate token (used by payment service)
  - POST /auth/refresh - refresh access token
  - GET /health - health check
  - GET /docs - swagger documentation

### payment service (service b)

- **instances**: app_b1, app_b2
- **technology**: nestjs + typescript
- **database**: postgresql (payments-db)
- **endpoints**:
  - POST /payments - create payment (requires auth)
  - GET /payments/:reference - get payment details
  - PATCH /payments/:reference/status - update payment status
  - POST /payments/webhook - receive provider webhooks
  - GET /health - health check
  - GET /docs - swagger documentation

### databases

- **auth-db**: stores users and refresh tokens
- **payments-db**: stores payments and transactions
- **backup**: automated daily backups with 7-day retention

## data flow

### user registration flow

```
client → nginx → app_a1/app_a2 → auth-db
                      ↓
                  hash password
                      ↓
                  save user
                      ↓
                  return success
```

### authentication flow

```
client → nginx → app_a1/app_a2 → auth-db
                      ↓
                verify password
                      ↓
              generate jwt tokens
                      ↓
              save refresh token
                      ↓
            return access + refresh
```

### payment creation flow

```
client → nginx → app_b1/app_b2
                      ↓
              extract jwt token
                      ↓
         validate with auth service ──→ app_a1/app_a2
                      ↓                       ↓
              token valid?              verify jwt
                      ↓                       ↓
              create payment            return user info
                      ↓
              save to payments-db
                      ↓
              return payment details
```

## network configuration

### docker network

- **name**: app-network
- **driver**: bridge
- **purpose**: internal service-to-service communication

### service communication

- **external → services**: via nginx (https://localhost/a/ or /b/)
- **service → service**: direct via docker network (http://app_a1:3000)
- **service → database**: via docker network (postgres://db:5432)

### port mapping

```
host machine          docker container
─────────────────────────────────────
80                →   nginx:80
443               →   nginx:443
5432              →   auth-db:5432
5433              →   payments-db:5432
```

note: service ports (3000, 4000) are not exposed to host, only accessible via nginx

## security layers

### layer 1: network isolation

- services not directly accessible from host
- all traffic goes through nginx
- docker network isolation

### layer 2: ssl/tls

- https encryption for all external traffic
- self-signed certificate (development)
- security headers (hsts, x-frame-options, etc)

### layer 3: authentication

- jwt token-based authentication
- bcrypt password hashing
- token validation on every request

### layer 4: rate limiting

- 100 requests per minute per ip
- prevents brute force attacks
- configurable burst allowance

### layer 5: application security

- input validation with class-validator
- sql injection prevention (prisma orm)
- cors configuration
- global exception handling

## scalability

### horizontal scaling

- add more service instances in docker-compose.yml
- update nginx upstream configuration
- nginx automatically load balances

example:

```yaml
# add third instance
app_a3:
  build: ./service-A/auth-svc
  container_name: app_a3
  # ... same config as app_a1
```

```nginx
# update nginx upstream
upstream service_a {
    server app_a1:3000;
    server app_a2:3000;
    server app_a3:3000;  # add new instance
}
```

### vertical scaling

- increase container resources
- adjust database connection pools
- tune nginx worker processes

## monitoring and logging

### nginx logs

- access logs: `/var/log/nginx/access.log`
- error logs: `/var/log/nginx/error.log`
- includes upstream server info
- request timing and status

### application logs

- stdout/stderr captured by docker
- view with: `docker logs <container>`
- structured logging with nestjs

### health checks

- nginx: `https://localhost/health/service_a`
- direct: `http://localhost:3000/health`
- docker health checks monitor container status

## backup and recovery

### backup system

- automated daily backups at 2:00 AM
- compressed sql dumps (gzip)
- 7-day retention policy
- separate backups for each database

### restore process

1. stop services
2. restore database from backup
3. restart services
4. verify functionality

### disaster recovery

- backups stored in `db-backups/` directory
- can be copied to remote storage
- tested restore procedure
- documented step-by-step

## deployment

### development

```bash
./setup.sh
```

### production considerations

- use proper ssl certificate (let's encrypt)
- increase rate limits if needed
- set up remote backup storage
- configure monitoring and alerts
- use secrets management for credentials
- enable database replication
- set up log aggregation

## technology stack

### backend

- nodejs 22
- nestjs framework
- typescript
- prisma orm
- jwt authentication
- bcrypt password hashing

### infrastructure

- docker & docker compose
- nginx reverse proxy
- postgresql 16
- alpine linux (containers)

### tools

- swagger/openapi documentation
- bash scripts for automation
- cron/systemd for scheduling
