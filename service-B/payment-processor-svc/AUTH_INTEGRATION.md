# Authentication Integration

This service integrates with the authentication service (Service A) to validate tokens for all payment API endpoints.

## How It Works

1. **AuthClientService** (`src/common/http-client/auth-client.service.ts`)
    - Makes HTTP calls to Service A's `/auth/me` endpoint
    - Validates bearer tokens by forwarding them to the auth service
    - Returns user information if token is valid

2. **AuthGuard** (`src/common/guards/auth.guard.ts`)
    - Extracts bearer token from Authorization header
    - Calls AuthClientService to validate the token
    - Attaches user info to the request object
    - Blocks requests with invalid/missing tokens

3. **Protected Endpoints**
    - All payment endpoints require authentication
    - Include `Authorization: Bearer <token>` header in requests
    - Webhook endpoint is also protected (configure provider to send token)

## Configuration

Set the auth service URL in `.env`:

**For Docker deployments (internal service-to-service):**

```
AUTH_SERVICE_URL="http://app_a1:3000"
```

**For local development:**

```
AUTH_SERVICE_URL="http://localhost:3000"
```

> **Important**:
>
> - External clients (browsers, curl) use nginx: `https://localhost/a/` and `https://localhost/b/`
> - Internal service-to-service calls use Docker service names: `http://app_a1:3000`
> - Containers can't reach `localhost` - they need Docker network service names

## Usage Example

**Via nginx (production - recommended):**

```bash
# 1. Login to get token (from auth service)
curl -k -X POST https://localhost/a/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone": "user@example.com", "password": "password123"}'

# 2. Use token to create payment
curl -k -X POST https://localhost/b/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"amount": 10000, "currency": "UGX", "paymentMethod": "MOBILE_MONEY", "customerPhone": "+256700000000"}'
```

**Direct access (development):**

```bash
# 1. Login to get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone": "user@example.com", "password": "password123"}'

# 2. Use token to create payment
curl -X POST http://localhost:4000/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"amount": 10000, "currency": "UGX", "paymentMethod": "MOBILE_MONEY", "customerPhone": "+256700000000"}'
```
