/**
 * Minimal logger wrapper.
 *
 * Kept centralized so a real logging library (pino/winston) can be
 * swapped in later without touching call sites across the codebase.
 */
const env = require('../config/env');

const timestamp = () => new Date().toISOString();

const logger = {
  info: (...args) => console.log(`[${timestamp()}] [INFO]`, ...args),
  warn: (...args) => console.warn(`[${timestamp()}] [WARN]`, ...args),
  error: (...args) => console.error(`[${timestamp()}] [ERROR]`, ...args),
  debug: (...args) => {
    if (!env.isProduction && !env.isTest) {
      console.debug(`[${timestamp()}] [DEBUG]`, ...args);
    }
  },
};

module.exports = logger;
