require('./tracing');
const logger = require('./logger');
const express = require('express');
const { metricsMiddleware, metricsEndpoint } = require('./metrics');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(metricsMiddleware);

  // ─── Metrics (Prometheus) ───────────────────────────────────────────────────
  app.get('/metrics', metricsEndpoint);

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
