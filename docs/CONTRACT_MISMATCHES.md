# StudyRoom - Contract Mismatches & Documentation Drift

This document records all discrepancies between the backend documentation (`docs/API_CONTRACT.md`, `docs/PROJECT_CONTEXT.md`, `AGENTS.md`, `server/requests.http`) and the actual implementation in `server/src/`. As per project engineering guidelines, **the actual backend code is the authoritative source of truth**.

---

## 1. Socket.IO Events & Payloads

### 1.1 `timer:pause` and `timer:reset` Handlers
- **Documented**: `docs/API_CONTRACT.md` (Section 4) and `AGENTS.md` (Section 7) specify `timer:pause` (`{ roomId }`) and `timer:reset` (`{ roomId }`) as supported client-to-server events.
- **Actual Code**: `server/src/sockets/index.js` does NOT listen to `timer:pause` or `timer:reset`. The `TimerManager` class (`server/src/sockets/timer.js`) only implements `start(io, roomId, ...)` and `clear(roomId)`.
- **Frontend Handling**: The host controls the timer via `timer:start` `{ roomId, focusMin, breakMin }`. If the host needs to restart the timer or change durations, emitting `timer:start` resets and restarts the interval.

### 1.2 `timer:sync` Broadcast Payload
- **Documented**: `docs/API_CONTRACT.md` and `AGENTS.md` list payload as:
  `{ roomId, remainingSec, phase, isRunning }`
- **Actual Code**: `server/src/sockets/timer.js` (lines 35-40, 64-69) broadcasts:
  `{ roomId, phase, remainingSec, serverTime }`
- **Frontend Handling**: The frontend relies on `{ roomId, phase, remainingSec, serverTime }`. The `serverTime` ISO timestamp is used to compute local clock offset and drive smooth 1-second ticks between server broadcasts. The timer is active as long as sync packets arrive.

### 1.3 `timer:phase` Broadcast Payload
- **Documented**: `docs/API_CONTRACT.md` lists `{ roomId, phase, remainingSec }`.
- **Actual Code**: `server/src/sockets/timer.js` (line 61) emits:
  `{ roomId, phase }`
- **Frontend Handling**: The frontend listens to `timer:phase` to transition phases (`focus` <-> `break`) and expects the subsequent `timer:sync` packet for the fresh `remainingSec`.

### 1.4 `focus:event` Client Event Signature
- **Documented**: `AGENTS.md` table lists:
  `focus:event` payload as `{ roomId, eventType, note }`
- **Actual Code**: `server/src/sockets/index.js` (line 168) runs `createEventSchema.safeParse(data)`. `createEventSchema` (`server/src/validators/event.validator.js`) strictly validates:
  `{ type: enum(EVENT_TYPES), durationSec?: number, planned?: boolean, startedAt?: string }`
  Passing `eventType` or `note` causes validation failure or property loss.
- **Frontend Handling**: Client emits `focus:event` with `{ type, durationSec, planned }`. The server responds to the ack callback with `{ success: true, eventId }`. The reason and note are then posted via REST to `POST /api/events/:id/reason` with `{ category, note }`.

---

## 2. Avatar Keys in `requests.http`

- **Documented**: `server/requests.http` (line 34) contains a sample registration body with `"avatar": "koala"`.
- **Actual Code**: `server/src/utils/constants.js` and `server/src/validators/auth.validator.js` define `AVATAR_KEYS = ['owl', 'fox', 'panda', 'cat', 'bear']`. Submitting `"koala"` is rejected with HTTP 400.
- **Frontend Handling**: Frontend strictly restricts avatar selection to the five supported keys: `owl`, `fox`, `panda`, `cat`, `bear`, populated dynamically via `GET /api/users/avatars`.

---

## 3. Data Gaps: Break Reasons on Session Events

- **Documented**: The session summary flow expects a timeline of events with their break reasons.
- **Actual Code**: `GET /api/sessions/:id/events` invokes `FocusEvent.find({ sessionId })`, which returns raw `FocusEvent` records (`_id`, `sessionId`, `type`, `durationSec`, `planned`, `startedAt`). It does not join or populate `BreakReason`. Furthermore, there is no public endpoint like `GET /api/events/:id/reason`.
- **Frontend Handling**: During an active study session, the client tracks submitted break reasons in memory / TanStack Query cache. On the session summary timeline, local reasons are displayed where available, while historical sessions display the logged focus event types and durations.

---

## 4. Analytics Summary Data Shape

- **Documented**: Dashboards often expect a daily time series for trend lines.
- **Actual Code**: `GET /api/analytics/summary?range=7d|30d` computes aggregate metrics (`current`, `previous`, `delta`) containing `activeMinutes`, `totalSessions`, `completedSessions`, `unplannedCount`, `sessionCompletion`, `interruptionRate`, `avgUninterruptedMin`, `recoveryTimeSec`, `uninterruptedRatio`, `contextSwitchRate`, and `fqs`.
- **Frontend Handling**: The frontend does not synthesize fake time-series data. It presents high-fidelity FQS gauges, delta indicators, key metric cards, the 7x24 timezone-adjusted heatmap (`/api/analytics/heatmap`), reason distribution (`/api/analytics/reasons`), and subject comparison (`/api/analytics/subjects`).
