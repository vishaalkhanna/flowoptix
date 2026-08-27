'use strict';

const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');
const config = require('../config/config');
const { waitForElementCount } = require('../utilities/waits');

class PatternsPage extends BasePage {
  async load() {
    await this.navigate('/patterns');
    await this.waitFor('patterns-analyze-button', config.PAGE_LOAD_TIMEOUT);
  }

  async clickAnalyse() {
    await this.click('patterns-analyze-button');
  }

  async waitForCards(minCount = 1) {
    await waitForElementCount(
      this.driver,
      '[data-testid^="patterns-card-"]',
      minCount,
      config.BACKEND_TIMEOUT
    );
  }

  async getCardCount() {
    const cards = await this.driver.findElements(By.css('[data-testid^="patterns-card-"]'));
    return cards.length;
  }
}

module.exports = PatternsPage;
