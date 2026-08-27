'use strict';

const reporter = require('./excelReporter');
const { captureFailure } = require('./screenshots');
const logger = require('./logger');

// Tracks the active driver per suite so the hook can capture failures
global.__e2eDriver = null;

exports.mochaHooks = {
  async afterEach() {
    const test = this.currentTest;
    if (!test) return;

    const suite = test.parent ? test.parent.title : 'Unknown';
    const status = test.state === 'passed' ? 'PASS' : test.state === 'failed' ? 'FAIL' : 'SKIP';
    const duration = test.duration || 0;

    reporter.record(suite, test.title, status, duration, test.err || null);

    if (status === 'FAIL' && global.__e2eDriver) {
      try {
        await captureFailure(global.__e2eDriver, test.title, test.err);
      } catch (e) {
        logger.warn(`Could not capture failure screenshot: ${e.message}`);
      }
    }
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
