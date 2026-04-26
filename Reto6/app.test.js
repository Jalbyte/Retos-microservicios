const request = require('supertest');
const { createApp } = require('./app');

describe('Reto6 Express API', () => {
  const app = createApp();

  it('GET /health devuelve estado ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/greet/:name devuelve saludo', async () => {
    const res = await request(app).get('/api/greet/Camilo');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('Camilo');
  });
});
