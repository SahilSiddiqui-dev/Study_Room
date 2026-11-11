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
- Phase 3: Users profile endpoints.
- Phase 4: Rooms subsystem.
- Phase 5: Sessions, focus events, break reasons.
- Phase 6: Socket.IO (timer, presence, real-time events).
- Phase 7: Analytics, coach, snapshot cron job, interventions.
- Phase 8: Seed script and Jest test suite.
- Phase 9: API Contract, REST Client requests, final end-to-end verification.
- Phase 10: Handoff documentation (`PROJECT_CONTEXT.md` and `AGENTS.md`).
