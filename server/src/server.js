const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');

const start = async () => {
  try {
    if (!env.jwt.accessSecret && !env.isTest) {
      throw new Error(
        'JWT_ACCESS_SECRET is not set. Refusing to start with an empty JWT signing secret.'
      );
    }

    await connectDatabase();

    app.listen(env.port, () => {
      logger.info(`Academic Connect API listening on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (error) {
    logger.error('Failed to start Academic Connect API:', error.message);
    process.exit(1);
  }
};

start();
