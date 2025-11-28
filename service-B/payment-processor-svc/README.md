## Description

Service B implementation. It is responsible for payment processing. This service provides REST API endpoints for payment processing with mobile money support, including payment initiation, status tracking, and webhook handling.

## Project setup

### prerequisites

- node.js 18+ installed
- postgresql database running
- docker (optional, for database)

### 1. install dependencies

```bash
npm i
```

### 2. configure environment

create `.env` file (already exists):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/payments"
PORT=4000
```

### 3. start database (if using docker)

```bash
docker-compose up -d
```

### 4. run migrations

```bash
npx prisma migrate dev
```

### 5. start the service

```bash
# development mode with hot reload
npm run start:dev

# production mode
npm run build
npm run start:prod
```

### 6. access the api

**via nginx reverse proxy (production):**

- **api base url**: https://localhost/b/
- **swagger documentation**: https://localhost/b/docs
- **health check**: https://localhost/health/service_b

**direct access (development):**

- **api base url**: http://localhost:4000
- **swagger documentation**: http://localhost:4000/docs
- **health check**: http://localhost:4000/health

> note: nginx load balances across 2 instances. use `-k` flag with curl for self-signed cert.

## Database Schemas

### Payment

- `id`: UUID (primary key)
- `reference`: Unique payment reference
- `amount`: Decimal
- `currency`: UGX | USD
- `paymentMethod`: MOBILE_MONEY
- `customerPhone`: String
- `customerEmail`: String (optional)
- `state`: INITIATED | PENDING | SUCCESS | FAILED
- `providerName`: String (optional)

### ProviderTransaction

- Tracks provider-specific transaction details
- Links to Payment via `paymentId`
- Stores provider transaction ID and status

### WebhookDelivery

- Ensures webhook idempotency
- Unique constraint on `providerName` + `providerTxId`

## run tests

```bash
# all tests
npm test

# payment tests only
npm test -- payments

# with coverage
npm test -- --coverage

# watch mode
npm test -- --watch

# Run service tests only
npm test -- payments.service.spec.ts

# Run controller tests only
npm test -- payments.controller.spec.ts

# Run with coverage
npm test -- --coverage

```

## Payment State Machine

The service enforces the following state transitions:

```
INITIATED → PENDING → SUCCESS
                    → FAILED
```

**Valid Transitions:**

- `INITIATED` → `PENDING` (when sent to provider)
- `PENDING` → `SUCCESS` (when payment confirmed)
- `PENDING` → `FAILED` (when payment rejected, for some reason)

**Invalid Transitions:**

- `INITIATED` → `SUCCESS` (must go through PENDING)
- `SUCCESS` → any state (terminal state)
- `FAILED` → any state (terminal state)

## Idempotency

The webhook handler implements idempotency using the `WebhookDelivery` table:

- Each webhook is identified by `providerName` + `providerTransactionId`
- Duplicate webhooks return `processed: false` without updating the payment
- Prevents race conditions and duplicate processing

## Example Usage

```typescript
// via nginx (production) - load balanced
const payment = await fetch("https://localhost/b/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        amount: 10000,
        currency: "UGX",
        paymentMethod: "MOBILE_MONEY",
        customerPhone: "+256700000000",
    }),
});

// Update to PENDING (sent to provider)
await fetch(`https://localhost/b/payments/${payment.reference}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "PENDING" }),
});

// Simulate provider webhook
await fetch("https://localhost/b/payments/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        paymentReference: payment.reference,
        status: "SUCCESS",
        providerTransactionId: "PROVIDER-TXN-123",
        timestamp: new Date().toISOString(),
    }),
});
```

```bash
# via curl (with self-signed cert)
curl -k -X POST https://localhost/b/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"amount": 10000, "currency": "UGX", "paymentMethod": "MOBILE_MONEY", "customerPhone": "+256700000000"}'
```

## API endpoints

| method | endpoint                      | description               |
| ------ | ----------------------------- | ------------------------- |
| POST   | `/payments`                   | create a new payment      |
| GET    | `/payments/:reference`        | get payment by reference  |
| PATCH  | `/payments/:reference/status` | update payment status     |
| POST   | `/payments/webhook`           | receive provider webhooks |
| GET    | `/health`                     | health check endpoint     |

## payment flow

```
1. create payment (initiated)
   ↓
2. update to pending (sent to provider)
   ↓
3. webhook from provider
   ↓
4. update to success or failed
```

## environment variables

| variable       | description                  | default  |
| -------------- | ---------------------------- | -------- |
| `DATABASE_URL` | postgresql connection string | required |
| `PORT`         | server port                  | `4000`   |

**ready to go!** 🚀 start the service and visit http://localhost:4000/docs to explore the api.
