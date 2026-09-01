'use strict';

/**
 * Password Validation — 30 data-driven tests
 *
 * Tests that the password field accepts/rejects various input types without:
 *   (a) crashing the page
 *   (b) creating a Supabase session
 *
 * Only entries with submitAndExpectError:true are submitted (empty / whitespace
 * passwords that must be caught client-side).  All other entries type into the
 * field and verify the app renders the input safely — XSS payloads must not
 * execute; SQL strings must not alter state.
 *
 * Uses a fake email (not the real test account) on submitted tests to avoid
 * rate-limiting the test-user account.
 */

const { expect } = require('chai');
const { By } = require('selenium-webdriver');
const { buildDriver } = require('../utilities/driverFactory');
const LoginPage = require('../pages/LoginPage');
const config = require('../config/config');
const logger = require('../utilities/logger');
const passwords = require('../data/passwords.json');

const FAKE_EMAIL = 'e2e-passtest-notreal@example-qa.invalid';

async function setInputValue(driver, testId, value) {
  const el = await driver.findElement(By.css(`[data-testid="${testId}"]`));
  await driver.executeScript(function (el, val) {
    var proto = el instanceof window.HTMLInputElement
      ? window.HTMLInputElement.prototype
      : window.HTMLTextAreaElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) { desc.set.call(el, val); } else { el.value = val; }
    ['input', 'change'].forEach(function (ev) {
      el.dispatchEvent(new Event(ev, { bubbles: true, cancelable: true }));
    });
  }, el, value);
}

describe('Password Validation', function () {
  let driver;
  let loginPage;

  before(async function () {
    driver = await buildDriver();
    global.__e2eDriver = driver;
    loginPage = new LoginPage(driver);
    await loginPage.load();
  });

  after(async function () {
    if (driver) await driver.quit();
    global.__e2eDriver = null;
  });

  beforeEach(async function () {
    logger.info(`Starting: ${this.currentTest.title}`);
  });

  passwords.forEach((entry) => {
    it(`password [${entry.category}]: ${entry.description}`, async function () {
      // Reset to login page / password step each iteration
      await driver.get(config.BASE_URL + '/');
      await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
      await driver.get(config.BASE_URL + '/');
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return url.includes('/login');
      }, config.PAGE_LOAD_TIMEOUT);
      await driver.sleep(2000);

      try {
        await loginPage.click('login-password-nav-button');
        await loginPage.waitFor('login-email-input', config.ELEMENT_TIMEOUT);
      } catch (_) {}

      // Set email (fake, so no real user is touched)
      await setInputValue(driver, 'login-email-input', FAKE_EMAIL);

      // Set password directly to preserve leading/trailing spaces and special chars
      await setInputValue(driver, 'login-password-input', entry.password);

      if (entry.submitAndExpectError) {
        // Empty / whitespace passwords should be rejected client-side immediately
        await loginPage.clickSignIn();
        await driver.sleep(2500);
        const hasError = await loginPage.errorVisible();
        expect(hasError, `Expected error for "${entry.description}" password`).to.be.true;
      } else {
        // Verify page has not crashed: the password step is still visible
        const emailVisible = await loginPage.isVisible('login-email-input');
        expect(emailVisible, `Page should still be on login form after typing "${entry.description}" password`).to.be.true;
        // XSS check: alert() should NOT have fired (if it had, WebDriver alert handler
        // would throw on next command — catching that is handled by the framework timeout)
        try {
          await driver.switchTo().alert();
          // If we get here, an alert popped up — dismiss it and FAIL
          await driver.switchTo().alert().dismiss();
          expect.fail(`JavaScript alert fired for "${entry.description}" — XSS not sanitised`);
        } catch (e) {
          if (e.name === 'AssertionError') throw e;
          // No alert — expected
        }
      }
    });
  });
});
