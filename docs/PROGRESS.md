# StudyRoom Backend - Progress and Decisions

## Phase 0: Setup, Environment Validation, and Dependencies (Completed)

### What was built / refactored:
1. **Directory Structure**:
   - Reorganized repository structure to standard `server/src/`, `server/tests/`, and `docs/`.
   - Moved and mapped existing files:
     - Preserved `utils/AppError.js` (custom error class extending Error).
     - Preserved `utils/asyncHandler.js` (middleware async exception forwarding).
     - Extended `utils/constants.js` with `AVATAR_KEYS`, `DEFAULT_KEY`, `USER_ROLES`, `ROOM_STATUS`, `EVENT_TYPES`, `REASON_CATEGORIES`, and `TIMER_PHASES`.
     - Preserved `models/User.js` with all schema rules, `toJSON` transform (stripping `passwordHash` and `__v`), and added optional `timezone` (default 'UTC') validated using `Intl.DateTimeFormat`.
     - Preserved and adapted `config/db.js` supporting both environment connection and programmatic URI overrides (for testing and teardown).
2. **Environment & Security**:
   - Created `server/src/config/env.js`: Zod schema validating `NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_SECRET` (min 32 chars), `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`, `COOKIE_NAME`. Exits immediately with formatted error messages on invalid configuration.
   - Created `server/.env.example` documenting all configuration keys.
   - Generated cryptographically secure 64-character random `JWT_SECRET` in local `server/.env`.
   - Created root `.gitignore` and `server/.gitignore` covering `.env`, `.env.*`, `node_modules/`, `coverage/`. Untracked accidentally committed `node_modules` from git index.
3. **Dependencies Installed**:
   - Production: `bcrypt`, `jsonwebtoken`, `cookie-parser`, `cookie`, `express-rate-limit`, `morgan`, `socket.io`, `node-cron`, `express` (v5), `mongoose` (v9), `helmet`, `cors`, `zod` (v4), `dotenv`.
   - Dev: `jest`, `supertest`, `socket.io-client`, `nodemon`.
4. **Scripts Configured**:
   - In `server/package.json`: `dev`, `start`, `seed`, `test`.
   - In root `package.json`: delegation scripts pointing to `server`.

### Decisions Made:
- Express 5 is in use (`^5.3.0`) with Mongoose 9 (`^9.12.1`) and Zod 4 (`^4.6.7`). Zod error issues are accessed safely via `err.issues`.
- Local standalone MongoDB (`mongodb://127.0.0.1:27017/studyroom`) has no replica set; transactions are explicitly avoided.
- Password hashing is strictly performed in the service layer using `bcrypt` (12 rounds) and never via Mongoose hooks.

### How to Run:
- Server tests: `npm test` or `npm --prefix server test`
- Development server: `npm run dev` or `npm --prefix server run dev`

### What is Pending:
- Phase 1: `app.js` + `server.js`, security middleware, rate limiters, 404, extended `errorHandler`, `/api/health`.
- Phase 2: Auth subsystem (validators, tokens, cookies, routes, protect/authorize middleware).

## Phase 1: Application Skeleton, Security Middleware, Rate Limiters, Extended Error Handler (Completed)

### What was built / refactored:
1. **`server/src/app.js`**:
   - `helmet()` mounted as first middleware.
   - CORS configured with single explicit origin from `CLIENT_ORIGIN` (`http://localhost:5173`), `credentials: true`, allowlisted methods (`GET, POST, PUT, PATCH, DELETE, OPTIONS`) and allowlisted headers (`Content-Type, Authorization, Cookie`).
   - `express.json({ limit: '10kb' })`, `cookieParser()`, `morgan('dev')` (disabled during testing).
   - `app.set('trust proxy', 1)` enabled in production.
   - Global rate limiter attached to `/api`.
   - Health check: `GET /api/health` returning `{ success: true, data: { status: 'healthy', timestamp, environment } }`.
   - 404 handler for unknown routes returning `{ success: false, message }`.
   - Central `errorHandler` mounted last.
2. **`server/src/middleware/errorHandler.js`**:
   - Extended to cleanly handle:
     - `AppError` -> `err.statusCode`, `err.message`
     - `ZodError` -> 400 with `errors` array (`field`, `message`)
     - Mongoose `ValidationError` -> 400 with field errors
     - Mongoose `CastError` -> 400 (`Invalid value for field ...`)
     - MongoDB duplicate key (`code: 11000`) -> 409 Conflict with friendly message naming the conflicting field from `keyPattern`/`keyValue`
     - JWT errors (`JsonWebTokenError`, `TokenExpiredError`) -> 401
     - Payload too large (413 / `entity.too.large`) -> 413
     - Generic 500 error without exposing stack traces in production.
3. **`server/src/middleware/rateLimiters.js`**:
   - Created uniform envelopes returning 429 `{ success: false, message: ... }`:
     - `globalLimiter`: 100 req / 15 min / IP
     - `authLimiter`: 10 req / 15 min / IP
     - `passwordLimiter`: 5 req / 15 min / IP
     - `writeLimiter`: 60 req / 1 min / IP
4. **`server/src/server.js`**:
   - HTTP server creation, MongoDB connection, graceful shutdown on `SIGINT` and `SIGTERM`.
5. **Verification**:
   - Automated script `server/scripts/verify-phase1.js` verified 200 health, 404 not found, 413 payload limit, and CORS configuration.

### Decisions Made:
- Express 5 handles route matching without wildcard regex vulnerabilities; 404 middleware catches all unmatched requests and passes an `AppError(..., 404)` to `next()`.
- MongoDB duplicate keys return HTTP 409 Conflict (fixed from previous 400).
- Morgan logger is disabled when `NODE_ENV === 'test'` to avoid polluting test logs.

### What is Pending:
- Phase 2: Auth subsystem (validators, tokens, cookies, routes, protect/authorize middleware).

## Phase 2: Authentication & Authorization (Completed)

### What was built / refactored:
1. **Security & Cryptography Utilities**:
   - `server/src/utils/password.js`:
     - `hashPassword`: 12-round bcrypt hashing strictly in service layer.
     - `comparePassword`: bcrypt comparison.
     - `compareDummyPassword`: bcrypt comparison against a pre-computed 12-round hash when email is not found, mitigating timing enumeration attacks.
   - `server/src/utils/token.js`:
     - `signToken`: JWT creation encoding only user id, explicit `HS256` algorithm, expiry from `env.JWT_EXPIRES_IN`.
     - `verifyToken`: explicit algorithm enforcement (`['HS256']`).
   - `server/src/utils/cookies.js`:
     - `setAuthCookie`: sets httpOnly, sameSite 'lax', secure (production only), path '/', matching JWT expiry.
     - `clearAuthCookie`: clears cookie using identical options.
   - `server/src/utils/sendResponse.js` and `pagination.js`.
2. **Middleware**:
   - `server/src/middleware/validate.js`: validates `req.body`, `req.query`, and `req.params` against Zod schemas, writes parsed output back to `req`.
   - `server/src/middleware/protect.js`: verifies JWT from cookie (or Bearer fallback), fetches active user, rejects unauthenticated/deleted users with 401, attaches `req.user`.
   - `server/src/middleware/authorize.js`: role-based authorization check, returns 403 on forbidden access.
3. **Validators & Schemas**:
   - `server/src/validators/auth.validator.js`:
     - Strict schemas with `.strict()` preventing client-supplied role assignment or unrecognized parameters.
     - Password rules: min 8, max 72 characters, must contain at least one letter and one number (`/^(?=.*[a-zA-Z])(?=.*\d)/`).
     - Timezone validation: verified against `Intl.DateTimeFormat`.
     - Strong types: string email blocks NoSQL operator injection (`{"$gt": ""}`).
4. **Services, Controllers & Routes**:
   - `server/src/services/auth.service.js`: `register` and `login` with timing attack protection.
   - `server/src/controllers/auth.controller.js`: thin handlers managing cookie operations and response envelope.
   - `server/src/routes/auth.routes.js`:
     - `POST /api/auth/register` (public, `authLimiter`, validated)
     - `POST /api/auth/login` (public, `authLimiter`, validated)
     - `POST /api/auth/logout` (public)
     - `GET /api/auth/me` (protected)
5. **Verification**:
   - Automated script `server/scripts/verify-phase2.js` passed all 9 checks including cookie setting, strict role rejection, duplicate 409, NoSQL injection rejection, authenticated me, unauthenticated 401, timing attack resistance, and logout.

### Decisions Made:
- Dummy hash verification (`compareDummyPassword`) is called whenever email lookup returns null, equalizing response times between non-existent emails and incorrect passwords.
- NoSQL operator injection is completely blocked at the Zod layer before ever reaching service or MongoDB queries.

### What is Pending:
- Phase 3: Users/profile endpoints (`/users/me`, `/users/me/password`, `/users/avatars`, `/users/:username`).

## Phase 3: User Profiles and Account Management (Completed)

### What was built / refactored:
1. **Validators & Schemas**:
   - `server/src/validators/user.validator.js`:
     - `updateMeSchema`: strictly whitelists `avatar` (from `AVATAR_KEYS`) and `timezone` (IANA validated).
     - `changePasswordSchema`: requires `currentPassword` and `newPassword` adhering to 8-72 char complexity rules.
     - `usernameParamSchema`: validates route parameters for lowercase alphanumeric username format.
2. **Services & Controllers**:
   - `server/src/services/user.service.js`:
     - `getMe`: fetches current user profile.
     - `updateMe`: updates whitelisted avatar and timezone with Mongoose 9 `returnDocument: 'after'`.
     - `changePassword`: verifies old password against stored hash, applies 12-round bcrypt hash to new password, updates database.
     - `getAvatars`: returns available avatar options.
     - `getUserProfile`: public profile returning only `{ username, avatar, createdAt }` without exposing sensitive fields (email, role, id, or passwordHash).
   - `server/src/controllers/user.controller.js`: handles request dispatching and response envelopes.
3. **Routes**:
   - `server/src/routes/user.routes.js`:
     - `GET /api/users/avatars` (public)
     - `GET /api/users/me` (protected)
     - `PATCH /api/users/me` (protected, validated)
     - `PATCH /api/users/me/password` (protected, `passwordLimiter`, validated)
     - `GET /api/users/:username` (public, validated)
4. **Verification**:
   - Automated script `server/scripts/verify-phase3.js` verified all 10 requirements: avatar enumeration, profile retrieval, avatar/timezone updates, avatar validation error (400), password mismatch rejection (400), password update, re-login with new password, public profile data leakage prevention, and 404 for unknown users.

### Decisions Made:
- Mongoose 9 deprecation warning resolved by adopting `returnDocument: 'after'`.
- Public profile explicitly projects only `username`, `avatar`, and `createdAt` to guarantee privacy.

### What is Pending:
- Phase 4: Rooms subsystem (model, validators, CRUD, join/leave, private rooms with joinCode).

## Phase 4: Rooms Management, Privacy, & Collaboration (Completed)

### What was built / refactored:
1. **Model**:
   - `server/src/models/Room.js`:
     - Schema: `name` (3-50 chars), `subject`, `subjectKey` (lowercase-normalized), `isPrivate`, `joinCode` (6 random chars, private rooms only), `hostId` (ref User), `participants` ([ref User]), `status` ('open'|'closed'), `pomodoro` (`focusMin` 5-120 default 25, `breakMin` 1-30 default 5).
     - Compound index: `{ subjectKey: 1, status: 1 }` and `{ hostId: 1 }`.
2. **Validators**:
   - `server/src/validators/room.validator.js`:
     - `createRoomSchema`: strictly parses `name`, `subject`, `isPrivate`, `pomodoro`.
     - `updateRoomSchema`: strictly whitelists updatable fields.
     - `joinRoomSchema`: validates optional/required `joinCode`.
     - `roomQuerySchema`: parses `subject`, `page`, `limit`.
3. **Services & Controllers**:
   - `server/src/services/room.service.js`:
     - `createRoom`: generates 6-character hex join code for private rooms; sets host as first participant.
     - `getRooms`: returns open public rooms and rooms where user is participant. Strips `joinCode` for non-hosts.
     - `getRoomById`: returns room, populated host and participants. 403 on private room if not member/host; strips `joinCode` for non-hosts.
     - `joinRoom`: validates join code for private rooms. De-duplicates participants on repeated join attempts.
     - `leaveRoom`: removes user from room participants.
     - `updateRoom`: restricted to `hostId` (403 for non-hosts).
     - `deleteRoom`: soft-deletes room by setting `status = 'closed'` (403 for non-hosts).
   - `server/src/controllers/room.controller.js`: handles request dispatching and envelopes.
4. **Routes**:
   - `server/src/routes/room.routes.js`:
     - `POST /api/rooms`
     - `GET /api/rooms`
     - `GET /api/rooms/:id`
     - `POST /api/rooms/:id/join`
     - `POST /api/rooms/:id/leave`
     - `PATCH /api/rooms/:id`
     - `DELETE /api/rooms/:id`
5. **Verification**:
   - Automated script `server/scripts/verify-phase4.js` verified public/private creation, non-host 403 rejection on PATCH and DELETE, private room access control, joinCode masking for non-hosts, participant de-duplication on repeated join, host update and soft deletion (404 on subsequent get).

### Decisions Made:
- Private room join codes are 6-character cryptographically random uppercase hex strings.
- Non-hosts never receive `joinCode` in API responses (`formatRoomForUser` strips it).
- Repeated joins are idempotent and do not duplicate participants.

### What is Pending:
- Phase 5: Sessions, focus events, break reasons.
- Phase 3: Users profile endpoints.
- Phase 4: Rooms subsystem.
- Phase 5: Sessions, focus events, break reasons.
- Phase 6: Socket.IO (timer, presence, real-time events).
- Phase 7: Analytics, coach, snapshot cron job, interventions.
- Phase 8: Seed script and Jest test suite.
- Phase 9: API Contract, REST Client requests, final end-to-end verification.
- Phase 10: Handoff documentation (`PROJECT_CONTEXT.md` and `AGENTS.md`).
