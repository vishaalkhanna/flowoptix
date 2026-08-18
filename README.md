# FlowOptix

AI-powered productivity platform that logs tasks, detects workflow patterns, and surfaces insights through a Claude-backed assistant. Built with React Native (Expo), Express.js, and Supabase.

## Architecture

### Two-client Supabase design

FlowOptix deliberately uses two Supabase clients — one in the app, one in the backend — because they have different access requirements:

| Client | Key | Location | RLS |
|---|---|---|---|
| **App** (anon key) | `SUPABASE_ANON_KEY` | `frontend/lib/supabase.ts` | Applies — user sees only their own rows |
| **Backend** (service-role key) | `SUPABASE_SERVICE_ROLE_KEY` | `supabaseAdminClient.js` | Bypassed — backend has no user session |

RLS is enabled on all eight tables with `auth.uid()`-scoped policies. The backend must use the service-role key; without it every insert is rejected.

### Data flow

Task writes go through the backend so the Resend notification email can be triggered:

```
App  →  POST /tasks/log  →  Express (supabaseAdmin)  →  Supabase
                          └→  Resend notification email
```

Reads (task list, patterns, execution history) go directly from the app to Supabase:

```
App  →  Supabase (anon key + user session, RLS scopes to user)
```

### Tables

| Table | Key columns |
|---|---|
| `task_logs` | `id, user_id, task_name, category, started_at, ended_at, duration_seconds, source` |
| `task_patterns` | `id, user_id, pattern_name, task_sequence, frequency, confidence_score, detected_at` |
| `execution_logs` | `id, user_id, action_type, action_details, status, executed_at, action_name` |
| `automation_rules` | `id, user_id, rule_name, trigger_pattern, action_type, action_config, is_active, created_at` |
| `automation_suggestions` | linked to patterns |
| `productivity_scores` | `id, user_id, score, score_date, breakdown` |
| `user_integrations` | `id, user_id, integration_type, access_token, refresh_token, is_connected, connected_at` |

### Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (Expo SDK 54) — iOS, Android, and web |
| Backend | Express.js on Render |
| Database | Supabase (PostgreSQL), RLS enabled |
| Email | Resend API, called from `executionEngine.js sendViaResend()` |
| ML | Naive Bayes classifier — weights in `model_weights.json` |
| Auth | Supabase Google OAuth |

## Setup

### Prerequisites

- Node.js ≥ 18
- Supabase project (URL is hardcoded in `frontend/lib/supabase.ts`; use the existing project or swap the constant)
- Resend account and API key

### 1. Clone and install

```bash
git clone https://github.com/vishaalkhanna/flowoptix.git
cd flowoptix
npm install
cd frontend && npm install
```

### 2. Backend environment

Create `.env` in the project root:

```env
SUPABASE_URL=https://cdhichktpjedtjbbqhsf.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # required — missing key falls back to anon, all writes rejected by RLS
OPENROUTER_API_KEY=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=FlowOptix <you@yourdomain.com>
NOTIFY_EMAIL=your-inbox@example.com
```

The startup log prints `[Config] SUPABASE_SERVICE_ROLE_KEY set` when the key is present, or a loud warning when it is missing.

### 3. Frontend environment

Create `frontend/.env`:

```env
EXPO_PUBLIC_API_URL=https://flowoptix.onrender.com
EXPO_PUBLIC_SITE_URL=https://flowoptix-ten.vercel.app
```

Without this file `npx expo start` falls back to `localhost:3000` and every backend call fails. (`eas.json` already supplies these for EAS builds; the `.env` file is only needed for local development.)

### 4. Train the ML model

```bash
npm run train:model
```

Runs `train_model.js` and writes `model_weights.json`. Re-run after adding training examples.

### 5. Start the backend

```bash
npm start
```

API listens on port 3000. Check the startup log for config warnings before testing.

### 6. Start the frontend

```bash
cd frontend && npx expo start
```

Press `w` for web, `a` for Android emulator, or scan the QR code with Expo Go.

## API Endpoints

### Tasks

| Method | Path | Description |
|---|---|---|
| `POST` | `/tasks/log` | Save a task, set `started_at`/`ended_at`/`duration_seconds`, trigger Resend email |
| `GET` | `/tasks/:user_id` | Fetch all tasks, newest first |
| `POST` | `/tasks/auto-log` | Bulk insert from browser extension or screen-time source |
| `DELETE` | `/tasks/:id` | Delete a task |

**POST /tasks/log body:**
```json
{ "user_id": "<uuid>", "task_name": "Write quarterly report", "category": "reporting", "duration": 1800 }
```

### ML Prediction

| Method | Path | Description |
|---|---|---|
| `POST` | `/predict/category` | Predict task category from name using the Naive Bayes model |

**Body / response:**
```json
{ "task_name": "Send weekly digest" }
{ "task_name": "Send weekly digest", "category": "communication", "confidence": 0.78 }
```

### Patterns & Productivity

| Method | Path | Description |
|---|---|---|
| `GET` | `/patterns/:user_id` | Detect recurring patterns with AI analysis |
| `GET` | `/productivity/:user_id` | Productivity score (0–100) with AI insight |

### AI Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/chat` | Claude assistant with full context of the user's tasks, patterns, and integrations |

**Body:** `{ "user_id": "<uuid>", "message": "What are my most repetitive tasks?" }`

### Integrations

| Method | Path | Description |
|---|---|---|
| `GET` | `/gmail/authorize?user_id=` | Start Gmail OAuth flow |
| `GET` | `/calendar/authorize?user_id=` | Start Google Calendar OAuth flow |
| `GET` | `/gmail/analyze/:user_id` | Scan inbox, auto-log task patterns |
| `GET` | `/calendar/analyze/:user_id` | Scan calendar, auto-log meeting patterns |

### Execution & Automation

| Method | Path | Description |
|---|---|---|
| `POST` | `/execute/email` | Send email via Resend |
| `POST` | `/execute/automation` | Run an automation rule |
| `GET` | `/execute/history/:user_id` | Fetch execution log |
| `POST` | `/automation/rules` | Create an automation rule |

## Testing

### Task logging + email notification

```bash
TEST_USER_ID=<supabase-user-uuid> node test_email.js
```

Find your UUID in Supabase → Authentication → Users.

### ML category prediction

```bash
node test_prediction.js
```

Hits the live Render endpoint with five sample tasks and prints pass/fail.

### Retraining the ML model

```bash
npm run train:model          # JS trainer — no Python required
npm run train:model:sklearn  # scikit-learn trainer — fetches live Supabase data
```

## Known Limitations

- **No API authentication.** The backend uses the service-role key, so any caller who knows a user's UUID can read or delete their data via `GET /tasks/:user_id` or `DELETE /users/:user_id/data`. Fix direction: verify the Supabase JWT on each request and reject requests whose token subject does not match the requested `user_id`.

- **Resend sandbox restriction.** `onboarding@resend.dev` only delivers to the email address the Resend account was registered with. Sending to any other recipient requires verifying a custom domain in Resend and setting `RESEND_FROM_EMAIL` to an address on that domain.

- **Render free-tier cold starts.** The service spins down after inactivity, causing an approximately 50-second cold start on the next request. Mitigated by a cron-job.org job that pings `GET /` every 15 minutes.

- **Duplicated automation routing.** `patterns.tsx` re-implements the backend's automation routing locally instead of calling `POST /execute/automation`, so the frontend and backend copies of that logic can drift apart independently.
