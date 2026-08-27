'use strict';

const path = require('path');
const os = require('os');
const { Builder, Browser } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const edge = require('selenium-webdriver/edge');
const firefox = require('selenium-webdriver/firefox');
const config = require('../config/config');
const logger = require('./logger');

async function buildDriver() {
  const browser = config.BROWSER;
  const headless = config.HEADLESS;
  logger.info(`Building driver: browser=${browser} headless=${headless}`);

  // Unique temp profile dir so every run starts with clean localStorage/cookies
  const tmpProfile = path.join(os.tmpdir(), `se-chrome-${Date.now()}`);

  let driver;

  if (browser === 'chrome') {
    const opts = new chrome.Options();
    if (headless) opts.addArguments('--headless=new');
    opts.addArguments(
      `--user-data-dir=${tmpProfile}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
      '--disable-popup-blocking',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-translate',
      '--remote-allow-origins=*'
    );
    driver = await new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(opts)
      .build();

  } else if (browser === 'edge') {
    const opts = new edge.Options();
    if (headless) opts.addArguments('--headless=new');
    opts.addArguments(
      `--user-data-dir=${tmpProfile}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
      '--disable-popup-blocking',
      '--no-first-run'
    );
    driver = await new Builder()
      .forBrowser(Browser.EDGE)
      .setEdgeOptions(opts)
      .build();

  } else if (browser === 'firefox') {
    const opts = new firefox.Options();
    if (headless) opts.addArguments('--headless');
    opts.setPreference('dom.webnotifications.enabled', false);
    driver = await new Builder()
      .forBrowser(Browser.FIREFOX)
      .setFirefoxOptions(opts)
      .build();

  } else {
    throw new Error(`Unknown browser: ${browser}. Use chrome, edge, or firefox.`);
  }

  await driver.manage().setTimeouts({
    implicit: 0,
    pageLoad: config.PAGE_LOAD_TIMEOUT,
    script: config.BACKEND_TIMEOUT,
  });

  logger.info('Driver built successfully');
  return driver;
}

module.exports = { buildDriver };
