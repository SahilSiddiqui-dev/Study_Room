# StudyRoom Backend

StudyRoom is a live, collaborative study tracker and real-time Pomodoro backend designed for focused student groups. It synchronizes authoritative multi-participant Pomodoro timers across study rooms via Socket.IO, logs study interruptions and one-tap break reasons, calculates mathematically explainable analytics (including a normalized Focus Quality Score), and runs a deterministic rule-based coach engine that delivers personalized, actionable productivity recommendations without using video feeds or large language models.

---

## Tech Stack

- **Runtime & Framework**: Node.js (CommonJS), Express 5 (`^5.3.0`)
- **Database**: MongoDB 8.x with Mongoose 9 (`^9.12.1`)
- **Real-Time Engine**: Socket.IO (`^4.8.1`)
- **Validation**: Zod 4 (`^4.6.7`)
- **Security & Cryptography**: Helmet, CORS, bcrypt (12 rounds), jsonwebtoken, cookie-parser, express-rate-limit
- **Scheduling**: node-cron (`^3.0.3`)
- **Testing & Quality Assurance**: Jest 29 (`--runInBand`), Supertest, Socket.IO Client

---

## Prerequisites

- **Node.js**: `v18.x` or `v20.x` or higher
- **MongoDB**: Local standalone MongoDB instance running on `mongodb://127.0.0.1:27017` (default port). Note: Transactions are explicitly not required or used to ensure compatibility with standalone local installations.

---

## Quick Start

1. **Navigate to the server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   # Copy example configuration if .env does not already exist
   cp .env.example .env
   ```
   Ensure `.env` contains:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/studyroom
   JWT_SECRET=your_super_secret_key_at_least_32_characters_long
   JWT_EXPIRES_IN=1d
   CLIENT_ORIGIN=http://localhost:5173
   COOKIE_NAME=token
   ```

4. **Seed the database with realistic demo data**:
   ```bash
   npm run seed
   ```
   *This seeds 1 admin, 3 demo users (`alice`, `bob`, `charlie` / `Demo@1234`), 3 study rooms, 30 days of realistic study sessions, focus interruptions, break reasons, and initial daily snapshots.*

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:5000`.

---

## Running Automated Tests

Run the complete automated Jest test suite (unit and integration tests):
```bash
npm --prefix server test
# or from inside server/
npm test
```
The test suite operates on an isolated database (`mongodb://127.0.0.1:27017/studyroom_test`), drops test collections between runs, and validates authentication, rooms, sessions, FQS pure computation, and coach rule triggers with zero open handles.

---

## High-Level Architecture (4-Layer Pattern)

The backend strictly enforces clean separation of concerns across four distinct layers:

```
[ HTTP Requests / Sockets ]
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ 1. Routes & Middleware                                 │
│    - Express Routers, Helmet, CORS, Rate Limiters      │
│    - protect (JWT Cookie / Bearer), authorize (Roles)  │
│    - validate({ body, query, params }) with Zod        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Controllers (Thin HTTP Adapters)                    │
│    - Parse validated inputs from req                   │
│    - Call corresponding service method                 │
│    - Send uniform JSON response envelope               │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Services (Core Business Logic)                      │
│    - All business rules, computations, & algorithms    │
│    - Password hashing & timing attack defenses         │
│    - Never touches req/res; throws AppError            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. Mongoose Models & MongoDB                           │
│    - Schemas, indexes, toJSON transformations          │
│    - Persistence to local standalone MongoDB           │
└────────────────────────────────────────────────────────┘
```

---

## Key Documentation Links

- **API Contract**: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) - Complete endpoints, schemas, Socket.IO events, and payload formats.
- **Viva & Technical Notes**: [`docs/VIVA_NOTES.md`](docs/VIVA_NOTES.md) - Concise answers to oral examination questions on architecture, security, and formulas.
- **Project Context & Handoff**: [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) - Single source of truth context document for future maintainers.
- **REST Client Requests**: [`server/requests.http`](server/requests.http) - Interactive HTTP request collection for testing all endpoints.
