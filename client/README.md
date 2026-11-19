# StudyRoom Frontend Client

The frontend client for StudyRoom is a responsive, accessible React single-page application built with Vite, Tailwind CSS, TanStack Query, and Socket.IO.

---

## 1. Tech Stack

- **Framework**: React 18 with Vite 5
- **Styling**: Tailwind CSS 3 (with custom light/dark theme toggle and accessible focus rings)
- **Routing**: React Router 6
- **Server State**: TanStack React Query v5
- **Forms & Validation**: `react-hook-form` with `zod` resolver (mirrors server validation rules)
- **Real-Time WebSockets**: `socket.io-client` (with cookie credentials)
- **Charts & Data Visualizations**: Recharts
- **Icons**: Lucide React
- **Toast Notifications**: `react-hot-toast`
- **Unit & Component Testing**: Vitest 2, React Testing Library, JSDOM

---

## 2. Environment Configuration

Create a local `.env` file inside `client/`:
```env
API_URL=http://localhost:5000/api
SOCKET_URL=http://localhost:5000
```
*(See `client/.env.example` for reference. Never commit `.env` to Git).*

---

## 3. Scripts

From the repository root or inside `client/`:

```bash
# Run client dev server on port 5173
cd client && npm run dev

# Run Vitest test suite
npm run test

# Build production bundle
npm run build
```

---

## 4. Directory Structure

```text
client/src/
├── api/             # Axios instance and modular API services (auth, user, room, session, analytics, intervention)
├── assets/avatars/  # Original SVG avatars (owl, fox, panda, cat, bear)
├── components/
│   ├── analytics/   # CoachCardList, InterventionsReport
│   ├── auth/        # ProtectedRoute, PublicRoute
│   ├── charts/      # FqsGauge, BreakReasonsChart, FocusHeatmap, SubjectBarChart
│   ├── modals/      # CreateRoomModal, JoinCodeModal, BreakReasonModal
│   ├── room/        # PomodoroDisplay, PresenceList, SessionController
│   └── ui/          # Navbar, Avatar, LoadingSpinner, ErrorBoundary
├── constants/       # serverEnums.js (mirrors server constants)
├── context/         # AuthContext, ThemeContext
├── hooks/           # useServerTimer, useRoomPresence, useFocusTracking
├── pages/           # LoginPage, RegisterPage, RoomsPage, RoomPage, DashboardPage, SessionsHistoryPage, SessionSummaryPage, ProfilePage, PublicProfilePage, NotFoundPage
├── socket/          # SocketContext (manages live socket connection when authenticated)
├── test/            # Vitest unit & component test suite
├── utils/           # errors.js (error extractor), formatTime.js (timer sync & clock offset calculations)
├── App.jsx          # Providers wrapper and toast configuration
├── main.jsx         # Vite entry point
└── routes.jsx       # Route declarations
```

---

## 5. How the Frontend Communicates with the Backend

1. **HTTP / REST API**:
   - Central Axios instance (`client/src/api/axios.js`) configured with `withCredentials: true`.
   - The JWT token is managed entirely via an `httpOnly` secure cookie set by the backend. JavaScript never touches or stores the token.
   - An Axios response interceptor intercepts 401 Unauthorized responses (except during bootstrap or login) and redirects the user to `/login`.
2. **Socket.IO Real-Time Engine**:
   - The client creates a single Socket.IO connection (`client/src/socket/SocketContext.jsx`) only after the user is authenticated, passing `{ withCredentials: true }`.
   - The socket automatically disconnects upon logout.
   - The room timer is server-authoritative (`timer:sync`, `timer:phase`). To prevent clock drift and UI lag, `useServerTimer` uses `serverTime` to calculate network transit delay and runs a smooth local 1-second interval between server broadcasts.
3. **Automatic Focus Tracking**:
   - `useFocusTracking` listens to `document.visibilitychange` and 60-second user inactivity while in focus phase.
   - On returning from an interruption, it emits `focus:event` with an ack callback, and uses the resulting `eventId` to prompt the `BreakReasonModal`.
