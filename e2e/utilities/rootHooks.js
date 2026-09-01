'use strict';

const reporter = require('./excelReporter');
const { captureFailure } = require('./screenshots');
const logger = require('./logger');

// Tracks the active driver per suite so the hook can capture failures.
global.__e2eDriver = null;
// Tracks test start time; set in beforeEach, consumed in afterEach.
global.__e2eTestStart = null;
// Last captured screenshot path and URL (populated on failure).
global.__e2eLastScreenshotPath = '';
global.__e2eLastUrl = '';

exports.mochaHooks = {
  beforeEach() {
    global.__e2eTestStart = new Date();
    global.__e2eLastScreenshotPath = '';
    global.__e2eLastUrl = '';
  },

  async afterEach() {
    const test = this.currentTest;
    if (!test) return;

    const suite    = test.parent ? test.parent.title : 'Unknown';
    const status   = test.state === 'passed' ? 'PASS' : test.state === 'failed' ? 'FAIL' : 'SKIP';
    const duration = test.duration || 0;
    const browser  = process.env.BROWSER || 'chrome';

    // Capture URL and screenshot path on failure.
    if (status === 'FAIL' && global.__e2eDriver) {
      try {
        global.__e2eLastUrl = await global.__e2eDriver.getCurrentUrl();
      } catch (_) {}
      try {
        const screenshotResult = await captureFailure(global.__e2eDriver, test.title, test.err);
        if (screenshotResult && screenshotResult.path) {
          global.__e2eLastScreenshotPath = screenshotResult.path;
        }
      } catch (e) {
        logger.warn(`Could not capture failure screenshot: ${e.message}`);
      }
    }

    reporter.record(suite, test.title, status, duration, test.err || null, {
      browser,
      startTime:      global.__e2eTestStart,
      endTime:        new Date(),
      screenshotPath: global.__e2eLastScreenshotPath,
      url:            global.__e2eLastUrl,
    });
  },

  async afterAll() {
    try {
      const filepath = await reporter.write();
      logger.info(`\n========================================`);
      logger.info(`Excel report: ${filepath}`);
      logger.info(`========================================\n`);
    } catch (err) {
      logger.error(`Failed to write Excel report: ${err.message}`);
    }
  },
};
