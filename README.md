# ExpenseFlow API

Node.js + Express + TypeScript + MongoDB backend for the ExpenseFlow personal finance app.

## Quick start

```bash
npm install
cp .env.example .env       # then set MONGODB_URI (local mongod or MongoDB Atlas)
npm run dev                # http://localhost:8000/api/v1
```

Swagger UI: **http://localhost:8000/api/v1/docs**

Tests need no database — they spin up `mongodb-memory-server`:

```bash
npm test
```

## Architecture

Feature-based clean architecture with a strict one-way dependency flow:

```
routes → middlewares (auth, validation, rate limit, upload)
      → controllers   (HTTP only: read request, call service, shape response)
      → services      (business logic; throws ApiError; no Express imports)
      → repositories  (data access; the only layer that touches Mongoose queries)
      → models        (Mongoose schemas + indexes)
```

Supporting layers: `config/` (env via Zod, winston logger, db, Cloudinary, Swagger), `validators/` (Zod schemas per feature), `utils/` (ApiError, response envelope, asyncHandler, pagination), `types/` (shared domain enums + Express augmentation).

### Conventions

- **Response envelope** — every success: `{ success: true, message, data, meta? }`; every error: `{ success: false, message, errors? }` via the single global error handler.
- **Auth** — short-lived JWT access tokens (15m) + opaque rotating refresh tokens stored hashed with reuse detection (a replayed refresh token revokes the whole session family). Forgot-password uses bcrypt-hashed 6-digit OTPs (10 min TTL, 5 attempts) exchanged for a single-use reset token; password reset revokes all sessions.
- **Multi-tenancy** — every expense/income query is scoped by `user`; a foreign document id 404s rather than 403s (no existence leak).
- **Validation** — Zod on body/query/params of every endpoint; parsed values replace the raw request segment so controllers receive typed, defaulted input.
- **Security** — helmet, CORS allowlist, tight rate limits on credential endpoints, bcrypt cost 12, identical errors for unknown-email vs wrong-password.

## Endpoints (v1)

| Area | Routes |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/verify-otp`, `/auth/reset-password`, `GET /auth/me` |
| Expenses | `GET/POST /expenses`, `GET/PATCH/DELETE /expenses/:id`, `POST /expenses/:id/receipt` (multipart `receipt` → Cloudinary) |
| Income | `GET/POST /income`, `GET/PATCH/DELETE /income/:id` |
| Dashboard | `GET /dashboard/summary?month=YYYY-MM` — totals, category breakdown, 6-month trend, recent transactions |
| Meta | `GET /health` |

List endpoints support `page`, `limit` (≤100), `sortBy`, `order`, `q` (partial-word search), plus per-entity filters (`category`, `paymentMethod`, `dateFrom/dateTo`, `minAmount/maxAmount` for expenses; `source`, dates for income).

## Environment

See [.env.example](.env.example). Cloudinary and SMTP are optional in dev: receipt uploads return a clear 500 until Cloudinary is configured, and OTPs are logged to the console when SMTP is unset.

## Roadmap

EMI, Credit Card, Loan, Budget, Savings, Bills, Reports, and Socket.IO realtime follow the same layer pattern — see [../docs/ROADMAP.md](../docs/ROADMAP.md). The dashboard response already reserves `upcomingEmi`, `creditCardDue`, `loanOutstanding`, and `savingsProgress` fields so the mobile contract won't break when v2 ships.
