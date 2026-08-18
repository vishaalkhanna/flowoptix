# FlowOptix

## Overview

FlowOptix is a productivity intelligence platform that automatically logs and categorizes your work tasks, detects recurring patterns in how you spend your time, and surfaces actionable insights through an AI-powered assistant. It combines a React Native mobile/web frontend with an Express.js backend that handles task storage, ML-based categorization, pattern analysis, and email notifications.

## Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React Native (Expo) — iOS, Android, and web from one codebase |
| **Backend** | Express.js, hosted on Render |
| **Database** | Supabase (PostgreSQL) with row-level security |
| **ML** | Naive Bayes classifier (`model_weights.json`) — predicts task category from task name |
| **Email** | Resend API — sends a notification email each time a task is logged |
| **Auth** | Supabase OAuth (Google Sign-In) |

## Setup

### Prerequisites

- Node.js ≥ 18
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) account

### Steps

1. **Clone and install**

   ```bash
   git clone https://github.com/vishaalkhanna/flowoptix.git
   cd flowoptix
   npm install
   ```

2. **Create a Supabase project** and copy the project URL and anon key from  
   Settings → API.

3. **Create a Resend account**, verify a sending domain or use the sandbox, and  
   copy the API key from the Resend dashboard.

4. **Create a `.env` file** in the project root:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   RESEND_API_KEY=re_your_key
   RESEND_FROM_EMAIL=FlowOptix <you@yourdomain.com>
   NOTIFY_EMAIL=your-inbox@example.com
   OPENROUTER_API_KEY=your-openrouter-key
   ```

5. **Generate the ML model weights**

   ```bash
   npm run train:model
   ```

   This runs `train_model.js` and writes `model_weights.json`. Re-run whenever you add training data.

6. **Start the server**

   ```bash
   npm start
   ```

   The API listens on port 3000 by default.

## API Endpoints

### Tasks

| Method | Path | Description |
|---|---|---|
| `POST` | `/tasks/log` | Save a task to Supabase and fire an email notification via Resend |
| `GET` | `/tasks/:user_id` | Fetch all tasks for a user, newest first |
| `POST` | `/tasks/auto-log` | Bulk-insert tasks from browser extension or screen-time source |
| `DELETE` | `/tasks/:id` | Delete a single task by ID |

**POST /tasks/log — request body**

```json
{ "user_id": "<uuid>", "task_name": "Write quarterly report", "category": "reporting" }
```

### ML Prediction

| Method | Path | Description |
|---|---|---|
| `POST` | `/predict/category` | Predict the category of a task name using the Naive Bayes model |

**Request / response**

```json
// POST /predict/category
{ "task_name": "Send email to client" }

// Response
{ "task_name": "Send email to client", "category": "communication", "confidence": 0.62 }
```

### Patterns & Productivity

| Method | Path | Description |
|---|---|---|
| `GET` | `/patterns/:user_id` | Detect recurring task patterns with AI analysis |
| `GET` | `/productivity/:user_id` | Return a productivity score (0–100) with AI insight |

### AI Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/chat` | Send a message to the AI assistant; it has full context of the user's tasks, patterns, and integrations |

**Request body:** `{ "user_id": "<uuid>", "message": "What are my most repetitive tasks?" }`

### Integrations

| Method | Path | Description |
|---|---|---|
| `GET` | `/gmail/authorize?user_id=` | Start Gmail OAuth flow |
| `GET` | `/calendar/authorize?user_id=` | Start Google Calendar OAuth flow |
| `GET` | `/gmail/analyze/:user_id` | Scan inbox for patterns and auto-log tasks |
| `GET` | `/calendar/analyze/:user_id` | Scan calendar for patterns and auto-log tasks |

## Testing

### Task logging + email notification

Requires a valid Supabase user UUID and the server running with `RESEND_API_KEY` and `NOTIFY_EMAIL` set.

```bash
TEST_USER_ID=<your-supabase-user-uuid> node test_email.js
```

Find your UUID in Supabase → Authentication → Users.

### ML category prediction (live endpoint)

```bash
node test_prediction.js
```

Hits `https://flowoptix.onrender.com/predict/category` with five sample tasks and prints pass/fail.

### Retraining the ML model

```bash
npm run train:model          # JS trainer — no Python required
npm run train:model:sklearn  # scikit-learn trainer — fetches real Supabase data
```

## Known Limitations

- **Resend sandbox sender** (`onboarding@resend.dev`) can only deliver to the address that owns the Resend account. Add and verify a custom domain in Resend to send to any recipient.
- **Render free tier cold-start** — the server sleeps after 15 minutes of inactivity and takes ~50 s to wake. Use an uptime monitor (e.g. UptimeRobot, Better Uptime) to ping the health endpoint every 10 minutes.
- **Anon-key writes** — the backend uses the Supabase anon key for task inserts, which means RLS policies must permit anon writes to `task_logs` for the API to work. Tighten this by passing the user's JWT from the frontend instead.
