'use strict';

const required = (name) => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}. Copy .env.example → .env and fill it in.`);
  return val;
};

module.exports = {
  BASE_URL: process.env.BASE_URL || 'https://flowoptix-ten.vercel.app',
  TEST_EMAIL: required('TEST_EMAIL'),
  TEST_PASSWORD: required('TEST_PASSWORD'),
  BROWSER: (process.env.BROWSER || 'chrome').toLowerCase(),
  HEADLESS: process.env.HEADLESS !== 'false',

  // Timeouts (ms)
  PAGE_LOAD_TIMEOUT: 60_000,
  ELEMENT_TIMEOUT: 30_000,
  BACKEND_TIMEOUT: 60_000,   // Render free-tier cold start ≤50 s
  SHORT_WAIT: 5_000,

  // Output paths (relative to e2e/ directory)
  REPORTS_DIR: 'reports',
  FAILURES_DIR: 'reports/failures',
  SCREENSHOTS_DIR: 'screenshots',
  LOGS_DIR: 'logs',
  EXCEL_DIR: 'excel',
};
