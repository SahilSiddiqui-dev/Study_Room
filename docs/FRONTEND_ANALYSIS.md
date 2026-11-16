# StudyRoom - Frontend Analysis & Architecture Specification

## 1. What the Product Does
StudyRoom is a live, collaborative study tracker and Pomodoro workstation. It enables students to:
1. Form or join shared study rooms with live participant presence.
2. Synchronize Pomodoro countdown clocks across all participants via server-authoritative ticks (zero client drift).
3. Track personal study sessions with goals and planned minutes.
4. Detect focus breaks automatically (tab switching, 60s idle timeout) and manually, recording one-tap break reasons (phone, fatigue, difficult topic, etc.).
5. Visualize mathematically grounded productivity analytics (Focus Quality Score, 7x24 weekday-hour heatmap, break reason distribution, subject breakdowns).
6. Receive evidence-based coaching recommendations evaluated against 7 deterministic rules, and track empirical before-vs-after intervention outcomes.

---

## 2. User Flows to Build

```
[ Visitor ] ────► /register or /login ────► [ AuthContext Bootstrapped ]
                                                        │
         ┌──────────────────┬───────────────────────────┴───────────────────────────┐
         ▼                  ▼                                                       ▼
   /rooms (Lobby)    /dashboard (Analytics)                                  /profile & /u/:username
         │                  │
         │ (Join/Create)    ├── FQS Gauge & Key Stats (7d/30d)
         ▼                  ├── Reason Donut / Bar Chart
   /rooms/:id (Room)        ├── 7x24 Weekday-Hour Heatmap
         │                  ├── Subject Breakdown
         ├── Live Presence  └── Coach Cards & Intervention Outcomes
         ├── Synced Timer
         ├── Session Start/End
         ├── Focus Tracking (Tab switch / Idle / Manual)
         └── Break Reason Modal (One-tap logging)
                 │
                 ▼ (End Session)
         /sessions/:id/summary ────► /sessions (History)
```

1. **Auth & Onboarding**: Register with username, email, password, avatar, timezone -> auto-login via httpOnly cookie -> redirect to Rooms Lobby.
2. **Room Discovery & Joining**: View open rooms, filter by subject, paginate. Create public/private room. Enter join code for private rooms.
3. **Active Study & Co-Working Room**:
   - Real-time room presence (multi-tab deduplicated).
   - Authoritative Pomodoro timer ticking synchronously.
   - Start session with subject, goal, and planned minutes.
   - Automatic background tracking of tab switches and idle periods.
   - Immediate popup of Break Reason modal upon returning from an interruption.
   - End session -> navigate to Session Summary.
4. **Session Summary & History**: Review actual vs planned time, completion status, and interruption timeline. Browse historical study sessions.
5. **Analytics & Coaching Dashboard**: Toggle 7d / 30d window; inspect FQS score with period delta; view peak focus heatmap; review coach recommendations and accept interventions ("I'll try this"); track intervention before/after metrics.
6. **Profile Management**: Update avatar, update timezone, change password, view public profile.

---

## 3. Endpoint-to-Screen Map

| Screen / Feature | Route / Component | HTTP Method & Endpoint | Payload / Query |
| :--- | :--- | :--- | :--- |
| **App Bootstrap** | `AuthContext` | `GET /api/auth/me` | None (reads httpOnly cookie) |
| **Avatars List** | `AuthContext` / Register / Profile | `GET /api/users/avatars` | None |
| **Register** | `/register` | `POST /api/auth/register` | `{ username, email, password, avatar?, timezone? }` |
| **Login** | `/login` | `POST /api/auth/login` | `{ email, password }` |
| **Logout** | Navbar | `POST /api/auth/logout` | None |
| **Rooms Lobby** | `/rooms` | `GET /api/rooms` | `?page=1&limit=12&subject=math` |
| **Create Room** | `/rooms` (Modal) | `POST /api/rooms` | `{ name, subject, isPrivate, pomodoro: { focusMin, breakMin } }` |
| **Room Details** | `/rooms/:id` | `GET /api/rooms/:id` | None |
| **Join Room** | `/rooms` / `/rooms/:id` | `POST /api/rooms/:id/join` | `{ joinCode? }` |
| **Leave Room** | `/rooms/:id` | `POST /api/rooms/:id/leave` | None |
| **Close Room** | `/rooms/:id` (Host only) | `DELETE /api/rooms/:id` | None |
| **Active Session Check**| `/rooms/:id` | `GET /api/sessions/active` | None |
| **Start Session** | `/rooms/:id` | `POST /api/sessions` | `{ roomId?, subject?, goal?, plannedMinutes }` |
| **End Session** | `/rooms/:id` | `PATCH /api/sessions/:id/end` | None |
| **Session Events** | `/sessions/:id/summary` | `GET /api/sessions/:id/events`| None |
| **Log Break Reason**| Break Reason Modal | `POST /api/events/:id/reason`| `{ category, note? }` |
| **Sessions History** | `/sessions` | `GET /api/sessions` | `?page=1&limit=10&from=&to=` |
| **Analytics Summary**| `/dashboard` | `GET /api/analytics/summary` | `?range=7d` or `30d` |
| **Break Reasons** | `/dashboard` | `GET /api/analytics/reasons` | `?range=7d` or `30d` |
| **Focus Heatmap** | `/dashboard` | `GET /api/analytics/heatmap` | `?range=7d` or `30d` |
| **Subject Breakdown**| `/dashboard` | `GET /api/analytics/subjects` | `?range=7d` or `30d` |
| **Coach Feedback** | `/dashboard` | `GET /api/analytics/coach` | `?range=7d` or `30d` |
| **Commit Intervention**| `/dashboard` | `POST /api/interventions` | `{ ruleId, suggestedAction }` |
| **Interventions Report**| `/dashboard` | `GET /api/interventions/report`| None |
| **My Profile** | `/profile` | `GET /api/users/me` | None |
| **Update Profile** | `/profile` | `PATCH /api/users/me` | `{ avatar?, timezone? }` |
| **Change Password** | `/profile` | `PATCH /api/users/me/password` | `{ currentPassword, newPassword }` |
| **Public Profile** | `/u/:username` | `GET /api/users/:username` | None |

---

## 4. Socket.IO Event Map

All Socket.IO events run over `http://localhost:5000` with `{ withCredentials: true }`.

| Event Name | Direction | Payload | Client Action / Trigger |
| :--- | :--- | :--- | :--- |
| `room:join` | Client -> Server | `{ roomId }` | Emitted when entering room page or reconnecting. |
| `room:leave` | Client -> Server | `{ roomId }` | Emitted when exiting room page. |
| `room:presence` | Server -> Client | `{ roomId, participants: [{ userId, username, avatar }] }` | Updates presence avatar roster. |
| `timer:start` | Client -> Server | `{ roomId, focusMin, breakMin }` | Emitted by host to initiate/restart Pomodoro countdown. |
| `timer:sync` | Server -> Client | `{ roomId, phase, remainingSec, serverTime }` | Calculates clock offset and synchronizes local countdown timer. |
| `timer:phase` | Server -> Client | `{ roomId, phase }` | Updates phase display ('focus' <-> 'break'); triggers audio/toast notification. |
| `focus:event` | Client -> Server | `{ type, durationSec, planned }` | Ack returns `{ success: true, eventId }`. Opens Break Reason modal. |

---

## 5. Server Enums Mirrored in Client

The client mirrors server constants in `client/src/constants/serverEnums.js`:
- `AVATAR_KEYS`: `['owl', 'fox', 'panda', 'cat', 'bear']` (dynamically validated via `/api/users/avatars`)
- `DEFAULT_AVATAR`: `'owl'`
- `EVENT_TYPES`: `['tab_switch', 'idle', 'left_room', 'manual_break', 'planned_break']`
- `REASON_CATEGORIES`: `['phone', 'notification', 'fatigue', 'difficult_topic', 'doubt', 'planned', 'other']`
- `TIMER_PHASES`: `['focus', 'break']`
- `ROOM_STATUS`: `['open', 'closed']`
- `USER_ROLES`: `['user', 'admin']`

---

## 6. Gaps Identified (UI Needs vs Backend Offerings)

1. **Break Reason Retrieval on Historical Events**:
   - `GET /api/sessions/:id/events` returns only `FocusEvent` records. It does not populate `BreakReason`.
   - *Client Workaround*: During active session, the client stores logged reasons in TanStack Query cache. In history view, focus event types and durations are displayed cleanly.
2. **Snapshot Time Series**:
   - `GET /api/analytics/summary` provides aggregated period numbers (`current`, `previous`, `delta`) rather than daily array entries.
   - *Client Workaround*: UI visualizes period statistics, FQS gauge, breakdown charts, and the 7x24 heatmap without faking synthetic line plots.
3. **Room Participant Avatars in Lobby**:
   - `GET /api/rooms` populates `hostId` with `{ username, avatar }`, but `participants` remains an array of user IDs.
   - *Client Workaround*: Renders participant count badge in lobby, and loads full participant avatars inside the room via `GET /api/rooms/:id` and `room:presence`.

---

## 7. Build Plan (Phased Roadmap)

- **Phase 0**: Analysis docs, Vite + React scaffolding, Tailwind CSS setup, Lucide icons, folder layout, `.env.example`.
- **Phase 1**: API client (Axios + interceptors), `AuthContext`, route guards, Login/Register forms, responsive Navbar, error helper, toast notifications.
- **Phase 2**: Rooms Lobby (list, search by subject, pagination, create room modal, join private room modal).
- **Phase 3**: Room Page core: Socket context, participant presence grid, synchronized Pomodoro timer with local interpolation, host timer controls.
- **Phase 4**: Study sessions (start/end), `useFocusTracking` (tab switch & 60s idle detection), Break Reason modal (one-tap icons + 20s auto-dismiss), Session Summary, and Sessions History page.
- **Phase 5**: Analytics dashboard (7d/30d toggle, FQS gauge, key metric cards, reason charts, 7x24 CSS grid heatmap, subject comparison, coach recommendations, and interventions before/after report).
- **Phase 6**: User Profile, custom SVG avatar set (`owl`, `fox`, `panda`, `cat`, `bear`), password change, and public `/u/:username` profile.
- **Phase 7**: UI Polish, dark/light theme toggle, loading skeletons, empty states, error boundaries, accessible modal focus traps.
- **Phase 8**: Automated tests (Vitest + React Testing Library): Zod validation schemas, timer clock offset calculations, `useFocusTracking` hook, error helper, and BreakReasonModal component.
- **Phase 9**: Full system verification (QA checklist, end-to-end multi-user walkthrough, documentation updates).
