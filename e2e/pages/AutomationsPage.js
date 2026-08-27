'use strict';

const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');
const config = require('../config/config');

class AutomationsPage extends BasePage {
  async load() {
    await this.navigate('/automate');
    await this.waitFor('automations-add-rule-button', config.PAGE_LOAD_TIMEOUT);
  }

  async clickAddRule() {
    await this.click('automations-add-rule-button');
    await this.waitFor('automations-rule-name-input', config.ELEMENT_TIMEOUT);
  }

  async fillRuleForm(name, trigger) {
    await this.type('automations-rule-name-input', name);
    await this.type('automations-rule-trigger-input', trigger);
  }

  async saveRule() {
    await this.click('automations-save-rule-button');
    await this.sleep(1000);
  }

  async getRuleCount() {
    const rules = await this.driver.findElements(By.css('[data-testid^="automations-rule-"]'));
    return rules.length;
  }

  async clickQuickAction(action) {
    await this.click(`automations-action-${action}`);
  }
}

module.exports = AutomationsPage;
