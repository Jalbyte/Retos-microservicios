require('./tracing');
const logger = require('./logger');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { createServiceProxy } = require('./utils/proxy');
const client = require('prom-client');

const app = express();
app.use(express.json());
app.use(cors());

// =========================
// METRICS (PROMETHEUS)
// =========================
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Histograma para duración de peticiones HTTP
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});
register.registerMetric(httpRequestDurationMicroseconds);

// Middleware global para métricas
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;
    
    // Obtenemos la ruta del path original (evitando query params)
    const route = req.baseUrl + (req.route ? req.route.path : req.path);
    
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode)
      .observe(durationInSeconds);
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// =========================
// IMPORT ROUTES
// =========================
const empleadosRoutes = require('./routes/empleados');
const departamentosRoutes = require('./routes/departamentos');
const perfilesRoutes = require('./routes/perfiles');
const notificacionesRoutes = require('./routes/notificaciones');

// =========================
// ROOT / HEALTH CHECK
// =========================
app.get('/', (req, res) => {
  res.status(200).json({
    status: 200,
    message: 'API Gateway levantada y funcionando correctamente',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// =========================
// AUTH (API)
// =========================
app.use(
  '/auth',
  createServiceProxy('http://auth-service:3001')
);




// =========================
// SWAGGER (DOCUMENTACIÓN)
// =========================

// Auth
app.use(
  ['/docs/auth', '/docs/auth/*'],
  createProxyMiddleware({
    target: 'http://auth-service:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/docs/auth': '/docs',
    },
  })
);



// Empleados
app.use(
  ['/docs/empleados', '/docs/empleados/*'],
  createProxyMiddleware({
    target: 'http://empleados-service:8080',
    changeOrigin: true,
    pathRewrite: {
      '^/docs/empleados': '/docs',
    },
  })
);

//Departamentos
// 1. HTML principal
app.use(
  '/docs/departamentos',
  createProxyMiddleware({
    target: 'http://departamentos-service:8081',
    changeOrigin: true,
    pathRewrite: {
      '^/docs/departamentos$': '/swagger/index.html',
    },
  })
);

// 2. Assets (JS, CSS, json)
app.use(
  '/docs/departamentos/',
  createProxyMiddleware({
    target: 'http://departamentos-service:8081',
    changeOrigin: true,
    pathRewrite: {
      '^/docs/departamentos/': '/swagger/',
    },
  })
);
// Perfiles
// 1. HTML principal
app.use(
  '/docs/perfiles',
  createProxyMiddleware({
    target: 'http://perfiles-service:8085',
    changeOrigin: true,
    pathRewrite: {
      '^/docs/perfiles$': '/swagger-ui.html',
    },
  })
);

// 2. Assets (JS, CSS, etc)
app.use(
  '/docs/perfiles/',
  createProxyMiddleware({
    target: 'http://perfiles-service:8085',
    changeOrigin: true,
    pathRewrite: {
      '^/docs/perfiles/': '/swagger-ui/',
    },
  })
);

// 3. OpenAPI JSON
app.use(
  '/docs/perfiles/v3/api-docs',
  createProxyMiddleware({
    target: 'http://perfiles-service:8085',
    changeOrigin: true,
    pathRewrite: {
      '^/docs/perfiles/v3/api-docs': '/v3/api-docs',
    },
  })
);
// Notificaciones
app.use(
  ['/docs/notificaciones', '/docs/notificaciones/*'],
  createProxyMiddleware({
    target: 'http://notificaciones-service:8084',
    changeOrigin: true,
    pathRewrite: {
      '^/docs/notificaciones': '/swagger-ui.html',
    },
  })
);

// =========================
// RUTAS PROTEGIDAS
// =========================
empleadosRoutes(app);
departamentosRoutes(app);
perfilesRoutes(app);
notificacionesRoutes(app);
// =========================
// FALLBACK
// =========================
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: 'Ruta no encontrada en API Gateway'
  });
});

// =========================
// START SERVER
// =========================
const PORT = 3000;

app.listen(PORT, () => {
  logger.info(`API Gateway corriendo en puerto ${PORT}`);
});