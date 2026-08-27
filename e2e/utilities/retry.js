'use strict';

const logger = require('./logger');

async function withRetry(fn, { attempts = 2, delayMs = 2000, label = 'operation' } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      logger.warn(`${label} failed (attempt ${i}/${attempts}): ${err.message}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

module.exports = { withRetry };
