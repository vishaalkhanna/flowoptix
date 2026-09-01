'use strict';

/**
 * UI Inventory — ~35 tests
 *
 * Asserts that every element listed in TESTIDS.md is present and visible on
 * its respective page.  One it() per element; elements that only appear after
 * an interaction (modal contents, edit mode) declare an action to perform first.
 *
 * Optional elements (integration buttons whose visibility depends on connection
 * state) are skipped gracefully when absent.
 *
 * Authenticated once via REST injection; the loginPage tests use a separate
 * describe block that clears + restores the session.
 */

const { expect } = require('chai');
const { By } = require('selenium-webdriver');
const { buildDriver } = require('../utilities/driverFactory');
const { performLogin } = require('../utilities/loginHelper');
const { clearStorage } = require('../utilities/waits');
const config = require('../config/config');
const logger = require('../utilities/logger');

// ── Element inventory ────────────────────────────────────────────────────────

const ELEMENTS = [
  // ── Tab bar (visible on every authenticated page) ─────────────────────────
  { page: '/',            testId: 'tab-dashboard',              action: null,                       label: 'Tab bar — dashboard tab'               },
  { page: '/',            testId: 'tab-tasks',                   action: null,                       label: 'Tab bar — tasks tab'                   },
  { page: '/',            testId: 'tab-patterns',                action: null,                       label: 'Tab bar — patterns tab'                },
  { page: '/',            testId: 'tab-automate',                action: null,                       label: 'Tab bar — automations tab'             },
  { page: '/',            testId: 'tab-chat',                    action: null,                       label: 'Tab bar — chat tab'                    },
  { page: '/',            testId: 'tab-profile',                 action: null,                       label: 'Tab bar — profile tab'                 },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  { page: '/',            testId: 'dashboard-refresh-button',    action: null,                       label: 'Dashboard — refresh button',            optional: true },

  // ── Tasks — log tab ───────────────────────────────────────────────────────
  { page: '/tasks',       testId: 'tasks-tab-log',               action: null,                       label: 'Tasks — log tab switcher'              },
  { page: '/tasks',       testId: 'tasks-tab-timer',             action: null,                       label: 'Tasks — timer tab switcher'            },
  { page: '/tasks',       testId: 'tasks-tab-history',           action: null,                       label: 'Tasks — history tab switcher'          },
  { page: '/tasks',       testId: 'tasks-name-input',            action: null,                       label: 'Tasks — task name input'               },
  { page: '/tasks',       testId: 'tasks-log-button',            action: null,                       label: 'Tasks — log button'                    },
  { page: '/tasks',       testId: 'tasks-quicklog-send-email',   action: null,                       label: 'Tasks — quick-log Send Email'          },
  { page: '/tasks',       testId: 'tasks-quicklog-join-meeting', action: null,                       label: 'Tasks — quick-log Join Meeting'        },

  // ── Tasks — history tab ───────────────────────────────────────────────────
  { page: '/tasks',       testId: 'tasks-search-input',          action: 'click:tasks-tab-history',  label: 'Tasks — history search input'          },
  { page: '/tasks',       testId: 'tasks-filter-all',            action: 'click:tasks-tab-history',  label: 'Tasks — history filter All chip'       },

  // ── Tasks — timer tab ─────────────────────────────────────────────────────
  { page: '/tasks',       testId: 'tasks-timer-start-button',    action: 'click:tasks-tab-timer',    label: 'Tasks — timer start button'            },

  // ── Tasks — email modal ───────────────────────────────────────────────────
  { page: '/tasks',       testId: 'email-modal-close-button',    action: 'click:tasks-quicklog-send-email', label: 'Tasks — email modal close button' },

  // ── Patterns ──────────────────────────────────────────────────────────────
  { page: '/patterns',    testId: 'patterns-analyze-button',     action: null,                       label: 'Patterns — analyse button'             },

  // ── Automations ───────────────────────────────────────────────────────────
  { page: '/automations', testId: 'automations-add-rule-button', action: null,                       label: 'Automations — add rule button'         },
  { page: '/automations', testId: 'automations-rule-name-input', action: 'click:automations-add-rule-button', label: 'Automations — rule name input (modal)' },

  // ── Chat ──────────────────────────────────────────────────────────────────
  { page: '/chat',        testId: 'chat-input',                  action: null,                       label: 'Chat — message input'                  },
  { page: '/chat',        testId: 'chat-send-button',            action: null,                       label: 'Chat — send button'                    },

  // ── Profile — default state ───────────────────────────────────────────────
  { page: '/profile',     testId: 'profile-signout-button',        action: null,                     label: 'Profile — sign out button'             },
  { page: '/profile',     testId: 'profile-dark-mode-switch',      action: null,                     label: 'Profile — dark mode switch'            },
  { page: '/profile',     testId: 'profile-edit-name-button',      action: null,                     label: 'Profile — edit name button'            },
  { page: '/profile',     testId: 'profile-export-tasks-button',   action: null,                     label: 'Profile — export tasks button'         },
  { page: '/profile',     testId: 'profile-export-patterns-button', action: null,                    label: 'Profile — export patterns button'      },

  // ── Profile — name-edit mode ──────────────────────────────────────────────
  { page: '/profile',     testId: 'profile-name-input',            action: 'click:profile-edit-name-button', label: 'Profile — name input (edit mode)' },
  { page: '/profile',     testId: 'profile-save-name-button',      action: 'click:profile-edit-name-button', label: 'Profile — save name button (edit mode)' },
  { page: '/profile',     testId: 'profile-cancel-name-button',    action: 'click:profile-edit-name-button', label: 'Profile — cancel name button (edit mode)' },

  // ── Profile — integrations (optional: depend on connection state) ─────────
  { page: '/profile',     testId: 'profile-gmail-connect-button|profile-gmail-analyse-button',       action: null, label: 'Profile — Gmail integration button',    optional: true },
  { page: '/profile',     testId: 'profile-calendar-connect-button|profile-calendar-analyse-button', action: null, label: 'Profile — Calendar integration button', optional: true },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

// SPA tab-click map — keeps URL correct without triggering the auth guard on reload
const TAB_NAV = {
  '/':            'tab-dashboard',
  '/tasks':       'tab-tasks',
  '/patterns':    'tab-patterns',
  '/automations': 'tab-automate',
  '/chat':        'tab-chat',
  '/profile':     'tab-profile',
};

async function isAnyVisible(driver, testIdList) {
  for (const tid of testIdList) {
    const els = await driver.findElements(By.css(`[data-testid="${tid}"]`));
    if (!els.length) continue;
    try { if (await els[0].isDisplayed()) return true; } catch (_) {}
  }
  return false;
}

async function tryClickTestId(driver, testId) {
  try {
    const els = await driver.findElements(By.css(`[data-testid="${testId}"]`));
    if (!els.length) return;
    const visible = await els[0].isDisplayed().catch(() => false);
    if (!visible) return;
    await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', els[0]);
    await driver.sleep(100);
    await driver.executeScript('arguments[0].click()', els[0]);
    await driver.sleep(400);
  } catch (_) {}
}

async function spaNavigateTo(driver, page) {
  const tabId = TAB_NAV[page];
  if (tabId) {
    const tabEl = await driver.findElement(By.css(`[data-testid="${tabId}"]`));
    await driver.executeScript('arguments[0].click()', tabEl);
    await driver.sleep(800);
  } else {
    await driver.get(config.BASE_URL + page);
    await driver.sleep(1200);
  }
}

// Called after every navigation to clear any modal or in-page state left by
// a previous test, so each test begins from the page's default view.
async function resetPageState(driver, page) {
  if (page === '/tasks') {
    await tryClickTestId(driver, 'tasks-tab-log');
    await driver.sleep(200);
    await tryClickTestId(driver, 'email-modal-close-button');
    await driver.sleep(200);
  } else if (page === '/profile') {
    await tryClickTestId(driver, 'profile-cancel-name-button');
    await driver.sleep(200);
  } else if (page === '/automations') {
    try {
      await driver.executeScript(
        'document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))'
      );
      await driver.sleep(200);
    } catch (_) {}
  }
}

async function performAction(driver, action) {
  if (!action) return;
  if (action.startsWith('click:')) {
    const el = await driver.findElement(By.css(`[data-testid="${action.slice(6)}"]`));
    await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
    await driver.sleep(150);
    await driver.executeScript('arguments[0].click()', el);
    await driver.sleep(800);
  }
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('UI — Inventory', function () {
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

  for (const el of ELEMENTS) {
    it(el.label, async function () {
      // Navigate to the target page every time so each test is isolated from
      // prior in-page state (sub-tab position, open modals, edit mode, etc.).
      await spaNavigateTo(driver, el.page);

      // Clear any leftover modal / edit-mode state from a previous test.
      await resetPageState(driver, el.page);

      // Perform any prerequisite action (open a modal, switch a sub-tab).
      if (el.action) {
        await performAction(driver, el.action);
      }

      // Handle pipe-separated alternative testIds (optional elements)
      if (el.testId.includes('|')) {
        const ids = el.testId.split('|');
        if (el.optional) {
          const anyVisible = await isAnyVisible(driver, ids);
          if (!anyVisible) {
            logger.info(`Optional element not found: ${el.label} — skipping`);
            this.skip();
            return;
          }
          expect(anyVisible).to.be.true;
        } else {
          const anyVisible = await isAnyVisible(driver, ids);
          expect(anyVisible, `Expected one of [${ids.join(', ')}] to be visible: ${el.label}`).to.be.true;
        }
        return;
      }

      // Standard single testId check
      const els = await driver.findElements(By.css(`[data-testid="${el.testId}"]`));
      if (el.optional && !els.length) {
        logger.info(`Optional element absent: ${el.testId} — skipping`);
        this.skip();
        return;
      }
      expect(els.length, `Element "${el.testId}" not found in DOM: ${el.label}`).to.be.greaterThan(0);

      // Wait for visibility (allow for animations)
      let visible = false;
      for (let i = 0; i < 3; i++) {
        try { visible = await els[0].isDisplayed(); } catch (_) {}
        if (visible) break;
        await driver.sleep(300);
      }
      expect(visible, `Element "${el.testId}" exists but is not visible: ${el.label}`).to.be.true;
    });
  }
});

// ── Login page inventory (requires signed-out state) ─────────────────────────

describe('UI — Login Page Inventory', function () {
  let driver;

  before(async function () {
    driver = await buildDriver();
    global.__e2eDriver = driver;
    // Do NOT call performLogin — we need a fresh signed-out state.
  });

  after(async function () {
    if (driver) await driver.quit();
    global.__e2eDriver = null;
  });

  beforeEach(async function () {
    logger.info(`Starting: ${this.currentTest.title}`);
  });

  it('login page — google sign-in button', async function () {
    await driver.get(config.BASE_URL + '/');
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
    await driver.get(config.BASE_URL + '/');
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return url.includes('/login');
    }, config.PAGE_LOAD_TIMEOUT);
    await driver.sleep(2500);
    const els = await driver.findElements(By.css('[data-testid="login-google-button"]'));
    expect(els.length, 'login-google-button not found').to.be.greaterThan(0);
    expect(await els[0].isDisplayed()).to.be.true;
  });

  it('login page — password nav button', async function () {
    // Reuse existing session (still on login page from previous test)
    const els = await driver.findElements(By.css('[data-testid="login-password-nav-button"]'));
    expect(els.length, 'login-password-nav-button not found').to.be.greaterThan(0);
    expect(await els[0].isDisplayed()).to.be.true;
  });

  it('login page — email input (after clicking password nav)', async function () {
    const navBtn = await driver.findElement(By.css('[data-testid="login-password-nav-button"]'));
    await driver.executeScript('arguments[0].click()', navBtn);
    await driver.sleep(800);
    const els = await driver.findElements(By.css('[data-testid="login-email-input"]'));
    expect(els.length, 'login-email-input not found').to.be.greaterThan(0);
    expect(await els[0].isDisplayed()).to.be.true;
  });

  it('login page — password input (after clicking password nav)', async function () {
    const els = await driver.findElements(By.css('[data-testid="login-password-input"]'));
    expect(els.length, 'login-password-input not found').to.be.greaterThan(0);
    expect(await els[0].isDisplayed()).to.be.true;
  });

  it('login page — sign-in submit button (after clicking password nav)', async function () {
    const els = await driver.findElements(By.css('[data-testid="login-signin-button"]'));
    expect(els.length, 'login-signin-button not found').to.be.greaterThan(0);
    expect(await els[0].isDisplayed()).to.be.true;
  });
});
