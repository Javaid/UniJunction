const { isDatabaseHealthy } = require('../config/database');

/**
 * Aggregates liveness signals for GET /api/health. Deliberately returns
 * only a boolean-derived status string — never host, credentials, or
 * the underlying error — so the health endpoint can stay public without
 * leaking infrastructure details.
 */
const getSystemHealth = async () => {
  const databaseOk = await isDatabaseHealthy();

  return {
    healthy: databaseOk,
    api: 'ok',
    database: databaseOk ? 'ok' : 'error',
  };
};

module.exports = { getSystemHealth };
