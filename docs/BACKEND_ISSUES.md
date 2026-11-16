# StudyRoom - Backend Issues & Feature Requests for Backend Owner

This document captures observed architectural limitations, missing endpoints, and feature requests identified during frontend development. No server code was unilaterally modified.

---

## 1. Feature Requests

### 1.1 Populate `BreakReason` in `GET /api/sessions/:id/events`
- **Current Behavior**: `GET /api/sessions/:id/events` returns `FocusEvent` documents. The corresponding `BreakReason` (which has `eventId: FocusEvent._id`) is not joined.
- **Client Impact**: When reviewing historical sessions in the session summary or history timeline, the specific break reason category (e.g. `phone`, `fatigue`) and user note cannot be retrieved from the server.
- **Requested Fix**: In `event.service.js`, either use an aggregate `$lookup` to join `BreakReason` onto each event or provide `GET /api/sessions/:id/events?includeReasons=true`.

### 1.2 Implement `timer:pause` and `timer:reset` in Socket Dispatcher
- **Current Behavior**: `server/src/sockets/index.js` only listens for `timer:start`. Emitting `timer:pause` or `timer:reset` is ignored by the server.
- **Client Impact**: Hosts cannot temporarily pause an active Pomodoro timer; they can only restart it with `timer:start`.
- **Requested Fix**: Add `timer:pause` and `timer:reset` handlers to `server/src/sockets/index.js` and extend `TimerManager` (`server/src/sockets/timer.js`) to support pausing the countdown interval.

### 1.3 Public Snapshot / Trend Line Endpoint
- **Current Behavior**: `AnalyticsSnapshot` holds daily snapshots (`YYYY-MM-DD`), but the only endpoint exposed is `POST /api/analytics/snapshots/run` (admin only).
- **Client Impact**: Clients cannot render a continuous day-by-day FQS trend line.
- **Requested Fix**: Add `GET /api/analytics/snapshots?from=YYYY-MM-DD&to=YYYY-MM-DD` for the authenticated user.

---

## 2. Server Bug Fixes (None Required)
- **Status**: The backend codebase is clean, tests are passing, and boundary validations work properly. No server modifications were necessary for Phase 0.
