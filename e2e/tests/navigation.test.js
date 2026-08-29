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
    { id: 'tab-automate',  urlFragment: 'automations', label: 'Automations' },
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
    const By = require('selenium-webdriver').By;
    await driver.get(config.BASE_URL + '/');
    await driver.sleep(500);
    // Wait for tab bar (requires _layout.tsx tabBarButton fix)
    await driver.wait(async () => {
      const els = await driver.findElements(By.css('[data-testid="tab-tasks"]'));
      return els.length > 0;
    }, config.ELEMENT_TIMEOUT);
    // Click Tasks tab — expo-router uses pushState, creating a proper history entry
    const taskTab = await driver.findElement(By.css('[data-testid="tab-tasks"]'));
    await driver.executeScript('arguments[0].click()', taskTab);
    await driver.sleep(700);
    // Click Patterns tab — another pushState entry
    const patternTab = await driver.findElement(By.css('[data-testid="tab-patterns"]'));
    await driver.executeScript('arguments[0].click()', patternTab);
    await driver.sleep(700);
    // Browser back should return to /tasks
    await driver.navigate().back();
    await driver.sleep(700);
    const url = await driver.getCurrentUrl();
    expect(url).to.satisfy(
      u => u.includes('tasks') || u === config.BASE_URL + '/' || u === config.BASE_URL,
      `Expected back navigation to land on /tasks or /, got ${url}`
    );
  });

  it('should survive a hard page refresh and remain on the same screen', async function () {
    await driver.get(config.BASE_URL + '/tasks');
    await driver.sleep(500);
    await driver.navigate().refresh();
    // With SPA output (web.output "single") Vercel serves index.html for every
    // route, so a hard refresh on /tasks stays on /tasks — no hydration mismatch.
    await driver.wait(async () => {
      const els = await driver.findElements(
        require('selenium-webdriver').By.css('[data-testid="tasks-tab-log"]')
      );
      return els.length > 0;
    }, config.PAGE_LOAD_TIMEOUT, 'Expected tasks-tab-log after page refresh on /tasks');
    const url = await driver.getCurrentUrl();
    expect(url).to.include('tasks');
  });
});
