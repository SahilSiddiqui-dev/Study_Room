# StudyRoom Backend - Viva & Oral Examination Notes

This guide provides concise, technically rigorous answers to key architecture, security, and algorithmic questions frequently asked by technical evaluators.

---

### Question 1: Why use `httpOnly` cookies instead of `localStorage` for JWT storage?

**Answer:**
- **Cross-Site Scripting (XSS) Immunity**: Tokens stored in `localStorage` or `sessionStorage` are fully accessible to any JavaScript running in the browser context. If any third-party script, CDN dependency, or injected snippet executes, the token can be exfiltrated immediately. In contrast, cookies flagged with `httpOnly: true` cannot be read or manipulated by client-side JavaScript (`document.cookie`), neutralizing token theft via XSS.
- **Automatic Browser Transport**: The browser automatically appends cookies to requests across HTTP and WebSocket handshakes (`withCredentials: true`), simplifying client implementation and ensuring authenticated socket connections without query parameter leakage.
- **Defense in Depth**:
  - `SameSite=Lax` prevents CSRF attacks for state-changing cross-origin requests.
  - `Secure=true` in production ensures cookies are only transmitted over TLS/HTTPS.
  - Setting explicit `path: '/'` and token expiration keeps cookies scoped and ephemeral.

---

### Question 2: How does the rate limiter protect the authentication endpoints?

**Answer:**
- **Brute-Force & Credential Stuffing Prevention**: Authentication endpoints (`/api/auth/login`, `/api/auth/register`, `/api/users/me/password`) are prime targets for automated credential stuffing and dictionary attacks.
- **Layered Limiting**:
  - `globalLimiter`: 100 requests per 15 minutes per IP across all `/api` routes to prevent DDoS and high-volume scraping.
  - `authLimiter`: 10 requests per 15 minutes per IP on `/api/auth/login` and `/api/auth/register`.
  - `passwordLimiter`: 5 requests per 15 minutes per IP on `/api/users/me/password`.
  - `writeLimiter`: 60 requests per 1 minute on heavy mutation endpoints.
- **Timing Attack Mitigation**: In addition to rate limiting, our auth service uses a dummy bcrypt comparison (`compareDummyPassword`) when an email is not found, ensuring responses take identical CPU time (~80-120ms with 12 rounds) regardless of whether an email exists, preventing timing enumeration attacks.

---

### Question 3: Why validate with Zod at the controller/route boundary instead of relying on Mongoose validation alone?

**Answer:**
- **Fail Fast & Early Boundary Defense**: Zod validates inputs at the HTTP controller boundary before requests reach business logic or database layers. Malformed requests are rejected immediately with HTTP 400 without consuming database connections or executing ORM overhead.
- **Parameter and Query Validation**: Mongoose only validates documents being persisted to MongoDB collections. It cannot validate URL route parameters (`:id` as valid ObjectId) or URL query parameters (`page`, `limit`, `range`, `from`, `to`). Zod handles body, query, and params uniformly.
- **Strict Whitelisting (`.strict()`)**: Zod's `.strict()` rejects unexpected extra fields, defeating Mass Assignment vulnerabilities (e.g. an attacker injecting `"role": "admin"` or `"hostId"` into a room or profile update).
- **Type Coercion & Normalization**: Zod parses and transforms types safely (e.g., converting query strings `page="2"` to integer `2`, trimming strings, lowercasing emails) and returns typed data back into `req.body`, `req.query`, and `req.params`.

---

### Question 4: How does the central `errorHandler` map different error types to appropriate HTTP status codes?

**Answer:**
- Express forwards any error passed to `next(err)` to the 4-argument error middleware (`(err, req, res, next)`).
- The middleware classifies errors via instance checks and error properties:
  1. **`AppError`**: Our custom domain exception carrying explicit `err.statusCode` (400, 401, 403, 404, 409).
  2. **`ZodError`**: Returns HTTP 400 with a structured `errors` array mapping each failed issue (`path` -> `field`, `message`).
  3. **Mongoose `ValidationError`**: Returns HTTP 400 with key-value pairs of model validation failures.
  4. **Mongoose `CastError`**: Returns HTTP 400 when an invalid type or malformed ObjectId is queried (`Invalid value for field ...`).
  5. **Mongo Duplicate Key (`code === 11000`)**: Returns HTTP 409 Conflict, parsing `keyPattern` or `keyValue` to inform the client which unique field already exists (e.g., `username`, `email`, or `eventId`).
  6. **JWT Errors (`JsonWebTokenError`, `TokenExpiredError`)**: Returns HTTP 401 Unauthenticated.
  7. **Payload Too Large (`entity.too.large`)**: Returns HTTP 413.
  8. **Unhandled / Internal Exceptions**: Returns HTTP 500 (`Internal server error`), logging the internal stack trace server-side while hiding internal implementation details from clients in production.

---

### Question 5: How does the timer stay synchronized across clients without drift?

**Answer:**
- **Authoritative Server Clock**: Timer state is never computed on client machines. Clients only render display state; the backend is the single source of truth.
- **Server Interval Engine**:
  - The server holds an in-memory timer state per room (`roomsTimers.get(roomId)`), containing `remainingSec`, `phase` ('focus' | 'break'), `isRunning`, and `intervalId`.
  - When the host starts the timer (`timer:start`), `setInterval` runs on the server every 1000ms, decrementing `remainingSec`.
- **Periodic Broadcasting & Sync**:
  - The server broadcasts `timer:sync` `{ remainingSec, phase, isRunning }` to the Socket.IO room every second.
  - When a new participant connects or joins the room (`room:join`), the server immediately delivers the current `remainingSec` and `phase`, aligning the client immediately.
- **State Machine Transitions**:
  - When `remainingSec <= 0`, the server toggles phases (`focus` -> `break` or `break` -> `focus`), resets `remainingSec` to the room's configured Pomodoro settings (`breakMin` or `focusMin`), and emits `timer:phase`.
  - No client drift can accumulate because clients receive the exact integer second remaining from the server.

---

### Question 6: Explain the Focus Quality Score (FQS) formula and justify the assigned weights.

**Answer:**
- **The Formula**:
  $$\text{FQS} = 40 \times \text{uninterruptedRatio} + 25 \times \left(1 - \min\left(\frac{\text{interruptionRate}}{10}, 1\right)\right) + 20 \times \text{sessionCompletion} + 15 \times \left(1 - \min\left(\frac{\text{contextSwitchRate}}{10}, 1\right)\right)$$
- **Score Range**: Scaled exactly from $0.0$ to $100.0$, rounded to 1 decimal place.

- **Component Justifications & Weights**:
  1. **Uninterrupted Ratio ($40\%$, Weight 40)**:
     - *Formula*: $\frac{\text{sum of uninterrupted focus blocks}}{\text{total session duration}}$.
     - *Justification*: Deep work research (e.g., Cal Newport) demonstrates that sustained cognitive focus without micro-interruptions is the single greatest predictor of learning retention and intellectual productivity. Hence it commands the highest weight.
  2. **Interruption Rate ($25\%$, Weight 25)**:
     - *Formula*: $1 - \min\left(\frac{\text{interruptions per hour}}{10}, 1\right)$.
     - *Justification*: Frequent disruptions fragment attention. Normalizing against a ceiling of 10 interruptions per hour allows proportional score reduction; zero interruptions yields the full 25 points.
  3. **Session Completion Rate ($20\%$, Weight 20)**:
     - *Formula*: $\frac{\text{completed sessions}}{\text{total sessions}}$.
     - *Justification*: Measures intentionality and commitment. Consistently abandoning scheduled sessions early signals poor pacing or fatigue, reducing overall quality.
  4. **Context Switch Rate ($15\%$, Weight 15)**:
     - *Formula*: $1 - \min\left(\frac{\text{context switches per hour}}{10}, 1\right)$.
     - *Justification*: Switching between study subjects or jumping across study rooms imposes cognitive switching penalties (attention residue).

- **Robustness**:
  - Evaluated via a pure mathematical utility function `computeFqs(stats)`.
  - Gracefully handles zero-minute sessions or empty historical records by returning `0.0` without `NaN` or divide-by-zero errors.

