const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { createServiceProxy } = require('./utils/proxy');

const app = express();
app.use(express.json());
app.use(cors());
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
// START SERVERcc
// =========================
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`API Gateway corriendo en puerto ${PORT}`);
});