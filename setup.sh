#!/bin/bash
set -e

echo "+ setting up microservices..."
echo ""

# stop any running containers
echo "+ stopping existing containers..."
docker compose down -v

echo ""
echo "+ building docker images..."
docker compose build #--no-cache # place it back if you do not need any cache interference

echo ""
echo "+  starting services..."
docker compose up -d

# wait for services to be healthy
echo ""
echo "+ waiting for services to be ready..."
sleep 10

echo ""
echo "+ checking service health..."
echo "nginx proxy:"
curl -sk https://localhost/health/service_a || echo "❌ auth service not ready"
echo ""
curl -sk https://localhost/health/service_b || echo "❌ payment service not ready"

echo -e "\n✓ setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  service urls (via nginx reverse proxy):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   auth service:    https://localhost/a/"
echo "   payment service: https://localhost/b/"
echo ""
echo "   API docs:"
echo "   auth:            https://localhost/a/docs"
echo "   payment:         https://localhost/b/docs"
echo ""
echo "   health checks:"
echo "   auth:            https://localhost/health/service_a"
echo "   payment:         https://localhost/health/service_b"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  features:"
echo "  • load balancing: 2 instances per service"
echo "  • ssl/tls: self-signed certificate"
echo "  • rate limiting: 100 requests/minute per IP"
echo ""
echo "  note: use -k flag with curl for self-signed cert"
echo "  example: curl -k https://localhost/a/health"
echo ""
echo "  view logs: docker compose logs -f"
echo "  nginx logs: docker exec nginx-proxy tail -f /var/log/nginx/access.log"
