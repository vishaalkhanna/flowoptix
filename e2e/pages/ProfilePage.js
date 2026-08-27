'use strict';

const BasePage = require('./BasePage');
const config = require('../config/config');

class ProfilePage extends BasePage {
  async load() {
    await this.navigate('/profile');
    await this.waitFor('profile-signout-button', config.PAGE_LOAD_TIMEOUT);
  }

  async signOut() {
    await this.click('profile-signout-button');
    // Wait for redirect to login page
    await this.driver.wait(async () => {
      const url = await this.getCurrentUrl();
      return url.includes('/login');
    }, config.PAGE_LOAD_TIMEOUT);
  }

  async clickEditName() {
    await this.click('profile-edit-name-button');
    await this.waitFor('profile-name-input');
  }

  async saveName(newName) {
    await this.type('profile-name-input', newName);
    await this.click('profile-save-name-button');
    await this.sleep(1000);
  }

  async cancelEdit() {
    await this.click('profile-cancel-name-button');
  }

  async toggleDarkMode() {
    await this.click('profile-dark-mode-switch');
    await this.sleep(300);
  }

  async clickExportTasks() {
    await this.click('profile-export-tasks-button');
  }

  async clickExportPatterns() {
    await this.click('profile-export-patterns-button');
  }

  async isSignOutVisible() {
    return this.isVisible('profile-signout-button');
  }
}

module.exports = ProfilePage;
