'use strict';
require('dotenv').config();
const { buildDriver } = require('./utilities/driverFactory');
const config = require('./config/config');

(async () => {
  const driver = await buildDriver();
  try {
    console.log('→ GET /');
    await driver.get(config.BASE_URL + '/');
    await driver.executeScript('localStorage.clear(); sessionStorage.clear();');
    console.log('   storage cleared');

    console.log('→ GET / (clean session)');
    await driver.get(config.BASE_URL + '/');

    await driver.wait(async () => {
      const u = await driver.getCurrentUrl();
      return u.includes('/login') || !u.includes(config.BASE_URL);
    }, 30000);

    const url = await driver.getCurrentUrl();
    console.log('   URL after wait:', url);

    await driver.sleep(5000); // let animations finish

    const source = await driver.getPageSource();
    console.log('   source len:', source.length);
    console.log('   has login-password-nav-button:', source.includes('login-password-nav-button'));
    console.log('   has login-google-button:', source.includes('login-google-button'));
    console.log('   has data-testid:', source.includes('data-testid'));

    // Print JS bundle url from source
    const m = source.match(/entry-[a-f0-9]+\.js/);
    console.log('   JS bundle hash:', m ? m[0] : 'not found');

    if (!source.includes('login-password-nav-button')) {
      // find what data-testid attrs exist
      const matches = [...source.matchAll(/data-testid="([^"]+)"/g)].map(m => m[1]);
      console.log('   existing data-testid attrs:', matches.slice(0, 20));
    }
  } finally {
    await driver.quit();
  }
})().catch(e => { console.error(e); process.exit(1); });
