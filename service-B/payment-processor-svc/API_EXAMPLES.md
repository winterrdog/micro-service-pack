# Payment Processing API - Usage Examples

> **Note**: All examples show both nginx (production) and direct (development) endpoints. In production, nginx load balances requests across 2 service instances.

## Prerequisites

**Via nginx (production - load balanced):**

- Service URL: `https://localhost/b/`
- Swagger docs: `https://localhost/b/docs`
- Use `-k` flag with curl for self-signed cert

**Direct access (development):**

```bash
# Start the service
npm run start:dev

# Service runs on http://localhost:4000
# Swagger docs at http://localhost:4000/docs
```

## Example 1: Complete Payment Flow

### Step 1: Create a Payment

**Via nginx (production):**

```bash
curl -k -X POST https://localhost/b/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "amount": 50000,
    "currency": "UGX",
    "paymentMethod": "MOBILE_MONEY",
    "customerPhone": "+256700123456",
    "customerEmail": "john.doe@example.com"
  }'
```

**Direct access (development):**

```bash
curl -X POST http://localhost:4000/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "amount": 50000,
    "currency": "UGX",
    "paymentMethod": "MOBILE_MONEY",
    "customerPhone": "+256700123456",
    "customerEmail": "john.doe@example.com"
  }'
```

**Response:**

```json
{
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "reference": "PAY-1732713600000-456789",
    "amount": "50000",
    "currency": "UGX",
    "paymentMethod": "MOBILE_MONEY",
    "customerPhone": "+256700123456",
    "customerEmail": "john.doe@example.com",
    "state": "INITIATED",
    "providerName": null,
    "createdAt": "2025-11-27T12:00:00.000Z",
    "updatedAt": "2025-11-27T12:00:00.000Z"
}
```

### Step 2: Update to PENDING (Sent to Provider)

```bash
curl -X PATCH http://localhost:4000/payments/PAY-1732713600000-456789/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PENDING",
    "reason": "Payment sent to mobile money provider"
  }'
```

**Response:**

```json
{
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "reference": "PAY-1732713600000-456789",
    "state": "PENDING",
    "providerName": "MobileMoneyProvider",
    "updatedAt": "2025-11-27T12:01:00.000Z"
}
```

### Step 3: Simulate Provider Webhook (Success)

```bash
curl -X POST http://localhost:4000/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "paymentReference": "PAY-1732713600000-456789",
    "status": "SUCCESS",
    "providerTransactionId": "MTN-TXN-987654321",
    "timestamp": "2025-11-27T12:02:00Z",
    "providerName": "MTN_MOBILE_MONEY"
  }'
```

**Response:**

```json
{
    "processed": true,
    "message": "Webhook processed successfully"
}
```

### Step 4: Query Payment Status

```bash
curl -X GET http://localhost:4000/payments/PAY-1732713600000-456789
```

**Response:**

```json
{
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "reference": "PAY-1732713600000-456789",
    "amount": "50000",
    "currency": "UGX",
    "paymentMethod": "MOBILE_MONEY",
    "customerPhone": "+256700123456",
    "customerEmail": "john.doe@example.com",
    "state": "SUCCESS",
    "providerName": "MTN_MOBILE_MONEY",
    "createdAt": "2025-11-27T12:00:00.000Z",
    "updatedAt": "2025-11-27T12:02:00.000Z",
    "providerTxns": [
        {
            "id": "xyz-123",
            "providerName": "MTN_MOBILE_MONEY",
            "providerTransactionId": "MTN-TXN-987654321",
            "status": "SUCCESS",
            "amount": "0",
            "currency": "UGX",
            "receivedAt": "2025-11-27T12:02:00.000Z"
        }
    ]
}
```

## Example 2: Failed Payment Flow

### Create and Send to Provider

```bash
# Create payment
curl -X POST http://localhost:4000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25000,
    "currency": "USD",
    "paymentMethod": "MOBILE_MONEY",
    "customerPhone": "+256700999888"
  }'

# Update to PENDING
curl -X PATCH http://localhost:4000/payments/PAY-{reference}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "PENDING"}'
```

### Simulate Failed Webhook

```bash
curl -X POST http://localhost:4000/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "paymentReference": "PAY-{reference}",
    "status": "FAILED",
    "providerTransactionId": "AIRTEL-TXN-111222333",
    "timestamp": "2025-11-27T12:05:00Z",
    "providerName": "AIRTEL_MONEY"
  }'
```

## Example 3: Idempotency Test

### Send Same Webhook Twice

```bash
# First webhook
curl -X POST http://localhost:4000/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "paymentReference": "PAY-1732713600000-456789",
    "status": "SUCCESS",
    "providerTransactionId": "DUPLICATE-TXN-123",
    "timestamp": "2025-11-27T12:10:00Z"
  }'

# Response: {"processed": true, "message": "Webhook processed successfully"}

# Second webhook (duplicate)
curl -X POST http://localhost:4000/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "paymentReference": "PAY-1732713600000-456789",
    "status": "SUCCESS",
    "providerTransactionId": "DUPLICATE-TXN-123",
    "timestamp": "2025-11-27T12:10:00Z"
  }'

# Response: {"processed": false, "message": "Webhook already processed"}
```

## Example 4: Invalid State Transitions

### Try to Skip PENDING State

```bash
# Create payment (INITIATED)
curl -X POST http://localhost:4000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "UGX",
    "paymentMethod": "MOBILE_MONEY",
    "customerPhone": "+256700111222"
  }'

# Try to go directly to SUCCESS (invalid)
curl -X PATCH http://localhost:4000/payments/PAY-{reference}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "SUCCESS"}'

# Response: 400 Bad Request
# {"statusCode": 400, "message": "Invalid state transition from INITIATED to SUCCESS"}
```

### Try to Update Terminal State

```bash
# Payment in SUCCESS state
curl -X PATCH http://localhost:4000/payments/PAY-{reference}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "FAILED"}'

# Response: 400 Bad Request
# {"statusCode": 400, "message": "Invalid state transition from SUCCESS to FAILED"}
```

## Example 5: Error Cases

### Payment Not Found

```bash
curl -X GET http://localhost:4000/payments/PAY-INVALID-REFERENCE

# Response: 404 Not Found
# {"statusCode": 404, "message": "Payment with reference PAY-INVALID-REFERENCE not found"}
```

### Invalid Request Data

```bash
curl -X POST http://localhost:4000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": -100,
    "currency": "INVALID",
    "paymentMethod": "CREDIT_CARD"
  }'

# Response: 400 Bad Request
# Validation errors for invalid fields
```

## Testing with Postman

Import this collection:

```json
{
    "info": {
        "name": "Payment Processing API",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
        {
            "name": "Create Payment",
            "request": {
                "method": "POST",
                "url": "http://localhost:4000/payments",
                "header": [{ "key": "Content-Type", "value": "application/json" }],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"amount\": 50000,\n  \"currency\": \"UGX\",\n  \"paymentMethod\": \"MOBILE_MONEY\",\n  \"customerPhone\": \"+256700123456\",\n  \"customerEmail\": \"test@example.com\"\n}"
                }
            }
        },
        {
            "name": "Get Payment",
            "request": {
                "method": "GET",
                "url": "http://localhost:4000/payments/{{paymentReference}}"
            }
        },
        {
            "name": "Update Payment Status",
            "request": {
                "method": "PATCH",
                "url": "http://localhost:4000/payments/{{paymentReference}}/status",
                "header": [{ "key": "Content-Type", "value": "application/json" }],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"status\": \"PENDING\"\n}"
                }
            }
        },
        {
            "name": "Webhook",
            "request": {
                "method": "POST",
                "url": "http://localhost:4000/payments/webhook",
                "header": [{ "key": "Content-Type", "value": "application/json" }],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"paymentReference\": \"{{paymentReference}}\",\n  \"status\": \"SUCCESS\",\n  \"providerTransactionId\": \"PROVIDER-TXN-123\",\n  \"timestamp\": \"2025-11-27T12:00:00Z\"\n}"
                }
            }
        }
    ]
}
```

## Notes

- Replace `PAY-{reference}` with actual payment reference from create response
- All timestamps should be in ISO 8601 format
- Currency must be either "UGX" or "USD"
- Payment method currently only supports "MOBILE_MONEY"
- Phone numbers should include country code
