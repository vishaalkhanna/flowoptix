'use strict';

const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');
const config = require('../config/config');
const { waitForElementCount } = require('../utilities/waits');

class ChatPage extends BasePage {
  async load() {
    await this.navigate('/chat');
    await this.waitFor('chat-input', config.PAGE_LOAD_TIMEOUT);
  }

  async sendMessage(text) {
    await this.type('chat-input', text);
    await this.click('chat-send-button');
  }

  async waitForMessages(minCount = 1) {
    await waitForElementCount(
      this.driver,
      '[data-testid^="chat-message-"]',
      minCount,
      config.BACKEND_TIMEOUT
    );
  }

  async getMessageCount() {
    const msgs = await this.driver.findElements(By.css('[data-testid^="chat-message-"]'));
    return msgs.length;
  }

  async getSuggestionCount() {
    const chips = await this.driver.findElements(By.css('[data-testid^="chat-suggestion-"]'));
    return chips.length;
  }

  async clickSuggestion(index = 0) {
    await this.click(`chat-suggestion-${index}`);
  }
}

module.exports = ChatPage;
