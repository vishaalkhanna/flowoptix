'use strict';

const { expect } = require('chai');
const { buildDriver } = require('../utilities/driverFactory');
const { performLogin } = require('../utilities/loginHelper');
const config = require('../config/config');
const logger = require('../utilities/logger');

describe('Navigation', function () {
  let driver;

  before(async function () {
    driver = await buildDriver();
    global.__e2eDriver = driver;
    await performLogin(driver);
  });

  after(async function () {
    if (driver) await driver.quit();
    global.__e2eDriver = null;
  });

  beforeEach(async function () {
    logger.info(`Starting: ${this.currentTest.title}`);
  });

  const tabs = [
    { id: 'tab-dashboard', urlFragment: '/', label: 'Dashboard' },
    { id: 'tab-tasks',     urlFragment: 'tasks',   label: 'Tasks' },
    { id: 'tab-patterns',  urlFragment: 'patterns', label: 'Patterns' },
    { id: 'tab-automate',  urlFragment: 'automate', label: 'Automations' },
    { id: 'tab-chat',      urlFragment: 'chat',     label: 'Chat' },
    { id: 'tab-profile',   urlFragment: 'profile',  label: 'Profile' },
  ];

  for (const tab of tabs) {
    it(`should navigate to ${tab.label} by clicking the tab`, async function () {
      // Navigate to dashboard first to have a consistent start state
      await driver.get(config.BASE_URL + '/');
      // Wait for tab bar
      await driver.wait(async () => {
        const els = await driver.findElements(
          require('selenium-webdriver').By.css(`[data-testid="${tab.id}"]`)
        );
        return els.length > 0;
      }, config.ELEMENT_TIMEOUT);

      const tabEl = await driver.findElement(
        require('selenium-webdriver').By.css(`[data-testid="${tab.id}"]`)
      );
      await tabEl.click();
      await driver.sleep(1000);

      const url = await driver.getCurrentUrl();
      if (tab.urlFragment === '/') {
        // Dashboard: URL should end with / or be the base
        expect(url).to.satisfy((u) => u === config.BASE_URL + '/' || u === config.BASE_URL, `Expected dashboard URL, got ${url}`);
      } else {
        expect(url).to.include(tab.urlFragment);
      }
    });
  }

  it('should support browser back navigation between tabs', async function () {
    await driver.get(config.BASE_URL + '/tasks');
    await driver.sleep(800);
    await driver.get(config.BASE_URL + '/patterns');
    await driver.sleep(800);
    await driver.navigate().back();
    await driver.sleep(800);
    const url = await driver.getCurrentUrl();
    expect(url).to.include('tasks');
  });

  it('should survive a hard page refresh and remain on the same screen', async function () {
    await driver.get(config.BASE_URL + '/tasks');
    await driver.sleep(500);
    await driver.navigate().refresh();
    // Wait for page to reload
    await driver.wait(async () => {
      const els = await driver.findElements(
        require('selenium-webdriver').By.css('[data-testid="tasks-tab-log"]')
      );
      return els.length > 0;
    }, config.PAGE_LOAD_TIMEOUT);
    const url = await driver.getCurrentUrl();
    expect(url).to.include('tasks');
  });
});
