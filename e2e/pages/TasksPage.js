'use strict';

const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');
const config = require('../config/config');
const { waitForElementCount, waitForTestId } = require('../utilities/waits');

class TasksPage extends BasePage {
  async load() {
    await this.navigate('/tasks');
    await this.waitFor('tasks-tab-log', config.PAGE_LOAD_TIMEOUT);
  }

  async switchTab(tabName) {
    await this.click(`tasks-tab-${tabName}`);
    await this.sleep(500);
  }

  async logTask(name, category = '') {
    await this.switchTab('log');
    await this.type('tasks-name-input', name);
    if (category) await this.type('tasks-category-input', category);
    await this.click('tasks-log-button');
  }

  async clickQuickLog(taskSlug) {
    await this.click(`tasks-quicklog-${taskSlug}`);
  }

  async searchHistory(query) {
    await this.switchTab('history');
    await this.waitFor('tasks-search-input', config.BACKEND_TIMEOUT);
    await this.type('tasks-search-input', query);
    await this.sleep(600);
  }

  async waitForRows(minCount = 1) {
    await waitForElementCount(
      this.driver,
      '[data-testid^="tasks-row-"]',
      minCount,
      config.BACKEND_TIMEOUT
    );
  }

  async getRowCount() {
    const rows = await this.driver.findElements(By.css('[data-testid^="tasks-row-"]'));
    return rows.length;
  }

  async clickFilter(category) {
    const id = category === 'all' ? 'tasks-filter-all' : `tasks-filter-${category}`;
    await this.click(id);
    await this.sleep(400);
  }

  async getAvailableFilters() {
    const chips = await this.driver.findElements(By.css('[data-testid^="tasks-filter-"]'));
    const ids = [];
    for (const chip of chips) {
      const tid = await chip.getAttribute('data-testid');
      ids.push(tid);
    }
    return ids;
  }

  async startTimer(name, category = '') {
    await this.switchTab('timer');
    await this.type('tasks-timer-name-input', name);
    if (category) await this.type('tasks-timer-category-input', category);
    await this.click('tasks-timer-start-button');
  }

  async stopTimer() {
    await this.click('tasks-timer-stop-button');
  }
}

module.exports = TasksPage;
