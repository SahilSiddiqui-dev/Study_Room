# StudyRoom Backend - Project Context & Architecture Guide

## 1. Executive Summary
StudyRoom is a production-grade, collaborative study tracker backend built with Node.js, Express 5, Mongoose 9, Socket.IO, and Zod. It synchronizes multi-user Pomodoro timers across study rooms without client clock drift, records study sessions, interruptions, and one-tap break reasons, computes a mathematically grounded Focus Quality Score (FQS), and executes a deterministic 7-rule coach engine providing targeted, evidence-based recommendations. It contains zero video feeds and zero LLM dependencies.
The codebase enforces a strict 4-layer architecture: **Routes & Middleware -> Controllers (thin adapters) -> Services (pure business logic throwing `AppError`) -> Mongoose Models**.

## 2. System Architecture
```
                         ┌─────────────────────────────────────────┐
                         │   Web Browser / REST Client / Mobile    │
                         └────────────────────┬────────────────────┘
                                              │ HTTP Requests & WebSockets
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Express 5 HTTP Server & Socket.IO Engine (server.js, app.js)                           │
│  - Security: helmet, CORS (explicit CLIENT_ORIGIN, credentials:true), cookie-parser    │
│  - Rate Limiters: global (100/15m), auth (10/15m), password (5/15m), write (60/1m)     │
│  - Middleware: validate({ body, query, params }), protect (JWT), authorize(roles)      │
└──────────────────────────┬─────────────────────────────────┬───────────────────────────┘
                           │ Route Handlers                  │ Real-Time Sockets
                           ▼                                 ▼
┌─────────────────────────────────────────┐       ┌──────────────────────────────────────┐
│ Controllers (Thin HTTP Adapters)        │       │ Socket Dispatcher (sockets/index.js) │
│ - Parse input from req; call service    │       │ - Auth handshake via cookie JWT      │
│ - Send standardized JSON envelopes      │       │ - Presence & Timer Interval Engine   │
└────────────────────┬────────────────────┘       └──────────────────┬───────────────────┘
                     │                                               │
                     └───────────────────────┬───────────────────────┘
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Domain Service Layer (server/src/services/)                                            │
│ - auth, user, room, session, event, analytics, coach, intervention, snapshot           │
│ - Handles password hashing (bcrypt 12 rounds), FQS calculation, rules evaluation      │
│ - Never references req/res; raises domain AppError(message, statusCode)                │
└────────────────────────────────────────────┬───────────────────────────────────────────┘
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Data Layer (Mongoose 9 ODM & Standalone Local MongoDB 8.x)                             │
│ - Schema validation, indexes, toJSON transforms (no password hooks, no transactions)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Environment and Configuration
Validated at boot via Zod (`src/config/env.js`). Fails fast with descriptive error messages on failure.

| Variable | Type | Default | Required | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | enum | `development` | No | Environment mode: `development`, `production`, `test` |
| `PORT` | number | `5000` | No | Port on which the HTTP / Socket.IO server listens |
| `MONGO_URI` | string | - | Yes | Local MongoDB URI (e.g. `mongodb://127.0.0.1:27017/studyroom`) |
| `JWT_SECRET` | string | - | Yes | Secret for HS256 JWT signing (minimum 32 characters) |
| `JWT_EXPIRES_IN` | string | `1d` | No | Expiration duration for signed JSON Web Tokens |
| `CLIENT_ORIGIN` | string | `http://localhost:5173` | No | Single explicit origin allowed by CORS policy |
| `COOKIE_NAME` | string | `token` | No | Name of httpOnly cookie storing authentication token |

## 4. Database Models and Relationships

| Model / Collection | Key Fields | Indexes | Relationships & Rules |
| :--- | :--- | :--- | :--- |
| **User** (`users`) | `username`, `email`, `passwordHash`, `avatar`, `role`, `timezone` | `username: 1` (unique), `email: 1` (unique) | Avatars: `owl` (default), `fox`, `panda`, `cat`, `bear`. Roles: `user`, `admin`. `passwordHash` hidden (`select:false`). `toJSON` strips secrets. No Mongoose hashing hooks. |
| **Room** (`rooms`) | `name`, `subject`, `subjectKey`, `isPrivate`, `joinCode`, `hostId`, `participants`, `status`, `pomodoro` | `status: 1, createdAt: -1`, `subjectKey: 1` | `hostId` -> `User._id`. `joinCode` (6 alphanumeric chars) generated for private rooms; masked from non-hosts. Status: `open`, `closed`. |
| **StudySession** (`studysessions`) | `userId`, `roomId`, `subject`, `goal`, `plannedMinutes`, `startedAt`, `endedAt`, `actualMinutes`, `completed` | `userId: 1, startedAt: -1`, `userId: 1, endedAt: 1` | `userId` -> `User._id`. Only 1 active session allowed per user (enforced via DB query check returning HTTP 409). |
| **FocusEvent** (`focusevents`) | `sessionId`, `userId`, `type`, `startedAt`, `durationSec`, `planned` | `sessionId: 1, startedAt: 1`, `userId: 1, startedAt: 1` | `sessionId` -> `StudySession._id`. Types: `tab_switch`, `idle`, `left_room`, `manual_break`, `planned_break`. |
| **BreakReason** (`breakreasons`) | `eventId`, `userId`, `category`, `note` | `eventId: 1` (unique), `userId: 1, createdAt: -1` | `eventId` -> `FocusEvent._id`. 1:1 with interruption. Categories: `phone`, `notification`, `fatigue`, `difficult_topic`, `doubt`, `planned`, `other`. Duplicate reason rejected with 409. |
| **AnalyticsSnapshot** (`analyticssnapshots`) | `userId`, `date`, `fqs`, `interruptionRate`, `avgUninterruptedMin`, `topReason`, `recommendations` | `userId: 1, date: 1` (unique compound) | Stores daily aggregated metrics (`date`: 'YYYY-MM-DD'). Upserted by midnight background cron job or admin trigger. |
| **Intervention** (`interventions`) | `userId`, `ruleId`, `suggestedAction`, `shownAt`, `baseline` (`avgUninterruptedMin`, `completionRate`, `interruptionRate`) | `userId: 1, shownAt: -1` | Captures snapshot of 7-day user baseline at moment coach tip is surfaced. Enables empirical before-vs-after outcome analysis. |

## 5. Authentication and Security Model
- **Cookie-Based JWT**: Signed via `HS256` containing only `{ id }`. Stored in `httpOnly` cookie (`sameSite: 'lax'`, `secure: true` in production, `path: '/'`). Header fallback `Authorization: Bearer <token>` supported for non-browser tooling.
- **Timing Attack Defense**: Non-existent emails trigger a dummy bcrypt comparison (`compareDummyPassword`) to normalize response latency.
- **CORS & Headers**: `helmet()` mounted first. CORS enforces single explicit origin matching `CLIENT_ORIGIN` with `credentials: true`.
- **Validation**: Strict boundary validation via Zod (`.strict()` rejects unexpected fields, preventing mass assignment).
- **Rate Limiters**: Tiered IP rate limiting via `express-rate-limit` returning `{ success: false, message: ... }`.

## 6. HTTP API Surface

| Method | Route | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Returns service health status and uptime timestamp |
| `POST` | `/api/auth/register` | Public (10/15m) | Registers user, hashes password (12 rounds), sets auth cookie |
| `POST` | `/api/auth/login` | Public (10/15m) | Verifies credentials, sets auth cookie (constant-time response) |
| `POST` | `/api/auth/logout` | Public | Clears auth cookie |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user record |
| `GET` | `/api/users/me` | Authenticated | Returns full personal profile |
| `PATCH` | `/api/users/me` | Authenticated | Updates whitelisted profile attributes (`avatar`, `timezone`) |
| `PATCH` | `/api/users/me/password` | Authenticated (5/15m) | Validates current password, updates to new password, rotates cookie |
| `GET` | `/api/users/avatars` | Public | Returns supported avatar keys and default key |
| `GET` | `/api/users/:username` | Authenticated | Returns sanitized public profile (username, avatar, join date) |
| `POST` | `/api/rooms` | Authenticated | Creates a study room (auto-generates joinCode if private) |
| `GET` | `/api/rooms` | Authenticated | Lists active study rooms with pagination and search |
| `GET` | `/api/rooms/:id` | Authenticated | Fetches room details (masks joinCode from non-hosts) |
| `PATCH` | `/api/rooms/:id` | Authenticated (Host) | Updates room settings and Pomodoro configuration |
| `DELETE` | `/api/rooms/:id` | Authenticated (Host) | Sets room status to `closed` |
| `POST` | `/api/rooms/:id/join` | Authenticated | Joins room (verifies joinCode for private rooms; deduplicates) |
| `POST` | `/api/rooms/:id/leave` | Authenticated | Removes user from room participant roster |
| `POST` | `/api/sessions` | Authenticated | Starts a new study session (rejects with 409 if active exists) |
| `GET` | `/api/sessions/active` | Authenticated | Fetches the user's currently active study session |
| `PATCH` | `/api/sessions/:id/end` | Authenticated | Concludes session, computes actual duration, updates status |
| `GET` | `/api/sessions` | Authenticated | Paginated query of historical study sessions |
| `POST` | `/api/sessions/:id/events` | Authenticated | Records a focus event (e.g. `tab_switch`, `idle`, `manual_break`) |
| `GET` | `/api/sessions/:id/events` | Authenticated | Lists all logged focus events for a session |
| `POST` | `/api/events/:id/reason` | Authenticated | Attaches one-tap break reason to an interruption (rejects duplicates with 409) |
| `GET` | `/api/analytics/summary` | Authenticated | Returns period metrics, deltas, and computed FQS (7d or 30d) |
| `GET` | `/api/analytics/reasons` | Authenticated | Returns break category counts and percentage breakdown |
| `GET` | `/api/analytics/heatmap` | Authenticated | Returns 7x24 weekday-hour focus matrix mapped to user timezone |
| `GET` | `/api/analytics/subjects` | Authenticated | Per-subject study minutes, interruption rate, and FQS |
| `GET` | `/api/analytics/coach` | Authenticated | Evaluates rule engine; returns top 4 actionable suggestions |
| `POST` | `/api/analytics/snapshots/run` | Admin Only | Manually triggers daily snapshot computation job |
| `POST` | `/api/interventions` | Authenticated | Records coach tip shown and captures 7-day prior baseline |
| `GET` | `/api/interventions/report` | Authenticated | Before-and-after empirical comparison of intervention efficacy |

## 7. Socket.IO Real-Time Engine
- **Auth Handshake**: Cookies parsed during handshake (`cookie.parse || cookie.parseCookie`). Verified via `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })`.
- **Rate Limit**: Max 20 events per 10-second rolling window per socket connection.
- **Authoritative Server Timer**: In-memory `Map<roomId, timerState>` holds `{ remainingSec, phase, isRunning, intervalId }`. Server executes countdown every 1000ms and broadcasts `timer:sync`. At zero, server toggles `focus` <-> `break` automatically and emits `timer:phase`.
- **Presence Tracking**: In-memory `Map<roomId, Map<userId, socketIdSet>>` de-duplicates multi-tab connections and broadcasts `room:presence`. Disconnect logs `left_room` event if session active.

| Event | Direction | Payload | Ack | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `room:join` | Client -> Server | `{ roomId }` | No | Subscribes socket, registers presence, syncs current timer |
| `room:leave` | Client -> Server | `{ roomId }` | No | Unsubscribes socket, clears presence, broadcasts roster |
| `room:presence` | Server -> Client | `{ roomId, participants: [...] }` | No | Broadcasts active user roster upon join/leave/disconnect |
| `timer:start` | Client -> Server | `{ roomId }` | No | Host only: initiates/resumes server interval countdown |
| `timer:pause` | Client -> Server | `{ roomId }` | No | Host only: halts interval countdown |
| `timer:reset` | Client -> Server | `{ roomId }` | No | Host only: resets clock to room's configured Pomodoro duration |
| `timer:sync` | Server -> Client | `{ roomId, remainingSec, phase, isRunning }` | No | Periodic sync broadcast to keep all clients perfectly aligned |
| `timer:phase` | Server -> Client | `{ roomId, phase, remainingSec }` | No | Broadcast when timer toggles between focus and break |
| `focus:event` | Client -> Server | `{ roomId, eventType, note }` | `ack({ success, eventId })` | Logs event; returns `eventId` for immediate one-tap reason logging |

## 8. Analytics Engine and FQS Formula
- **Pure Formula (`utils/fqs.js`)**:
  $$\text{FQS} = 40 \times \text{uninterruptedRatio} + 25 \times \left(1 - \min\left(\frac{\text{interruptionRate}}{10}, 1\right)\right) + 20 \times \text{sessionCompletion} + 15 \times \left(1 - \min\left(\frac{\text{contextSwitchRate}}{10}, 1\right)\right)$$
- **Metric Definitions**:
  - `uninterruptedRatio`: Sum of uninterrupted focus blocks divided by total active minutes.
  - `interruptionRate`: Total unplanned interruptions per hour of study.
  - `sessionCompletion`: Proportion of initiated sessions completed vs abandoned.
  - `contextSwitchRate`: Rate of shifting between subjects or study rooms per hour.
- **Robustness**: Edge cases with 0 minutes or no sessions safely return `0.0` or baseline without `NaN`.
- **Timezone Awareness**: The 7x24 heatmap groups timestamps projected into the user's specific IANA timezone identifier (`User.timezone`).

## 9. Coach Rule Engine
Evaluates historical metrics across the last 14 days (minimum 3 sessions required). Returns up to 4 highest severity suggestions with real numeric figures quoted in evidence:

| Rule ID | Severity | Trigger Condition & Threshold | Suggested Action |
| :--- | :--- | :--- | :--- |
| `dominant_break_reason` | 1 | Single reason category >= 40% of all logged breaks | Category-specific guidance (e.g. phone in another room, app blockers, scheduled snack breaks) |
| `high_interruption_rate` | 2 | Overall interruption rate > 6 interruptions/hour | Shorten focus intervals to 15-20 min Pomodoros to build concentration endurance |
| `evening_spike` | 2 | Evening interruptions (18:00-21:00) >= 1.5x daytime rate | Shift complex analytical study to morning hours; use evenings for passive review |
| `best_focus_window` | 3 | Identifies 2-hour window with highest focus stamina and lowest breaks | Block out peak productivity window on calendar for hardest study topics |
| `session_length` | 3 | Short sessions (<=30m) have >= 25% higher completion than long (>30m) | Cap study blocks at 25-30 minutes and take frequent structured breaks |
| `subject_weakness` | 4 | Subject interruption rate >= 1.5x user overall average | Break down challenging subject into smaller 10-minute micro-goals or seek peer help |
| `positive_reinforcement` | 5 | Focus Quality Score increased by >= 10 points vs previous period | Positive affirmation acknowledging focus improvements |

## 10. Background Jobs
- **Daily Snapshot Cron (`jobs/snapshot.job.js`)**:
  - **Schedule**: `0 5 0 * * *` (00:05 AM every day).
  - **Function**: Iterates over all active users, evaluates yesterday's activity (`00:00:00` to `23:59:59.999`), computes metrics and top reason, and performs an idempotent `findOneAndUpdate(..., { upsert: true })` into `AnalyticsSnapshot`.
  - **Manual Trigger**: Admin users can invoke `POST /api/analytics/snapshots/run?date=YYYY-MM-DD` to recompute any target date.

## 11. Development Workflow and Commands
```bash
# 1. Install dependencies
cd server && npm install

# 2. Configure environment
cp .env.example .env

# 3. Seed database (creates admin, 3 users, 3 rooms, 30 days of sessions/events/snapshots)
npm run seed

# 4. Start local development server (with nodemon)
npm run dev

# 5. Run test suite (isolated in-memory collections on studyroom_test)
npm test

# 6. Run end-to-end integration verification
node scripts/verify-e2e.js
```

### Seed Accounts (Password: `Demo@1234`)
- **Admin**: `admin@studyroom.test` (role: `admin`)
- **User 1**: `alice@studyroom.test` (timezone: `UTC`)
- **User 2**: `bob@studyroom.test` (timezone: `America/New_York`)
- **User 3**: `charlie@studyroom.test` (timezone: `Asia/Kolkata`)

## 12. Known Limitations and Future Work
- **Local MongoDB Transactions**: Standalone local MongoDB installations run without replica sets; distributed multi-document ACID transactions (`session.withTransaction`) are not supported and are avoided in favor of idempotent single-document and query checks.
- **Single-Node Socket.IO State**: Room timer intervals and presence sets are held in Node.js process memory. Multi-instance horizontal scaling will require attaching `@socket.io/redis-adapter` and storing active timer states in Redis.
- **No Video / No LLM**: Architecture intentionally uses deterministic mathematical scoring and rule-based coaching for predictable latency, complete data privacy, and zero operational API costs.

