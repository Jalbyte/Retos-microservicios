const express = require('express');

function createApp() {
  const app = express();
  app.use(express.json());

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
