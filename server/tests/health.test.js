const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns success status and message', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Academic Connect API is running',
    });
  });
});

describe('Unknown route', () => {
  it('returns a 404 with a consistent shape', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
