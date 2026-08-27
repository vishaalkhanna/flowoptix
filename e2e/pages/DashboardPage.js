'use strict';

const BasePage = require('./BasePage');
const config = require('../config/config');

class DashboardPage extends BasePage {
  async load() {
    await this.navigate('/');
    await this.waitForTabBar(config.PAGE_LOAD_TIMEOUT);
  }

  async clickRefresh() {
    await this.click('dashboard-refresh-button');
  }

  async isLoaded() {
    return this.exists('dashboard-refresh-button');
  }
}

module.exports = DashboardPage;
