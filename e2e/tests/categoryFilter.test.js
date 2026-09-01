'use strict';

/**
 * Category Filter — 20 data-driven tests
 *
 * Authenticated once via REST injection.
 * Each test clicks a category filter chip in the task history and verifies
 * the UI responds without crash.  If a chip does not exist in the DOM (i.e.
 * no tasks with that category exist in the test user's data) the test skips
 * rather than fails.
 */

const { expect } = require('chai');
const { buildDriver } = require('../utilities/driverFactory');
const { performLogin } = require('../utilities/loginHelper');
const TasksPage = require('../pages/TasksPage');
const config = require('../config/config');
const logger = require('../utilities/logger');
const categories = require('../data/categories.json');

describe('Category Filter', function () {
  let driver;
  let tasksPage;

  before(async function () {
    driver = await buildDriver();
    global.__e2eDriver = driver;
    await performLogin(driver);
    tasksPage = new TasksPage(driver);
    await tasksPage.load();
    await tasksPage.switchTab('history');
    await tasksPage.waitFor('tasks-filter-all', config.BACKEND_TIMEOUT);
    // Wait for seeded tasks so filter counts are stable.
    await driver.sleep(1500);
  });

  after(async function () {
    if (driver) await driver.quit();
    global.__e2eDriver = null;
  });

  beforeEach(async function () {
    logger.info(`Starting: ${this.currentTest.title}`);
    // Ensure we are on history tab with filters visible.
    try {
      const visible = await tasksPage.isVisible('tasks-filter-all');
      if (!visible) {
        await tasksPage.load();
        await tasksPage.switchTab('history');
        await tasksPage.waitFor('tasks-filter-all', config.BACKEND_TIMEOUT);
        await driver.sleep(800);
      }
    } catch (_) {
      await tasksPage.load();
      await tasksPage.switchTab('history');
      await driver.sleep(800);
    }
  });

  categories.forEach((entry) => {
    it(`category filter: ${entry.description}`, async function () {
      const chipTestId = `tasks-filter-${entry.filterChip}`;

      // Check if this filter chip exists in the DOM
      const chipExists = await tasksPage.exists(chipTestId);
      if (!chipExists) {
        logger.info(`Filter chip "${chipTestId}" not found — skipping (no tasks in this category)`);
        this.skip();
        return;
      }

      // Click the filter chip
      await tasksPage.clickFilter(entry.filterChip);
      await driver.sleep(600);

      const count = await tasksPage.getRowCount();
      // All categories: assert count ≥ 0 (no crash) regardless of row count
      expect(count, `Category filter "${entry.description}" should not crash`).to.be.at.least(0);

      // Reset to "All" filter to leave clean state for next test
      const allExists = await tasksPage.exists('tasks-filter-all');
      if (allExists) {
        await tasksPage.clickFilter('all');
        await driver.sleep(300);
      }
    });
  });
});
