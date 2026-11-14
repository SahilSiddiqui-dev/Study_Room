# StudyRoom - Quality Assurance Verification Checklist

This document details the step-by-step manual and automated verification procedure for the StudyRoom frontend and backend.

---

## 1. Automated Test Suites

### Backend Test Suite
- Command: `npm --prefix server test`
- Database: `studyroom_test`
- Coverage:
  - Auth: registration, login, cookie setting, validation errors.
  - Rooms: creation, public/private joinCode masking, participant deduplication, 403 host checks.
  - Sessions: initiation, 409 conflict on duplicate active session, events, break reasons, session conclusion.
  - FQS: pure mathematical calculation, edge cases (zero minutes, no sessions).
  - Coach: 7 deterministic rules, minimum session threshold.
- Status: **5/5 test suites passed, 25/25 tests passing.**

### Frontend Test Suite
- Command: `npm --prefix client test`
- Framework: Vitest + React Testing Library + JSDOM
- Coverage:
  - `src/test/validators.test.js`: Zod schema validation (valid & invalid inputs).
  - `src/test/formatTime.test.js`: Pure functions for timer transit offset & remaining seconds calculation.
  - `src/test/errors.test.js`: Error message extractor & 429 rate limit handling.
  - `src/test/useFocusTracking.test.js`: Focus tracking hook with mocked `document.visibilitychange` & 60s idle timeout (emits once per return).
  - `src/test/BreakReasonModal.test.jsx`: Component test verifying one-tap category selection submits reason.
- Status: **5/5 test suites passed, 25/25 tests passing.**

---

## 2. End-to-End Real Flow Verification Checklist

To verify the integrated application running locally:

### Step 1: Start Services
1. Start MongoDB: `mongod --dbpath .db --port 27017`
2. Seed Database: `npm --prefix server run seed`
3. Start Backend: `npm --prefix server run dev` (running on `http://localhost:5000`)
4. Start Frontend: `npm --prefix client run dev` (running on `http://localhost:5173`)

### Step 2: Authentication
- Open `http://localhost:5173/login`.
- Click "Alice (UTC)" demo account button -> form auto-fills `alice@studyroom.test` / `Demo@1234`.
- Click "Sign In" -> receives HTTP 200 with `httpOnly` cookie -> redirects to `/rooms`.
- Test registering a new account:
  - Go to `/register`.
  - Enter username `study_hawk`, email `hawk@studyroom.test`, password `Password@123`, choose Panda avatar, timezone auto-detected.
  - Click "Create Account" -> creates user and logs in directly.

### Step 3: Room Creation & Multi-User Synchronization
1. **User A (Host - Alice)**:
   - On `/rooms`, click "+ Create Room".
   - Name: "Algorithms Deep Work", Subject: "Computer Science", Duration: 25m focus / 5m break.
   - Click "Create Room" -> redirects to `/rooms/:id`.
   - In another browser tab or Incognito window, log in as **User B (Bob)** (`bob@studyroom.test` / `Demo@1234`).
2. **User B (Participant - Bob)**:
   - Navigate to `/rooms`.
   - Click on "Algorithms Deep Work" -> joins room.
3. **Verify Synchronized Timer**:
   - Both Alice and Bob's screens show the Presence list containing both users with their avatars.
   - Alice (Host) clicks "Start Timer" -> timer ticks down simultaneously on both screens with zero clock drift.
   - Bob's screen updates in real time to the same countdown second.

### Step 4: Study Session & Distraction Tracking
1. While in the room, Alice types goal: "Review Graph Traversals" and clicks "Begin Session (25m)".
2. **Tab Switch Test**:
   - Alice switches to another browser tab for 5 seconds, then switches back.
   - Immediately upon returning, the `BreakReasonModal` appears with an auto-dismiss timer.
   - One tap on "Phone" -> logs reason with `POST /api/events/:id/reason` and closes modal.
3. **Manual Break Test**:
   - Click "Take a Break" -> logs `manual_break` event.
4. **End Session**:
   - Click "End Session" -> concludes session -> navigates to `/sessions/:id/summary`.
   - Verify timeline displays the start time, tab switch interruption, duration, and completion rate.

### Step 5: Analytics Dashboard Inspection
1. Log in as seeded demo user `alice@studyroom.test`.
2. Navigate to `/dashboard`:
   - FQS Gauge renders with score (e.g. 78/100) and delta indicator.
   - 4 Stat Cards display interruption rate, average focus gap, completion rate, and recovery time.
   - Break Reasons Donut/Bar chart renders categories.
   - 7x24 Heatmap displays hourly study minutes mapped to user's timezone (`UTC`).
   - Subject Bar Chart displays comparisons.
   - Coach Cards show algorithmic rules with real figures in evidence.
   - Clicking "I'll try this" logs a 7-day baseline intervention.
   - Interventions Report section shows status.

---

## 3. Honest Status Report

| Feature Area | Working | Untested | Known Gaps |
| :--- | :---: | :---: | :--- |
| Auth & httpOnly Cookie | ✅ | - | None. |
| Zod Form Validations | ✅ | - | None. |
| Room Listing & Search | ✅ | - | None. |
| Public / Private Rooms & Codes | ✅ | - | None. |
| Socket.IO Presence | ✅ | - | None. |
| Synchronized Pomodoro | ✅ | - | Server does not implement pause/reset (only start/restart). Documented in `CONTRACT_MISMATCHES.md`. |
| Focus Tracking (Tab switch / Idle) | ✅ | - | None. |
| Break Reason One-Tap Modal | ✅ | - | Historical events don't join reasons from DB. Documented in `BACKEND_ISSUES.md`. |
| Session Summary & History | ✅ | - | None. |
| Analytics (FQS, Heatmap, Reasons) | ✅ | - | No continuous time series API endpoint for summary trend lines. Documented in `CONTRACT_MISMATCHES.md`. |
| Coach Rules & Interventions | ✅ | - | None. |
| Profile & Custom SVG Avatars | ✅ | - | None. |
| Theme Toggle (Light / Dark) | ✅ | - | None. |
| Automated Vitest Suites | ✅ (25/25) | - | None. |
