'use strict';

const { By, until } = require('selenium-webdriver');
const config = require('../config/config');
const logger = require('./logger');

const sel = (testId) => `[data-testid="${testId}"]`;

/**
 * Wait for an element to appear in the DOM.
 * We do NOT gate on elementIsVisible because react-native-web entrance
 * animations (btnsOpacity) start at opacity:0 and ChromeDriver's
 * isDisplayed() considers opacity-0 elements not-visible.
 */
async function waitForElement(driver, cssSelector, timeout = config.ELEMENT_TIMEOUT) {
  try {
    return await driver.wait(
      until.elementLocated(By.css(cssSelector)),
      timeout
    );
  } catch (err) {
    throw new Error(`waitForElement timed out for "${cssSelector}" after ${timeout}ms`);
  }
}

async function waitForTestId(driver, testId, timeout = config.ELEMENT_TIMEOUT) {
  return waitForElement(driver, sel(testId), timeout);
}

async function waitForElementGone(driver, cssSelector, timeout = config.ELEMENT_TIMEOUT) {
  try {
    const el = await driver.findElement(By.css(cssSelector));
    await driver.wait(until.stalenessOf(el), timeout);
  } catch (_) {
    // Already gone — fine
  }
}

async function waitForUrl(driver, matcher, timeout = config.PAGE_LOAD_TIMEOUT) {
  if (typeof matcher === 'string') {
    await driver.wait(until.urlContains(matcher), timeout);
  } else {
    await driver.wait(until.urlMatches(matcher), timeout);
  }
}

async function waitForElementCount(driver, cssSelector, minCount, timeout = config.BACKEND_TIMEOUT) {
  await driver.wait(async () => {
    const els = await driver.findElements(By.css(cssSelector));
    return els.length >= minCount;
  }, timeout, `Expected at least ${minCount} of "${cssSelector}"`);
}

/**
 * Click an element via JavaScript so opacity/visibility state doesn't block it.
 * Falls back to native .click() on JS failure.
 */
async function safeClick(driver, cssSelector, timeout = config.ELEMENT_TIMEOUT) {
  const el = await waitForElement(driver, cssSelector, timeout);
  await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', el);
  await driver.sleep(150);
  try {
    await driver.executeScript('arguments[0].click()', el);
  } catch (_) {
    await el.click();
  }
  return el;
}

async function safeSendKeys(driver, cssSelector, text, timeout = config.ELEMENT_TIMEOUT) {
  const el = await waitForElement(driver, cssSelector, timeout);
  await driver.executeScript('arguments[0].focus()', el);
  await driver.sleep(100);
  await el.clear();   // fires input/change events so React state resets to ""
  await driver.sleep(50);
  await el.sendKeys(text);
  return el;
}

async function acceptAlert(driver, timeout = 5000) {
  try {
    await driver.wait(until.alertIsPresent(), timeout);
    const alert = await driver.switchTo().alert();
    const text = await alert.getText();
    await alert.accept();
    return text;
  } catch (_) {
    return null;
  }
}

async function closeExtraWindows(driver) {
  const handles = await driver.getAllWindowHandles();
  if (handles.length <= 1) return;
  const main = handles[0];
  for (const h of handles.slice(1)) {
    await driver.switchTo().window(h);
    await driver.close();
  }
  await driver.switchTo().window(main);
}

async function elementExists(driver, cssSelector) {
  const els = await driver.findElements(By.css(cssSelector));
  return els.length > 0;
}

/**
 * Clear localStorage + sessionStorage for the current origin.
 * Call this after any navigation to ensure no stale Supabase session.
 */
async function clearStorage(driver) {
  try {
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
  } catch (_) {
    // Page might not support JS storage (about:blank etc) — ignore
  }
}

module.exports = {
  sel,
  waitForElement,
  waitForTestId,
  waitForElementGone,
  waitForUrl,
  waitForElementCount,
  safeClick,
  safeSendKeys,
  acceptAlert,
  closeExtraWindows,
  elementExists,
  clearStorage,
};
