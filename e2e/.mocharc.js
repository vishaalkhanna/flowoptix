'use strict';

module.exports = {
  require: ['dotenv/config', './utilities/rootHooks.js'],
  spec: [
    // Core suite (49 existing tests — unchanged)
    'tests/auth.test.js',
    'tests/navigation.test.js',       // expanded to 36 (6 tabs × 6 methods)
    'tests/tasks.test.js',
    'tests/chat.test.js',
    'tests/profile.test.js',
    'tests/ui.test.js',               // expanded to ~35 (element inventory)

    // Data-driven suites (180 new parameterised tests)
    'tests/emailValidation.test.js',   // 45 — email format edge cases
    'tests/passwordValidation.test.js',// 30 — password field edge cases
    'tests/taskData.test.js',          // 50 — task-name edge cases (auth)
    'tests/searchData.test.js',        // 35 — history search edge cases (auth)
    'tests/categoryFilter.test.js',    // 20 — category filter chips (auth)
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
