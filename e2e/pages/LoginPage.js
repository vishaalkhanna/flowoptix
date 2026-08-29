'use strict';

const { By, Key } = require('selenium-webdriver');
const BasePage = require('./BasePage');
const config = require('../config/config');
const { waitForTestId, clearStorage } = require('../utilities/waits');
const logger = require('../utilities/logger');

class LoginPage extends BasePage {
  /**
   * Navigate to the login page via the ROOT route so the login component is
   * rendered by React client-side (avoiding the stale /login static HTML that
   * pre-dates the password button and causes React error #418).
   *
   * Flow: GET / → clear stale storage → GET / again → root _layout checks
   * session (none) → router.replace('/login') → client-side render of Login.
   */
  async load() {
    // First hit establishes the app origin; immediately clear storage so the
    // second hit starts with no stale Supabase session.
    await this.navigate('/');
    await clearStorage(this.driver);

    // Second hit: root layout sees no session → router.replace('/login').
    await this.navigate('/');

    // Wait for expo-router's client-side redirect to /login.
    await this.driver.wait(async () => {
      const url = await this.getCurrentUrl();
      return url.includes('/login');
    }, config.PAGE_LOAD_TIMEOUT, 'Root layout did not redirect to /login');

    // btnsOpacity entrance animation: 1300 ms delay + 500 ms duration.
    // Sleep 2.5 s so all buttons reach opacity:1 before any interaction.
    await this.sleep(2500);

    // Wait for the Google button — always present regardless of Vercel deploy state.
    // The password button is also expected but may be absent on older deployments.
    await this.waitFor('login-google-button', config.PAGE_LOAD_TIMEOUT);
  }

  async goToPasswordStep() {
    await this.click('login-password-nav-button');
    await this.waitFor('login-email-input', config.ELEMENT_TIMEOUT);
  }

  async fillEmail(email) {
    await this.type('login-email-input', email.trim());
  }

  /**
   * Override the default type() for the password field.
   * safeSendKeys uses el.clear() before el.sendKeys(), which can leave
   * react-native-web TextInput in a transitional state where subsequent
   * key events are dropped. Instead: click → Ctrl+A (select all) → sendKeys,
   * which is pure keyboard simulation with no WebDriver clear() side-effects.
   */
  async fillPassword(password) {
    const el = await this.driver.findElement(By.css('[data-testid="login-password-input"]'));
    await this.driver.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
    await this.driver.sleep(150);
    await el.click();
    await this.driver.sleep(100);
    await el.sendKeys(Key.chord(Key.CONTROL, 'a'));
    await this.driver.sleep(50);
    await el.sendKeys(password.trim());
  }

  async clickSignIn() {
    await this.click('login-signin-button');
  }

  async loginWith(email, password) {
    await this.goToPasswordStep();
    await this.fillEmail(email.trim());
    await this.fillPassword(password.trim());
    // Diagnostic: surface DOM values in the failure JSON so we can confirm
    // what the form will actually submit to Supabase.
    const vals = await this.driver.executeScript(function () {
      var e = document.querySelector('[data-testid="login-email-input"]');
      var p = document.querySelector('[data-testid="login-password-input"]');
      return { email: e ? e.value : null, pwdLen: p ? p.value.length : null };
    });
    logger.info(`loginWith: dom email="${vals.email}" pwdLen=${vals.pwdLen}`);
    await this.clickSignIn();
  }

  async waitForDashboard(timeout = config.BACKEND_TIMEOUT) {
    // Wait for the URL to leave /login — robust whether the redirect is
    // client-side (SPA) or a full page reload.
    await this.driver.wait(async () => {
      const url = await this.driver.getCurrentUrl();
      return !url.includes('/login');
    }, timeout, 'Expected redirect away from /login after successful login');
    // Give the tab bar time to render, then do a best-effort check for tab-dashboard.
    await this.driver.sleep(2000);
    try {
      await this.waitFor('tab-dashboard', 8000);
    } catch (_) {
      // tab-dashboard may still be absent on older builds — URL check is sufficient.
    }
  }

  async getErrorText() {
    const el = await waitForTestId(this.driver, 'login-error-text', config.ELEMENT_TIMEOUT);
    return el.getText();
  }

  async errorVisible() {
    const els = await this.driver.findElements(By.css('[data-testid="login-error-text"]'));
    if (!els.length) return false;
    try {
      const text = await els[0].getText();
      return text.length > 0;
    } catch (_) {
      return false;
    }
  }

  async isOnLoginPage() {
    const url = await this.getCurrentUrl();
    return url.includes('/login');
  }
}

module.exports = LoginPage;
