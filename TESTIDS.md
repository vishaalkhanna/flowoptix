# FlowOptix testID Contract

Every interactive element in the app carries a `testID` prop (rendered as `data-testid` by react-native-web) and a matching `accessibilityLabel`. Selenium reads `data-testid`; Appium reads `accessibilityLabel`.

Convention: `<screen>-<element>-<type>` in kebab-case.

---

## Tab Bar (`app/(tabs)/_layout.tsx`)

| testID | Description | Type |
|--------|-------------|------|
| `tab-dashboard` | Dashboard tab | button |
| `tab-tasks` | Log Task tab | button |
| `tab-patterns` | Patterns tab | button |
| `tab-automate` | Automate tab | button |
| `tab-chat` | AI Chat tab | button |
| `tab-profile` | Profile tab | button |

---

## Login (`app/login.tsx`)

| testID | Description | Type |
|--------|-------------|------|
| `login-google-button` | Continue with Google (web landing) | button |
| `login-magiclink-button` | Sign in with Email / magic-link (web landing) | button |
| `login-password-nav-button` | Sign in with Password nav button (web landing) | button |
| `login-terms-link` | Terms of Service link | button |
| `login-privacy-link` | Privacy Policy link | button |
| `login-email-input` | Email text field (email step and password step — only one renders at a time) | input |
| `login-send-link-button` | Send Magic Link submit button (email step) | button |
| `login-back-button` | Back button (email step → landing; password step → landing) | button |
| `login-resend-button` | Resend link button (OTP step) | button |
| `login-change-email-button` | Change email / back button (OTP step → email step) | button |
| `login-password-input` | Password field (password step) | input |
| `login-signin-button` | Sign in submit button (password step) | button |
| `login-error-text` | Inline auth error message (any step — only one renders at a time) | text |

---

## Dashboard (`app/(tabs)/index.tsx`)

| testID | Description | Type |
|--------|-------------|------|
| `dashboard-refresh-button` | Refresh productivity data button | button |

---

## Log Task (`app/(tabs)/tasks.tsx`)

| testID | Description | Type |
|--------|-------------|------|
| `tasks-tab-log` | Log tab switcher | button |
| `tasks-tab-timer` | Timer tab switcher | button |
| `tasks-tab-history` | History tab switcher | button |
| `tasks-name-input` | Task name text field (log tab) | input |
| `tasks-category-input` | Category text field (log tab) | input |
| `tasks-log-button` | Log Task submit button | button |
| `tasks-quicklog-open-excel` | Quick-log: Open Excel | button |
| `tasks-quicklog-copy-data` | Quick-log: Copy Data | button |
| `tasks-quicklog-upload-file` | Quick-log: Upload File | button |
| `tasks-quicklog-download-report` | Quick-log: Download Report | button |
| `tasks-quicklog-send-email` | Quick-log: Send Email | button |
| `tasks-quicklog-reply-to-email` | Quick-log: Reply to Email | button |
| `tasks-quicklog-check-slack` | Quick-log: Check Slack | button |
| `tasks-quicklog-join-meeting` | Quick-log: Join Meeting | button |
| `tasks-quicklog-write-code` | Quick-log: Write Code | button |
| `tasks-quicklog-review-pr` | Quick-log: Review PR | button |
| `tasks-quicklog-fix-bug` | Quick-log: Fix Bug | button |
| `tasks-quicklog-deploy-app` | Quick-log: Deploy App | button |
| `tasks-quicklog-generate-report` | Quick-log: Generate Report | button |
| `tasks-quicklog-update-dashboard` | Quick-log: Update Dashboard | button |
| `tasks-quicklog-create-presentation` | Quick-log: Create Presentation | button |
| `tasks-quicklog-update-jira-ticket` | Quick-log: Update Jira Ticket | button |
| `tasks-quicklog-fill-timesheet` | Quick-log: Fill Timesheet | button |
| `tasks-quicklog-attend-standup` | Quick-log: Attend Standup | button |
| `tasks-timer-name-input` | Task name field (timer tab) | input |
| `tasks-timer-category-input` | Category field (timer tab) | input |
| `tasks-timer-start-button` | Start Timer button | button |
| `tasks-timer-stop-button` | Stop & Save button (shown while timer running) | button |
| `tasks-search-input` | Task search field (history tab) | input |
| `tasks-import-csv-button` | Import CSV button | button |
| `tasks-refresh-button` | Refresh history button | button |
| `tasks-filter-all` | Filter chip: All categories | button |
| `tasks-filter-<cat>` | Filter chip for a specific category (e.g. `tasks-filter-file-ops`) — dynamic | button |
| `tasks-row-<id>` | History row for a task (e.g. `tasks-row-abc123`) — dynamic | row |
| `tasks-delete-<id>` | Delete button on a history row — dynamic | button |

---

## Patterns (`app/(tabs)/patterns.tsx`)

| testID | Description | Type |
|--------|-------------|------|
| `patterns-analyze-button` | Analyse with Claude button | button |
| `patterns-card-<index>` | Pattern card container (e.g. `patterns-card-0`) — dynamic | row |
| `patterns-run-<index>` | Execute Automation button on a pattern card — dynamic | button |

---

## Automations (`app/(tabs)/automations.tsx`)

| testID | Description | Type |
|--------|-------------|------|
| `automations-action-email` | Quick action: Send Email | button |
| `automations-action-sheets` | Quick action: Spreadsheet | button |
| `automations-action-calendar` | Quick action: Schedule Meeting | button |
| `automations-action-report` | Quick action: Generate Report | button |
| `automations-action-workspace` | Quick action: Open Workspace | button |
| `automations-action-run_all` | Quick action: Run All Rules | button |
| `automations-run-<index>` | Execute Automation button on a pattern card — dynamic | button |
| `automations-add-rule-button` | + New Rule button | button |
| `automations-create-first-rule-button` | + Create First Rule button (empty state) | button |
| `automations-rule-<id>` | Rule card container — dynamic | row |
| `automations-toggle-<id>` | Active/inactive switch on a rule card — dynamic | button |
| `automations-delete-<id>` | Delete Rule button on a rule card — dynamic | button |
| `automations-refresh-history-button` | Refresh execution history | button |
| `automations-clear-history-button` | Clear History button | button |
| `automations-rule-name-input` | Rule name input (New Rule modal) | input |
| `automations-rule-trigger-input` | Trigger pattern input (New Rule modal) | input |
| `automations-action-type-open-url` | Action type chip: Open URL | button |
| `automations-action-type-email` | Action type chip: Email | button |
| `automations-action-type-webhook` | Action type chip: Webhook | button |
| `automations-save-rule-button` | Save Rule button (New Rule modal) | button |

---

## AI Chat (`app/(tabs)/chat.tsx`)

| testID | Description | Type |
|--------|-------------|------|
| `chat-suggestion-<index>` | Suggestion chip on welcome screen (e.g. `chat-suggestion-0`) — dynamic | button |
| `chat-message-<index>` | Chat message bubble wrapper — dynamic | row |
| `chat-action-<actionId>` | AI-suggested action button (e.g. `chat-action-vscode`) — dynamic | button |
| `chat-input` | Chat text input | input |
| `chat-send-button` | Send message button | button |

---

## Profile (`app/(tabs)/profile.tsx`)

| testID | Description | Type |
|--------|-------------|------|
| `profile-edit-name-button` | Tap name to begin editing | button |
| `profile-name-input` | Name text field (edit mode) | input |
| `profile-save-name-button` | Save name button | button |
| `profile-cancel-name-button` | Cancel name edit button | button |
| `profile-dark-mode-switch` | Dark mode toggle switch | button |
| `profile-refresh-integrations-button` | Refresh integration status | button |
| `profile-gmail-connect-button` | Connect Gmail button | button |
| `profile-gmail-analyse-button` | Analyse Gmail button | button |
| `profile-gmail-disconnect-button` | Disconnect Gmail | button |
| `profile-calendar-connect-button` | Connect Google Calendar button | button |
| `profile-calendar-analyse-button` | Analyse Calendar button | button |
| `profile-calendar-disconnect-button` | Disconnect Calendar | button |
| `profile-export-tasks-button` | Export Tasks as CSV | button |
| `profile-export-patterns-button` | Export Patterns as CSV | button |
| `profile-delete-data-button` | Delete All My Data | button |
| `profile-signout-button` | Sign Out | button |

---

## Email Composer (`components/EmailModal.tsx`)

| testID | Description | Type |
|--------|-------------|------|
| `email-modal-close-button` | Close (✕) button | button |
| `email-modal-templates-button` | Quick Templates toggle | button |
| `email-modal-template-<index>` | Template chip (e.g. `email-modal-template-0`) — dynamic | button |
| `email-modal-to-input` | TO recipient field | input |
| `email-modal-to-error` | Inline TO validation error | text |
| `email-modal-subject-input` | Subject field | input |
| `email-modal-body-input` | Message body field | input |
| `email-modal-send-button` | Send Email button | button |

---

## Toast (`components/Toast.tsx`)

| testID | Description | Type |
|--------|-------------|------|
| `toast-message` | Toast notification container | text |
