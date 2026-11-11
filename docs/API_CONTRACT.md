# StudyRoom Backend - API Contract

This document provides the complete API specification for the StudyRoom backend, covering HTTP endpoints, Socket.IO real-time events, authentication mechanisms, and data schemas.

---

## 1. Authentication & Security Conventions

### Cookie-Based JWT Authentication
- **Transport**: Authentication is managed via an `httpOnly` secure cookie named `token` (configurable via `COOKIE_NAME`).
- **Authorization Header Fallback**: For API tools or environments that do not support cookies, `Authorization: Bearer <token>` is accepted.
- **Frontend Configuration**:
  - `fetch`: Pass `{ credentials: 'include' }`.
  - `axios`: Set `{ withCredentials: true }`.
- **CORS Requirements**:
  - Origin must strictly match `CLIENT_ORIGIN` (default: `http://localhost:5173`).
  - Wildcards (`*`) are disallowed when `credentials: true`.
  - Allowed headers: `Content-Type`, `Authorization`, `Cookie`.
  - Allowed methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.

### Response Envelopes
All HTTP responses use a standard JSON envelope:
- **Success (200, 201)**:
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "Optional human-readable confirmation"
  }
  ```
- **Error (400, 401, 403, 404, 409, 413, 429, 500)**:
  ```json
  {
    "success": false,
    "message": "Error description",
    "errors": [
      { "field": "email", "message": "Invalid email address" }
    ]
  }
  ```

---

## 2. Enums and Constants

### `AVATAR_KEYS`
`['owl', 'fox', 'panda', 'cat', 'bear']` (Default: `'owl'`)

### `USER_ROLES`
`['user', 'admin']` (Default: `'user'`)

### `ROOM_STATUS`
`['open', 'closed']` (Default: `'open'`)

### `EVENT_TYPES`
- `tab_switch`: Browser focus lost to another window or tab
- `idle`: User inactive or idle past threshold
- `left_room`: User exited or disconnected from the study room
- `manual_break`: User manually paused/interrupted study
- `planned_break`: Scheduled Pomodoro break interval

### `REASON_CATEGORIES`
`['phone', 'notification', 'fatigue', 'difficult_topic', 'doubt', 'planned', 'other']`

### `TIMER_PHASES`
`['focus', 'break']`

---

## 3. HTTP Endpoints

### 3.1 Health Check
#### `GET /api/health`
- **Auth**: None
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "timestamp": "2026-11-11T08:00:00.000Z",
      "environment": "development"
    }
  }
  ```

---

### 3.2 Authentication (`/api/auth`)

#### `POST /api/auth/register`
- **Rate Limit**: 10 req / 15m
- **Body (`strict`)**:
  ```json
  {
    "username": "study_champ",   // Required, 3-20 chars, lowercase, /^[a-z0-9_]+$/
    "email": "champ@test.com",    // Required, valid email
    "password": "Password123",    // Required, 8-100 chars
    "avatar": "owl",              // Optional enum: cat, dog, fox, panda, koala, owl
    "timezone": "UTC"             // Optional valid IANA timezone (default: UTC)
  }
  ```
- **Response `201`**: Sets `token` cookie; returns `{ success: true, data: { user } }`.
- **Errors**: `400` (Validation), `409` (Username or Email already registered).

#### `POST /api/auth/login`
- **Rate Limit**: 10 req / 15m
- **Body (`strict`)**:
  ```json
  {
    "email": "champ@test.com",    // Required, valid email
    "password": "Password123"     // Required
  }
  ```
- **Response `200`**: Sets `token` cookie; returns `{ success: true, data: { user } }`.
- **Errors**: `400` (Validation), `401` (Invalid credentials with timing attack mitigation).

#### `POST /api/auth/logout`
- **Auth**: None (or authenticated)
- **Response `200`**: Clears `token` cookie; `{ success: true, message: "Logged out successfully" }`.

#### `GET /api/auth/me`
- **Auth**: Required (`protect`)
- **Response `200`**: `{ success: true, data: { user } }`.
- **Errors**: `401` (Unauthenticated or user deleted).

---

### 3.3 Users (`/api/users`)

#### `GET /api/users/me`
- **Auth**: Required (`protect`)
- **Response `200`**: `{ success: true, data: { user } }`.

#### `PATCH /api/users/me`
- **Auth**: Required (`protect`)
- **Body (`strict`, all optional)**:
  ```json
  {
    "avatar": "koala",
    "timezone": "America/New_York"
  }
  ```
- **Response `200`**: `{ success: true, data: { user } }`.
- **Errors**: `400` (Invalid avatar or invalid IANA timezone).

#### `PATCH /api/users/me/password`
- **Rate Limit**: 5 req / 15m
- **Auth**: Required (`protect`)
- **Body (`strict`)**:
  ```json
  {
    "currentPassword": "Password123",
    "newPassword": "NewStrongPassword456"
  }
  ```
- **Response `200`**: Sets fresh `token` cookie; `{ success: true, message: "Password updated successfully" }`.
- **Errors**: `400` (Validation / Same password), `401` (Incorrect current password).

#### `GET /api/users/avatars`
- **Auth**: None
- **Response `200`**: `{ success: true, data: { avatars: [...], default: "cat" } }`.

#### `GET /api/users/:username`
- **Auth**: Required (`protect`)
- **Params**: `username` (string)
- **Response `200`**: `{ success: true, data: { user: { username, avatar, createdAt } } }`.
- **Errors**: `404` (User not found).

---

### 3.4 Study Rooms (`/api/rooms`)

#### `POST /api/rooms`
- **Auth**: Required (`protect`)
- **Body (`strict`)**:
  ```json
  {
    "name": "Linear Algebra Squad",    // 3-50 chars
    "subject": "Mathematics",          // 1-50 chars
    "isPrivate": true,                 // default false
    "pomodoro": {                      // optional
      "focusMin": 25,                  // 5-120 (default 25)
      "breakMin": 5                    // 1-30 (default 5)
    }
  }
  ```
- **Response `201`**: Returns created room object. For private rooms, `joinCode` (6 alphanumeric characters) is returned.

#### `GET /api/rooms`
- **Auth**: Required (`protect`)
- **Query Params**:
  - `page` (default: 1), `limit` (default: 10, max 100)
  - `subject` (optional filter)
  - `search` (optional regex search on room name)
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "rooms": [ ... ],
      "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
    }
  }
  ```

#### `GET /api/rooms/:id`
- **Auth**: Required (`protect`)
- **Params**: `id` (Mongo ObjectId)
- **Response `200`**: Returns room object. `joinCode` is masked unless requester is the host.
- **Errors**: `400` (Invalid ObjectId), `404` (Room not found).

#### `PATCH /api/rooms/:id`
- **Auth**: Required (`protect`)
- **Params**: `id` (Mongo ObjectId)
- **Body (`strict`, all optional)**: `name`, `subject`, `pomodoro` (`focusMin`, `breakMin`).
- **Response `200`**: Returns updated room.
- **Errors**: `403` (Only host may modify room), `404` (Room not found).

#### `DELETE /api/rooms/:id`
- **Auth**: Required (`protect`)
- **Params**: `id` (Mongo ObjectId)
- **Response `200`**: `{ success: true, message: "Room archived successfully" }`.
- **Errors**: `403` (Only host may archive room), `404` (Room not found).

#### `POST /api/rooms/:id/join`
- **Auth**: Required (`protect`)
- **Params**: `id` (Mongo ObjectId)
- **Body (`strict`)**: `{ "joinCode": "ABC123" }` (Required if room `isPrivate: true`).
- **Response `200`**: `{ success: true, data: { room } }`.
- **Errors**: `400` (Missing or invalid joinCode for private room).

#### `POST /api/rooms/:id/leave`
- **Auth**: Required (`protect`)
- **Params**: `id` (Mongo ObjectId)
- **Response `200`**: `{ success: true, message: "Left room successfully" }`.

---

### 3.5 Study Sessions (`/api/sessions`)

#### `POST /api/sessions`
- **Auth**: Required (`protect`)
- **Body (`strict`)**:
  ```json
  {
    "subject": "Computer Science",      // 1-50 chars (required if no roomId)
    "roomId": "650000000000000000000001", // Optional Mongo ObjectId
    "goal": "Finish assignment",        // Optional, max 200 chars
    "plannedMinutes": 25                // 5-240 min (required)
  }
  ```
- **Response `201`**: `{ success: true, data: { session } }`.
- **Errors**: `409` (Active session already in progress for this user).

#### `GET /api/sessions/active`
- **Auth**: Required (`protect`)
- **Response `200`**: `{ success: true, data: { session: session | null } }`.

#### `PATCH /api/sessions/:id/end`
- **Auth**: Required (`protect`)
- **Params**: `id` (Mongo ObjectId)
- **Body (`strict`, optional)**: `{ "notes": "Completed exercises" }` (max 500 chars).
- **Response `200`**: `{ success: true, data: { session } }`. Calculates actual duration and sets status to `completed` or `abandoned`.
- **Errors**: `400` (Session already ended), `403` (Forbidden).

#### `GET /api/sessions`
- **Auth**: Required (`protect`)
- **Query Params**: `page`, `limit`, `status` (`active`, `completed`, `abandoned`), `subject`, `from` (ISO date), `to` (ISO date).
- **Response `200`**: Paginated list of user's sessions.

#### `POST /api/sessions/:id/events`
- **Auth**: Required (`protect`)
- **Params**: `id` (Mongo ObjectId)
- **Body (`strict`)**:
  ```json
  {
    "type": "tab_switch",          // tab_switch | idle | left_room | manual_break | planned_break
    "durationSec": 45,             // Optional number >= 0 (default 0)
    "planned": false,              // Optional boolean
    "startedAt": "2026-11-11T08:00:00.000Z" // Optional ISO string
  }
  ```
- **Response `201`**: `{ success: true, data: { event } }`.
- **Errors**: `400` (Session not active / invalid type), `403` (Forbidden).

#### `GET /api/sessions/:id/events`
- **Auth**: Required (`protect`)
- **Params**: `id` (Mongo ObjectId)
- **Response `200`**: `{ success: true, data: { events: [...] } }`.

---

### 3.6 Focus Events & Break Reasons (`/api/events`)

#### `POST /api/events/:id/reason`
- **Auth**: Required (`protect`)
- **Params**: `id` (Mongo ObjectId of FocusEvent)
- **Body (`strict`)**:
  ```json
  {
    "category": "phone",           // phone | notification | fatigue | difficult_topic | doubt | planned | other
    "note": "Call from partner"    // max 200 chars (optional)
  }
  ```
- **Response `201`**: `{ success: true, data: { breakReason } }`.
- **Errors**: `400` (Event is not an interruption), `403` (Forbidden), `409` (Reason already recorded for this event).

---

### 3.7 Analytics & Coach Engine (`/api/analytics`)

#### `GET /api/analytics/summary`
- **Auth**: Required (`protect`)
- **Query Params**: `range` (`7d` | `30d`, default `7d`).
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "range": "7d",
      "current": {
        "activeMinutes": 450,
        "interruptionRate": 1.3,
        "avgUninterruptedMin": 22.4,
        "recoveryTimeSec": 180,
        "sessionCompletion": 0.85,
        "uninterruptedRatio": 0.89,
        "contextSwitchRate": 1.3,
        "fqs": 84.6
      },
      "previous": { ... },
      "delta": {
        "activeMinutes": 50,
        "interruptionRate": -0.4,
        "fqs": 6.2
      }
    }
  }
  ```

#### `GET /api/analytics/reasons`
- **Auth**: Required (`protect`)
- **Query Params**: `range` (`7d` | `30d`, default `7d`).
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "totalBreaks": 24,
      "categories": [
        { "category": "social_media", "count": 12, "percentage": 50.0 },
        { "category": "snack", "count": 6, "percentage": 25.0 }
      ]
    }
  }
  ```

#### `GET /api/analytics/heatmap`
- **Auth**: Required (`protect`)
- **Query Params**: `range` (`7d` | `30d`, default `7d`).
- **Response `200`**:
  - Maps focus minutes and interruptions onto a 7 (Sunday-Saturday) x 24 (0-23h) matrix using user's timezone.
  ```json
  {
    "success": true,
    "data": {
      "timezone": "America/New_York",
      "matrix": [
        { "day": 1, "hour": 14, "minutes": 50, "interruptions": 1 },
        ...
      ]
    }
  }
  ```

#### `GET /api/analytics/subjects`
- **Auth**: Required (`protect`)
- **Query Params**: `range` (`7d` | `30d`, default `7d`).
- **Response `200`**: Subject breakdown with duration, interruption rate, completion rate, and per-subject FQS.

#### `GET /api/analytics/coach`
- **Auth**: Required (`protect`)
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "suggestions": [
        {
          "ruleId": "dominant_break_reason",
          "severity": 1,
          "insight": "Social Media accounts for 50.0% of all logged interruptions.",
          "evidence": "12 out of 24 logged breaks were categorized as social_media over the last 14 days.",
          "suggestedAction": "Enable 'Do Not Disturb' or place your phone out of arm's reach during 25-minute Pomodoro sessions."
        }
      ]
    }
  }
  ```

#### `POST /api/analytics/snapshots/run`
- **Auth**: Admin only (`protect` + `authorize('admin')`)
- **Query Params**: `date` (`YYYY-MM-DD`, optional; defaults to yesterday).
- **Response `200`**: `{ success: true, message: "Snapshots computed successfully for 4 users" }`.

---

### 3.8 Interventions (`/api/interventions`)

#### `POST /api/interventions`
- **Auth**: Required (`protect`)
- **Body (`strict`)**:
  ```json
  {
    "ruleId": "dominant_break_reason",
    "suggestedAction": "Keep your phone in another room during focus sessions."
  }
  ```
- **Response `201`**: Stores intervention and calculates a 7-day prior baseline.

#### `GET /api/interventions/report`
- **Auth**: Required (`protect`)
- **Response `200`**: Evaluates interventions with at least 3 subsequent sessions, returning before-and-after metrics (`interruptionRate`, `avgUninterruptedMin`, `completionRate`, `improved` flag).

---

## 4. Socket.IO Real-Time Engine

### Connection & Handshake
- **Endpoint**: `/socket.io/`
- **Cookie Authentication**:
  - The browser handshake automatically delivers the `token` cookie when `withCredentials: true` is set.
  - Sockets without valid JWT in cookie or auth object are rejected during handshake with `Authentication error`.
- **Per-Socket Rate Limiting**:
  - 20 socket events per 10-second rolling window. Excess events emit `{ event: 'error', data: { message: 'Rate limit exceeded' } }`.

### Events Specification

| Event Name | Direction | Payload | Ack Signature | Description |
| :--- | :--- | :--- | :--- | :--- |
| `room:join` | Client -> Server | `{ roomId: string }` | None | Joins Socket room; registers presence; syncs timer and active participant list. |
| `room:leave` | Client -> Server | `{ roomId: string }` | None | Leaves Socket room; removes presence; logs `left_room` event if session active. |
| `room:presence` | Server -> Client | `{ roomId: string, participants: [{ userId, username, avatar }] }` | None | Broadcast to all room sockets whenever a participant connects or disconnects. Multi-tab connections from the same user are de-duplicated. |
| `timer:start` | Client -> Server | `{ roomId: string }` | None | Host only. Starts or resumes the authoritative Pomodoro countdown interval on the server. |
| `timer:pause` | Client -> Server | `{ roomId: string }` | None | Host only. Pauses the server countdown interval. |
| `timer:reset` | Client -> Server | `{ roomId: string }` | None | Host only. Resets timer back to room's configured `focusMin`. |
| `timer:sync` | Server -> Client | `{ roomId: string, remainingSec: number, phase: 'focus'\|'break', isRunning: boolean }` | None | Broadcasts authoritative timer state every second and on state transitions. |
| `timer:phase` | Server -> Client | `{ roomId: string, phase: 'focus'\|'break', remainingSec: number }` | None | Emitted when countdown reaches 0 and server automatically toggles focus <-> break. |
| `focus:event` | Client -> Server | `{ roomId: string, eventType: string, note?: string }` | `ack({ success: boolean, eventId?: string, error?: string })` | Logs a focus event (interruption / break) into the user's active session. Returns ack callback with `eventId` for immediate one-tap reason logging. |
| `disconnect` | Auto | None | None | Automatically clears presence and notifies room participants. |
