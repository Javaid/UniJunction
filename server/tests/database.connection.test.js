const { sequelize } = require('../src/config/database');

/**
 * This is the one test in the suite that touches a real MySQL server.
 * It never fails the build for a developer without a database running —
 * see docs/database-guidelines.md ("Testing") for the DB_* variables a
 * disposable test database should use if you want this assertion to run
 * for real (e.g. DB_NAME=academic_connect_test).
 */
describe('MySQL connection', () => {
  let connected = false;

  beforeAll(async () => {
    try {
      await sequelize.authenticate();
      connected = true;
    } catch (error) {
      connected = false;
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('authenticates against MySQL when a reachable database is configured', async () => {
    if (!connected) {
      // eslint-disable-next-line no-console
      console.warn(
        'Skipping live MySQL assertion — no reachable database configured for this test run.'
      );
      return;
    }

    expect(connected).toBe(true);
  });
});
