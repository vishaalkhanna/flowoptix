# FlowOptix Test ID Inventory

All `data-testid` attributes used in the E2E suite, grouped by page.
The `uiInventory.test.js` suite asserts every element listed here is present on its page.

## Login Page (`/login`)

| Test ID | Element | Notes |
|---|---|---|
| `login-google-button` | Google OAuth button | Always present on landing step |
| `login-password-nav-button` | "Sign in with Password" button | Landing step |
| `login-email-input` | Email field | Visible after clicking password-nav-button |
| `login-password-input` | Password field | Visible after clicking password-nav-button |
| `login-signin-button` | Submit / Sign In button | Visible after clicking password-nav-button |
| `login-error-text` | Validation / auth error message | Appears after failed submission |

## Tab Bar (all authenticated pages)

| Test ID | Element | Notes |
|---|---|---|
| `tab-dashboard` | Dashboard tab | Visible on all authenticated screens |
| `tab-tasks` | Tasks tab | Visible on all authenticated screens |
| `tab-patterns` | Patterns tab | Visible on all authenticated screens |
| `tab-automate` | Automations tab | Visible on all authenticated screens |
| `tab-chat` | Chat tab | Visible on all authenticated screens |
| `tab-profile` | Profile tab | Visible on all authenticated screens |

## Dashboard (`/`)

| Test ID | Element | Notes |
|---|---|---|
| `dashboard-refresh-button` | Refresh stats button | Main dashboard action |

## Tasks Page (`/tasks`)

### Log Tab (default)
| Test ID | Element | Notes |
|---|---|---|
| `tasks-tab-log` | Log tab switcher | Active by default |
| `tasks-tab-timer` | Timer tab switcher | |
| `tasks-tab-history` | History tab switcher | |
| `tasks-name-input` | Task name text input | |
| `tasks-category-input` | Category text input | Optional field |
| `tasks-log-button` | "Log Task" submit button | |
| `tasks-quicklog-send-email` | "Send Email" quick-log button | |
| `tasks-quicklog-join-meeting` | "Join Meeting" quick-log button | |

### History Tab
| Test ID | Element | Notes |
|---|---|---|
| `tasks-search-input` | History search input | Visible after switching to history tab |
| `tasks-filter-all` | "All" category filter chip | Visible after switching to history tab |
| `tasks-row-{id}` | Individual task row | Pattern match; at least 1 row expected |

### Timer Tab
| Test ID | Element | Notes |
|---|---|---|
| `tasks-timer-start-button` | Start timer button | Visible after switching to timer tab |

## Email Modal (from Tasks / Quick-log)

| Test ID | Element | Notes |
|---|---|---|
| `email-modal-close-button` | Close email modal button | Visible after clicking send-email quick-log |

## Patterns Page (`/patterns`)

| Test ID | Element | Notes |
|---|---|---|
| `patterns-analyze-button` | "Analyse Patterns" button | Main CTA |

## Automations Page (`/automations`)

| Test ID | Element | Notes |
|---|---|---|
| `automations-add-rule-button` | "Add Rule" button | Main CTA |
| `automations-rule-name-input` | Rule name input in modal | Visible after clicking Add Rule |

## Chat Page (`/chat`)

| Test ID | Element | Notes |
|---|---|---|
| `chat-input` | Message input field | |
| `chat-send-button` | Send message button | |

## Profile Page (`/profile`)

| Test ID | Element | Notes |
|---|---|---|
| `profile-signout-button` | Sign Out button | |
| `profile-dark-mode-switch` | Dark mode toggle switch | |
| `profile-edit-name-button` | Edit display name button | |
| `profile-name-input` | Name text input | Visible after clicking edit-name |
| `profile-save-name-button` | Save name button | Visible after clicking edit-name |
| `profile-cancel-name-button` | Cancel name edit button | Visible after clicking edit-name |
| `profile-export-tasks-button` | Export tasks (CSV/JSON) button | |
| `profile-export-patterns-button` | Export patterns button | |
| `profile-gmail-connect-button` | Connect Gmail button | Visible when not connected |
| `profile-gmail-analyse-button` | Analyse Gmail button | Visible when connected |
| `profile-calendar-connect-button` | Connect Calendar button | Visible when not connected |
| `profile-calendar-analyse-button` | Analyse Calendar button | Visible when connected |

## Toast

| Test ID | Element | Notes |
|---|---|---|
| `toast-message` | Task-logged toast notification | Appears briefly after task logging |
