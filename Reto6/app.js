require('./tracing');
const logger = require('./logger');
const express = require('express');
const client = require('prom-client');

function createApp() {
  const app = express();
  app.use(express.json());

  // ─── Metrics (Prometheus) ───────────────────────────────────────────────────
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'reto6-express-service' });
  });

  app.get('/api/greet/:name', (req, res) => {
    const { name } = req.params;
    res.status(200).json({ message: `Hola ${name}, CI activo` });
  });

  return app;
}

module.exports = { createApp };
