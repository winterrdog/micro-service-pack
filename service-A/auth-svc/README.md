## Service A Implementation

It is an authentication REST API service with 3 endpoints i.e. _register a new user, login a registered user and an authenticated route for authenticated users to visit_

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Request                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         main.ts                                 │
│  • Starts NestJS app                                            │
│  • Applies global middleware (rate limit, security, CORS)       │
│  • Applies global exception filter                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AppModule                                │
│  • Root module that imports AuthModule                          │
│  • Provides PrismaService globally                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AuthModule                               │
│  • Handles authentication logic                                 │
│  • Configures JWT                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AuthController                             │
│  • POST /auth/register  → Register new user                     │
│  • POST /auth/login     → Login existing user                   │
│  • POST /auth/refresh   → Refresh access token                  │
│  • GET  /auth/me        → Get current user (protected)          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AuthService                               │
│  • register()           → Hash password, save user to DB        │
│  • login()              → Verify credentials, generate tokens   │
│  • refreshTokens()      → Validate refresh token, issue new one │
│  • validateUserFromToken() → Verify JWT and fetch user          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PrismaService                              │
│  • Manages database connection                                  │
│  • Provides access to User and RefreshToken models              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                          │
│  • Users table (id, email, phone, password)                     │
│  • RefreshTokens table (id, userId, token, expiresAt)           │
└─────────────────────────────────────────────────────────────────┘

Protected Routes Flow:
─────────────────────────
Client → AuthController → JwtAuthGuard → JwtStrategy
                                            │
                                            ▼
                                    Validates JWT token
                                            │
                                            ▼
                                    AuthService.validateUserFromToken()
                                            │
                                            ▼
                                    Attaches user to request
                                            │
                                            ▼
                                    Controller method executes
```

### Docker Network Setup

```
┌──────────────────────────────────────────────────────────────────┐
│                      Docker Host Machine                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              app-network (Bridge Driver)                   │ │
│  │                                                            │ │
│  │  ┌─────────────────────┐      ┌──────────────────────┐   │ │
│  │  │   app Container     │      │  postgres Container  │   │ │
│  │  │                     │      │                      │   │ │
│  │  │  • NestJS App       │──────│  • PostgreSQL 16     │   │ │
│  │  │  • Port 3000        │      │  • Port 5432         │   │ │
│  │  │  • Runs migrations  │      │  • Volume: postgres_ │   │ │
│  │  │    on startup       │      │    data (persistent) │   │ │
│  │  │                     │      │                      │   │ │
│  │  └─────────┬───────────┘      └──────────────────────┘   │ │
│  │            │                                              │ │
│  └────────────┼──────────────────────────────────────────────┘ │
│               │                                                │
│  Port Mapping │                                                │
│  localhost:3000 ──> app:3000                                   │
│  localhost:5432 ──> postgres:5432                              │
└───────────────┼────────────────────────────────────────────────┘
                │
                ▼
         External Clients
```

**Key Points:**

- Both containers run on the same `app-network` bridge network
- Containers communicate using service names (`app` talks to `postgres` via hostname `postgres`)
- The app waits for postgres to be healthy before starting (health checks)
- Database data persists in a Docker volume even when containers are stopped
- Ports `3000` and `5432` are exposed to the host machine for external access

## Project Setup

### 1. Install Dependencies

```bash
$ npm i
```

### 2. Setup Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://postgres:religiousPas12@postgres:5432/nest?schema=public"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="religiousPas12"
POSTGRES_DB="nest"

HOST="0.0.0.0"
PORT=3000
JWT_SECRET="your-secret-key-here"
FRONTEND_URL="http://localhost:9090"

NODE_ENV="development"
```

### 3. Setup Prisma

Generate Prisma client:

```bash
$ npx prisma generate
```

Create and apply database migrations:

```bash
$ npx prisma migrate dev --name init
```

### 4. Run with Docker Compose (Recommended)

Build and start all services (app + PostgreSQL):

```bash
$ docker compose up --build
```

Stop services:

```bash
$ docker compose down
```

> **production (via nginx)**: API at `https://localhost/a/` and docs at `https://localhost/a/docs` (load balanced across 2 instances)
> **development (direct)**: API at `http://localhost:3000` and docs at `http://localhost:3000/docs`

## Compile and Run Locally (Without Docker)

Make sure PostgreSQL is running locally and update `DATABASE_URL` in `.env` to use `localhost` instead of `postgres`.

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e
```
