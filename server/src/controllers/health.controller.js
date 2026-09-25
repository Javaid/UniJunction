const { getSystemHealth } = require('../services/health.service');

const getHealth = async (req, res) => {
  const { healthy, api, database } = await getSystemHealth();

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    api,
    database,
  });
};

module.exports = { getHealth };
