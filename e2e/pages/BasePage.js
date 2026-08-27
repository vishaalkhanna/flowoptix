'use strict';

const { By } = require('selenium-webdriver');
const { waitForElement, waitForTestId, safeClick, safeSendKeys, elementExists, acceptAlert, closeExtraWindows } = require('../utilities/waits');
const config = require('../config/config');

class BasePage {
  constructor(driver) {
    this.driver = driver;
  }

  async navigate(path = '') {
    await this.driver.get(config.BASE_URL + path);
  }

  async getCurrentUrl() {
    return this.driver.getCurrentUrl();
  }

  async waitFor(testId, timeout = config.ELEMENT_TIMEOUT) {
    return waitForTestId(this.driver, testId, timeout);
  }

  async click(testId, timeout = config.ELEMENT_TIMEOUT) {
    return safeClick(this.driver, `[data-testid="${testId}"]`, timeout);
  }

  async type(testId, text, timeout = config.ELEMENT_TIMEOUT) {
    return safeSendKeys(this.driver, `[data-testid="${testId}"]`, text, timeout);
  }

  async getText(testId, timeout = config.ELEMENT_TIMEOUT) {
    const el = await waitForTestId(this.driver, testId, timeout);
    return el.getText();
  }

  async exists(testId) {
    return elementExists(this.driver, `[data-testid="${testId}"]`);
  }

  async isVisible(testId) {
    const els = await this.driver.findElements(By.css(`[data-testid="${testId}"]`));
    if (!els.length) return false;
    return els[0].isDisplayed();
  }

  async waitForTabBar(timeout = config.ELEMENT_TIMEOUT) {
    return waitForTestId(this.driver, 'tab-dashboard', timeout);
  }

  async acceptAlert() {
    return acceptAlert(this.driver);
  }

  async closeExtraWindows() {
    return closeExtraWindows(this.driver);
  }

  async sleep(ms) {
    return this.driver.sleep(ms);
  }

  async getPageSource() {
    return this.driver.getPageSource();
  }

  async scrollToTop() {
    await this.driver.executeScript('window.scrollTo(0, 0)');
  }
}

module.exports = BasePage;
