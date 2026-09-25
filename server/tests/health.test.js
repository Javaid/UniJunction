const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');

afterAll(() => sequelize.close());

describe('GET /api/health', () => {
  it('reports API status and a database connectivity indicator', async () => {
    // No live database is assumed for this test — see
    // docs/database-guidelines.md for the dedicated MySQL connection
    // test, which is the one that requires a reachable database.
    const res = await request(app).get('/api/health');

    expect([200, 503]).toContain(res.statusCode);
    expect(res.body.api).toBe('ok');
    expect(['ok', 'error']).toContain(res.body.database);
    expect(res.body.success).toBe(res.body.database === 'ok');
  });
});

describe('Unknown route', () => {
  it('returns a 404 with a consistent shape', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
