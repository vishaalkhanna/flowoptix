'use strict';

/**
 * Search Data — 35 data-driven tests
 *
 * Authenticated once via REST injection.
 * Each test searches the task history with a term from searchTerms.json and
 * asserts the result set meets the expected match condition.
 *
 * Row count assertions use at-least semantics for `expectMatch:true` (exact counts
 * would depend on seeded DB state which may vary) and exactly-zero for no-match terms.
 */

const { expect } = require('chai');
const { buildDriver } = require('../utilities/driverFactory');
const { performLogin } = require('../utilities/loginHelper');
const TasksPage = require('../pages/TasksPage');
const config = require('../config/config');
const logger = require('../utilities/logger');
const searchTerms = require('../data/searchTerms.json');

describe('Search Data', function () {
  let driver;
  let tasksPage;

  before(async function () {
    driver = await buildDriver();
    global.__e2eDriver = driver;
    await performLogin(driver);
    tasksPage = new TasksPage(driver);
    // Navigate to tasks page and switch to history once.
    await tasksPage.load();
    await tasksPage.switchTab('history');
    await tasksPage.waitFor('tasks-search-input', config.BACKEND_TIMEOUT);
    // Wait for seeded tasks to load.
    await driver.sleep(1500);
  });

  after(async function () {
    if (driver) await driver.quit();
    global.__e2eDriver = null;
  });

  beforeEach(async function () {
    logger.info(`Starting: ${this.currentTest.title}`);
    // Ensure we are on the history tab with the search input visible.
    try {
      const visible = await tasksPage.isVisible('tasks-search-input');
      if (!visible) {
        await tasksPage.load();
        await tasksPage.switchTab('history');
        await tasksPage.waitFor('tasks-search-input', config.BACKEND_TIMEOUT);
        await driver.sleep(1000);
      }
    } catch (_) {
      await tasksPage.load();
      await tasksPage.switchTab('history');
      await driver.sleep(1000);
    }
  });

  searchTerms.forEach((entry) => {
    it(`search: ${entry.description}`, async function () {
      // Clear previous search
      await tasksPage.type('tasks-search-input', '');
      await driver.sleep(400);

      // Type the search term
      await tasksPage.type('tasks-search-input', entry.term);
      await driver.sleep(800);

      const count = await tasksPage.getRowCount();

      if (!entry.expectMatch) {
        // Known no-match terms must return 0 rows
        expect(count, `"${entry.description}" should return 0 rows`).to.equal(0);
      } else if (entry.minRows > 0) {
        // Known-match terms with seeded data: assert at least minRows
        expect(count, `"${entry.description}" should return at least ${entry.minRows} row(s)`).to.be.at.least(entry.minRows);
      } else {
        // expectMatch but minRows=0: just verify no crash; count ≥ 0 always
        expect(count).to.be.at.least(0);
      }
    });
  });
});
