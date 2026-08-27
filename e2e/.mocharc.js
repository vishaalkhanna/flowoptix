'use strict';

module.exports = {
  require: ['dotenv/config', './utilities/rootHooks.js'],
  spec: [
    'tests/auth.test.js',
    'tests/navigation.test.js',
    'tests/tasks.test.js',
    'tests/chat.test.js',
    'tests/profile.test.js',
    'tests/ui.test.js',
  ],
  timeout: 90000,
  slow: 30000,
  reporter: 'mochawesome',
  reporterOptions: [
    'reportDir=reports',
    'reportFilename=e2e-report',
    'overwrite=false',
    'html=true',
    'json=true',
    'quiet=true',
  ].join(','),
};
