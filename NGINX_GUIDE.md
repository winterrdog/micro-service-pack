# nginx reverse proxy quick reference

## architecture

```
external clients (browser/curl)
        ↓
   nginx (443) - https://localhost/a/ or /b/
   • ssl/tls termination
   • rate limiting (100 req/min per ip)
   • load balancing (round-robin)
        ↓
   ┌────┴────┐
   ↓         ↓
app_a1    app_a2  (auth service instances)
app_b1    app_b2  (payment service instances)
   ↓         ↑
   └─────────┘
internal service-to-service: http://app_a1:3000
```

**important**:

- external traffic goes through nginx (https with load balancing)
- internal service-to-service communication uses docker service names directly
- services can't use `localhost` inside containers - they use the docker network

## endpoints

| service        | nginx url                            | direct url              | instances |
| -------------- | ------------------------------------ | ----------------------- | --------- |
| auth           | `https://localhost/a/`               | `http://localhost:3000` | 2         |
| payment        | `https://localhost/b/`               | `http://localhost:4000` | 2         |
| auth health    | `https://localhost/health/service_a` | -                       | -         |
| payment health | `https://localhost/health/service_b` | -                       | -         |

## features

### load balancing

- round-robin distribution across 2 instances per service
- automatic failover on instance failure
- connection keepalive for performance

### ssl/tls

- self-signed certificate (valid 2 years)
- tls 1.2 and 1.3 support
- security headers (hsts, x-frame-options, etc.)

### rate limiting

- 100 requests per minute per ip
- burst allowance of 20 requests
- returns 503 when limit exceeded

### health checks

- nginx monitors upstream health
- automatic removal of unhealthy instances
- health check endpoints for monitoring

### logging

- detailed access logs with upstream info
- request timing and status tracking
- logs persisted in docker volume

## common commands

```bash
# view nginx logs
docker exec nginx-proxy tail -f /var/log/nginx/access.log
docker exec nginx-proxy tail -f /var/log/nginx/error.log

# test endpoints
curl -k https://localhost/health/service_a
curl -k https://localhost/health/service_b

# reload nginx config (after changes)
docker exec nginx-proxy nginx -s reload

# test nginx config syntax
docker exec nginx-proxy nginx -t

# regenerate ssl certificate
./generate-ssl.sh
docker-compose restart nginx
```

## configuration files

- `nginx/nginx.conf` - main config, rate limiting, logging
- `nginx/ssl-params.conf` - ssl/tls settings and security headers
- `nginx/services.conf` - upstream pools and routing rules
- `nginx/ssl/` - ssl certificate and key

## testing load balancing

```bash
# make multiple requests and check which instance handles them
for i in {1..10}; do
  curl -k -s https://localhost/a/health | grep -o "app_a[12]" || echo "request $i"
done
```

## troubleshooting

**503 service unavailable**

- check if service instances are running: `docker ps`
- check service health: `docker exec app_a1 wget -qo- http://localhost:3000/health`
- view nginx error logs: `docker logs nginx-proxy`

**ssl certificate errors**

- use `-k` flag with curl to accept self-signed cert
- or regenerate certificate: `./generate-ssl.sh`

**rate limit exceeded**

- wait 1 minute for rate limit to reset
- or adjust `limit_req_zone` in `nginx/nginx.conf`

**connection refused**

- ensure all services are on same network: `docker network inspect microservices_app-network`
- check nginx depends_on in docker-compose.yml

## performance tuning

edit `nginx/nginx.conf` to adjust:

- `worker_connections` - max concurrent connections per worker
- `keepalive` - connection reuse in upstream pools
- `proxy_connect_timeout` - timeout for upstream connections
- rate limit zone size and rate

## security notes

- self-signed certificate is for development only
- use proper ca-signed certificate in production
- rate limiting protects against basic dos attacks
- security headers prevent common web vulnerabilities
- services are not exposed directly (only via nginx)
