const client = require('prom-client');

// Registry único para el microservicio
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Histograma para duración de peticiones HTTP
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});
register.registerMetric(httpRequestDurationSeconds);

/**
 * Middleware para registrar métricas de Prometheus
 */
const metricsMiddleware = (req, res, next) => {
  // Ignorar peticiones a /metrics y /health
  if (req.path === '/metrics' || req.path === '/health') {
    return next();
  }

  const start = process.hrtime();
  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;
    
    // Extraer la ruta (usando req.route.path si está disponible para agrupar variables)
    const route = req.baseUrl + (req.route ? req.route.path : req.path);
    
    httpRequestDurationSeconds
      .labels(req.method, route, res.statusCode)
      .observe(durationInSeconds);
  });
  next();
};

/**
 * Endpoint /metrics
 */
const metricsEndpoint = async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  register
};
