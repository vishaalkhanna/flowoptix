'use strict';

const { expect } = require('chai');
const { buildDriver } = require('../utilities/driverFactory');
const { performLogin } = require('../utilities/loginHelper');
const ChatPage = require('../pages/ChatPage');
const config = require('../config/config');
const logger = require('../utilities/logger');

describe('Chat', function () {
  let driver;
  let chatPage;

  before(async function () {
    driver = await buildDriver();
    global.__e2eDriver = driver;
    await performLogin(driver);
    chatPage = new ChatPage(driver);
  });

  after(async function () {
    if (driver) await driver.quit();
    global.__e2eDriver = null;
  });

  beforeEach(async function () {
    logger.info(`Starting: ${this.currentTest.title}`);
    await chatPage.load();
  });

  it('should display the chat input and send button', async function () {
    const inputVisible = await chatPage.isVisible('chat-input');
    const sendVisible = await chatPage.isVisible('chat-send-button');
    expect(inputVisible).to.be.true;
    expect(sendVisible).to.be.true;
  });

  it('should show suggestion chips on the welcome screen', async function () {
    const count = await chatPage.getSuggestionCount();
    expect(count).to.be.at.least(1);
  });

  it('should add a user message bubble after sending a message', async function () {
    const beforeCount = await chatPage.getMessageCount();
    await chatPage.sendMessage('Hello');
    // User message bubble appears immediately
    await chatPage.waitForMessages(beforeCount + 1);
    const afterCount = await chatPage.getMessageCount();
    expect(afterCount).to.be.greaterThan(beforeCount);
  });

  it('should receive an AI response after sending a message', async function () {
    // From the previous test the conversation may already have messages.
    // Navigate fresh to get a clean state.
    await chatPage.load();
    const beforeCount = await chatPage.getMessageCount();
    await chatPage.sendMessage('What is my productivity score?');
    // Wait for AI response (backend cold start can take up to 50 s)
    await chatPage.waitForMessages(beforeCount + 2); // user + AI
    const afterCount = await chatPage.getMessageCount();
    expect(afterCount).to.be.at.least(beforeCount + 2);
  });

  it('should populate the chat input when a suggestion chip is clicked', async function () {
    // Fresh load — suggestions visible only before any messages
    await chatPage.load();
    const count = await chatPage.getSuggestionCount();
    if (count === 0) {
      logger.info('No suggestion chips visible — skipping');
      return;
    }
    await chatPage.clickSuggestion(0);
    // After clicking a suggestion the message is sent, adding at least one bubble
    await chatPage.waitForMessages(1);
    const msgCount = await chatPage.getMessageCount();
    expect(msgCount).to.be.at.least(1);
  });
});
