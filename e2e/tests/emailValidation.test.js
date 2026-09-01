'use strict';

/**
 * Email Validation — 45 data-driven tests
 *
 * Validates client-side and fast-server-side email rejection.
 * Does NOT use the real test user account — any submission uses a dummy password
 * so that no real login is attempted.  Supabase returns a 400 immediately for
 * malformed addresses (not a rate-limited sign-in attempt).
 *
 * Rule: these tests NEVER create a Supabase session.
 */

const { expect } = require('chai');
const { By } = require('selenium-webdriver');
const { buildDriver } = require('../utilities/driverFactory');
const LoginPage = require('../pages/LoginPage');
const config = require('../config/config');
const logger = require('../utilities/logger');
const emails = require('../data/emails.json');

// Inject a value into a react-native-web TextInput, bypassing the LoginPage trim().
async function setInputValue(driver, testId, value) {
  const el = await driver.findElement(By.css(`[data-testid="${testId}"]`));
  await driver.executeScript(function (el, val) {
    var isInput = el instanceof window.HTMLInputElement;
    var proto = isInput ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) { desc.set.call(el, val); } else { el.value = val; }
    ['input', 'change'].forEach(function (ev) {
      el.dispatchEvent(new Event(ev, { bubbles: true, cancelable: true }));
    });
  }, el, value);
}

describe('Email Validation', function () {
  let driver;
  let loginPage;

  before(async function () {
    driver = await buildDriver();
    global.__e2eDriver = driver;
    loginPage = new LoginPage(driver);
    // Load login page once; individual tests navigate to password step each time.
    await loginPage.load();
  });

  after(async function () {
    if (driver) await driver.quit();
    global.__e2eDriver = null;
  });

  beforeEach(async function () {
    logger.info(`Starting: ${this.currentTest.title}`);
  });

  emails.forEach((entry) => {
    it(`email [${entry.category}]: ${entry.description}`, async function () {
      // Navigate to login page and password step each time to reset form state.
      await driver.get(config.BASE_URL + '/');
      await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
      await driver.get(config.BASE_URL + '/');
      // Wait for login redirect
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return url.includes('/login');
      }, config.PAGE_LOAD_TIMEOUT);
      await driver.sleep(2000); // entrance animation

      // Navigate to password step
      try {
        await loginPage.click('login-password-nav-button');
        await loginPage.waitFor('login-email-input', config.ELEMENT_TIMEOUT);
      } catch (_) {
        // Already on password step
      }

      // Inject email value directly (no trim applied)
      await setInputValue(driver, 'login-email-input', entry.email);

      if (entry.category === 'invalid') {
        // Fill a dummy password so the form can be submitted
        await setInputValue(driver, 'login-password-input', 'DummyPass1!');
        await loginPage.clickSignIn();
        // Wait up to 5 s for error (client-side instant, Supabase ~200 ms)
        await driver.sleep(4000);
        const hasError = await loginPage.errorVisible();
        // Some apps pass invalid emails through to Supabase which returns a fast 400.
        // Both client-side and server-side errors satisfy the assertion.
        expect(hasError, `Expected error for invalid email "${entry.description}"`).to.be.true;
      } else {
        // Valid format: verify the field accepted the input without crashing.
        const emailInput = await driver.findElement(By.css('[data-testid="login-email-input"]'));
        const value = await emailInput.getAttribute('value');
        if (entry.email.length > 0) {
          expect(value.length, `Expected field to accept valid email "${entry.description}"`).to.be.greaterThan(0);
        }
        // Do NOT submit — avoids hitting Supabase with valid-format unknown emails.
      }
    });
  });
});
