'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const screenshotsDir = path.join(__dirname, '..', 'screenshots');
const failuresDir = path.join(__dirname, '..', 'reports', 'failures');
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(failuresDir, { recursive: true });

function sanitise(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
}

async function takeScreenshot(driver, name, dir = screenshotsDir) {
  try {
    const data = await driver.takeScreenshot();
    const filename = `${sanitise(name)}_${Date.now()}.png`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, data, 'base64');
    logger.debug(`Screenshot saved: ${filepath}`);
    return filepath;
  } catch (err) {
    logger.error(`Failed to take screenshot "${name}": ${err.message}`);
    return null;
  }
}

async function captureFailure(driver, testTitle, error) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const base = sanitise(`FAIL_${testTitle}_${ts}`);

  const screenshotPath = await takeScreenshot(driver, base, failuresDir);

  let url = 'unknown';
  try { url = await driver.getCurrentUrl(); } catch (_) {}

  let consoleLogs = [];
  try {
    const entries = await driver.manage().logs().get('browser');
    consoleLogs = entries.map((e) => `[${e.level.name}] ${e.message}`);
  } catch (_) {}

  const report = {
    test: testTitle,
    timestamp: new Date().toISOString(),
    url,
    reason: error.message,
    stack: error.stack,
    screenshot: screenshotPath,
    consoleLogs,
  };

  const jsonPath = path.join(failuresDir, `${base}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  logger.error(`Failure report written: ${jsonPath}`);
  return report;
}

module.exports = { takeScreenshot, captureFailure };
