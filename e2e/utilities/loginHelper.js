'use strict';

const config = require('../config/config');
const logger = require('./logger');
const { clearStorage, waitForTestId } = require('./waits');

// Public Supabase constants (embedded in the client bundle — not secrets)
const SUPABASE_URL = 'https://cdhichktpjedtjbbqhsf.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGljaGt0cGplZHRqYmJxaHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTc2MDgsImV4cCI6MjA5MzA5MzYwOH0.uWsjsZPU8XD1trpfY75qmRksukOhQsLSSAq9GawrHWw';
const PROJECT_REF = 'cdhichktpjedtjbbqhsf';
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

/**
 * Authenticate directly via the Supabase REST API from the browser context,
 * injecting the session into localStorage so the app recognises the user as
 * signed-in without touching any login UI elements.
 *
 * This approach is robust against the state of the deployed UI (e.g. a stale
 * Vercel build that lacks the password-button) while still exercising the full
 * app as an authenticated user.
 */
async function performLogin(driver) {
  logger.info('performLogin: establishing session via Supabase REST API');

  // Hit the app first so we own the origin and can write to its localStorage.
  await driver.get(config.BASE_URL + '/');
  await clearStorage(driver);

  // Call Supabase from within the browser — CORS is pre-approved for this origin.
  const result = await driver.executeAsyncScript(
    /* script */ `
      var done  = arguments[arguments.length - 1];
      var email = arguments[0];
      var pass  = arguments[1];
      fetch('${SUPABASE_URL}/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '${SUPABASE_ANON_KEY}',
          'Authorization': 'Bearer ${SUPABASE_ANON_KEY}'
        },
        body: JSON.stringify({ email: email.trim(), password: pass.trim() })
      })
      .then(function(r){ return r.json(); })
      .then(function(sess){
        if (sess && sess.access_token) {
          localStorage.setItem('${STORAGE_KEY}', JSON.stringify(sess));
          done({ ok: true });
        } else {
          done({ ok: false, error: JSON.stringify(sess) });
        }
      })
      .catch(function(e){ done({ ok: false, error: e.message }); });
    `,
    config.TEST_EMAIL,
    config.TEST_PASSWORD
  );

  if (!result || !result.ok) {
    throw new Error(`Supabase REST auth failed: ${result ? result.error : 'no response'}`);
  }

  logger.info('performLogin: session injected — navigating to app');

  // Reload so the app reads the injected session and redirects to the tab bar.
  await driver.get(config.BASE_URL + '/');

  // Wait for the URL to leave /login — the app reads the injected session and
  // redirects to /(tabs).  If tab-dashboard testID is available (post-deploy),
  // also verify the tab is visible; otherwise a URL check suffices.
  await driver.wait(async () => {
    const url = await driver.getCurrentUrl();
    return !url.includes('/login');
  }, config.BACKEND_TIMEOUT, 'App did not redirect away from /login after session injection');

  // Best-effort wait for tab-dashboard (present only in deployments that include
  // commit 91985d0 "add testID locators to all interactive elements").
  try {
    await waitForTestId(driver, 'tab-dashboard', 8000);
  } catch (_) {
    // tab-dashboard testID not yet deployed — verify we're not on login page.
    const url = await driver.getCurrentUrl();
    if (url.includes('/login')) throw new Error('Still on login page after session injection');
    logger.info('performLogin: tab-dashboard testID absent — relying on URL confirmation');
  }

  logger.info('performLogin: dashboard loaded — login complete');
}

module.exports = { performLogin };
