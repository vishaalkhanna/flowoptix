# FlowOptix — Selenium E2E Test Suite

Production-ready end-to-end tests for [FlowOptix](https://flowoptix-ten.vercel.app), a React Native Web (expo-router) application.

## Stack

| Tool | Purpose |
|---|---|
| [selenium-webdriver](https://www.npmjs.com/package/selenium-webdriver) | Browser automation |
| [Mocha](https://mochajs.org/) | Test runner |
| [Chai](https://www.chaijs.com/) | Assertions |
| [exceljs](https://www.npmjs.com/package/exceljs) | Excel report generation |
| [mochawesome](https://www.npmjs.com/package/mochawesome) | HTML reports |
| [winston](https://www.npmjs.com/package/winston) | Structured logging |
| [dotenv](https://www.npmjs.com/package/dotenv) | Env-var loading |

## Prerequisites

- Node.js 18 or later
- Chrome / Edge / Firefox installed
- The matching browser driver is **auto-managed** by Selenium Manager (built into selenium-webdriver v4)

## Setup

```bash
cd e2e
npm install
cp .env.example .env
# Edit .env and fill in TEST_EMAIL and TEST_PASSWORD
```

## Running tests

```bash
# Default (Chrome, headless)
npm test

# Specific browser
npm run test:chrome
npm run test:firefox
npm run test:edge

# Headed (show browser window)
npm run test:headed

# CI (headless Chrome, explicit)
npm run test:ci
```

## Project structure

```
e2e/
├── tests/           # Test specs (one file per feature)
│   ├── auth.test.js
│   ├── navigation.test.js
│   ├── tasks.test.js
│   ├── chat.test.js
│   ├── profile.test.js
│   └── ui.test.js
├── pages/           # Page Object Model
│   ├── BasePage.js
│   ├── LoginPage.js
│   ├── DashboardPage.js
│   ├── TasksPage.js
│   ├── PatternsPage.js
│   ├── AutomationsPage.js
│   ├── ChatPage.js
│   └── ProfilePage.js
├── utilities/
│   ├── driverFactory.js   # Builds Chrome/Edge/Firefox WebDriver
│   ├── waits.js           # Custom explicit-wait helpers
│   ├── screenshots.js     # Failure screenshot capture
│   ├── retry.js           # withRetry() wrapper
│   ├── logger.js          # winston logger
│   ├── excelReporter.js   # ExcelJS report singleton
│   ├── rootHooks.js       # Mocha root hooks (record + write Excel)
│   └── loginHelper.js     # Shared login flow
├── config/
│   └── config.js          # All env-var + timeout constants
├── data/
│   └── testData.json      # Static test fixtures
├── reports/               # mochawesome HTML/JSON reports
│   └── failures/          # Per-failure JSON + screenshot
├── screenshots/           # Ad-hoc screenshots
├── logs/                  # winston daily log files
└── excel/                 # E2E_Report_*.xlsx files
```

## How elements are located

All elements use `data-testid` attributes rendered by react-native-web from the `testID` prop:

```js
By.css('[data-testid="login-signin-button"]')
```

The full contract is in **[TESTIDS.md](../TESTIDS.md)** at the repo root.

## Reports

After each run:

- **HTML report** — `reports/e2e-report*.html` (mochawesome)
- **Excel workbook** — `excel/E2E_Report_*.xlsx` with four sheets:
  - **Summary** — pass/fail counts, pass rate, duration
  - **TestCases** — per-test status with colour coding
  - **Failed** — failed tests with error messages
  - **Logs** — timestamped log entries

Failure artefacts saved to `reports/failures/`:

- `FAIL_<test>_<ts>.png` — screenshot
- `FAIL_<test>_<ts>.json` — URL, reason, stack trace, console logs

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TEST_EMAIL` | Yes | — | Test account email |
| `TEST_PASSWORD` | Yes | — | Test account password |
| `BROWSER` | No | `chrome` | `chrome`, `edge`, or `firefox` |
| `HEADLESS` | No | `true` | Set `false` to watch the browser |
| `BASE_URL` | No | `https://flowoptix-ten.vercel.app` | App URL |

## CI

The GitHub Actions workflow at `.github/workflows/selenium-e2e.yml` runs on every push/PR touching `e2e/`. Configure secrets `TEST_EMAIL` and `TEST_PASSWORD` in **Settings → Secrets and variables → Actions**.

## Known limitations

- **Pagination, sidebars, tooltips, date pickers, dropdowns** — no UI exists for these; no tests written.
- **Google OAuth / magic-link** — cannot be automated in a browser; only password-based auth is tested.
- **Appium** — `accessibilityLabel` props are present in the app but native Appium tests are out of scope here.
- **Backend cold start** — the Render free-tier backend can take up to 50 s on first request. All timeouts that touch the backend are set to 60 s.
