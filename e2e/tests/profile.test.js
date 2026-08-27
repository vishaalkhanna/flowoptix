'use strict';

const { expect } = require('chai');
const { buildDriver } = require('../utilities/driverFactory');
const { performLogin } = require('../utilities/loginHelper');
const ProfilePage = require('../pages/ProfilePage');
const config = require('../config/config');
const logger = require('../utilities/logger');

describe('Profile', function () {
  let driver;
  let profilePage;

  before(async function () {
    driver = await buildDriver();
    global.__e2eDriver = driver;
    await performLogin(driver);
    profilePage = new ProfilePage(driver);
  });

  after(async function () {
    if (driver) await driver.quit();
    global.__e2eDriver = null;
  });

  beforeEach(async function () {
    logger.info(`Starting: ${this.currentTest.title}`);
    await profilePage.load();
  });

  it('should display the sign-out button', async function () {
    const visible = await profilePage.isSignOutVisible();
    expect(visible).to.be.true;
  });

  it('should display the dark mode switch', async function () {
    const visible = await profilePage.isVisible('profile-dark-mode-switch');
    expect(visible).to.be.true;
  });

  it('should display the edit name button', async function () {
    const visible = await profilePage.isVisible('profile-edit-name-button');
    expect(visible).to.be.true;
  });

  it('should enter name-edit mode when the edit button is clicked', async function () {
    await profilePage.clickEditName();
    const inputVisible = await profilePage.isVisible('profile-name-input');
    const saveVisible = await profilePage.isVisible('profile-save-name-button');
    const cancelVisible = await profilePage.isVisible('profile-cancel-name-button');
    expect(inputVisible).to.be.true;
    expect(saveVisible).to.be.true;
    expect(cancelVisible).to.be.true;
  });

  it('should cancel name editing without saving', async function () {
    await profilePage.clickEditName();
    await profilePage.cancelEdit();
    await driver.sleep(500);
    const inputStillVisible = await profilePage.isVisible('profile-name-input');
    expect(inputStillVisible).to.be.false;
  });

  it('should toggle dark mode without crashing', async function () {
    await profilePage.toggleDarkMode();
    // Toggle back
    await profilePage.toggleDarkMode();
    // No assertion needed — test passes if no exception thrown
    expect(true).to.be.true;
  });

  it('should display the export-tasks button', async function () {
    const visible = await profilePage.isVisible('profile-export-tasks-button');
    expect(visible).to.be.true;
  });

  it('should display the export-patterns button', async function () {
    const visible = await profilePage.isVisible('profile-export-patterns-button');
    expect(visible).to.be.true;
  });

  it('should display integration connect buttons', async function () {
    // At least one integration button should be present
    const gmailConnectVisible = await profilePage.isVisible('profile-gmail-connect-button');
    const calendarConnectVisible = await profilePage.isVisible('profile-calendar-connect-button');
    const gmailAnalyseVisible = await profilePage.isVisible('profile-gmail-analyse-button');
    const calendarAnalyseVisible = await profilePage.isVisible('profile-calendar-analyse-button');
    // One of connect or analyse should be present (depends on connection state)
    const anyGmail = gmailConnectVisible || gmailAnalyseVisible;
    const anyCalendar = calendarConnectVisible || calendarAnalyseVisible;
    expect(anyGmail).to.be.true;
    expect(anyCalendar).to.be.true;
  });
});
