# NGINX reverse proxy configuration

## overview

nginx acts as a reverse proxy and load balancer for 2 instances each of `auth-svc` and `payment-svc`.

## features

- **load balancing**: round-robin across 2 instances per service
- **ssl/tls**: self-signed certificate (`https` on port `443`)
- **rate limiting**: `100` requests/minute per ip (burst of `20`)
- **health checks**: `/health/service_a` and `/health/service_b` endpoints
- **access logging**: detailed logs with upstream info will be found in `/var/log/nginx/`

## quick start

1. generate ssl certificate (_already done, left the script behind for completeness_):

   ```bash
   ./generate-ssl.sh
   ```

2. start all services:

   ```bash
   ./setup.sh
   ```

3. access services via nginx:
   - auth service: `https://localhost/a/`
   - payment service: `https://localhost/b/`
   - health checks: `https://localhost/health/service_a` and `https://localhost/health/service_b`

## configuration files

- `nginx.conf` - main nginx config with rate limiting zone
- `ssl-params.conf` - ssl/tls settings and security headers
- `services.conf` - upstream pools and routing rules

## testing

```bash
# test auth service (load balanced)
curl -k https://localhost/a/health

# test payment service (load balanced)
curl -k https://localhost/b/health

# view nginx logs
docker exec nginx-proxy tail -f /var/log/nginx/access.log
```

## rate limiting

- `100` requests/minute per ip
- burst of `20` requests allowed
- returns `503` when limit exceeded
