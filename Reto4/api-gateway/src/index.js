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

app.use(
  '/docs',
  createProxyMiddleware({
    target: 'http://auth-service:3001',
    changeOrigin: true,
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

// Departamentos
app.use(
  ['/docs/departamentos', '/docs/departamentos/*'],
  createProxyMiddleware({
    target: 'http://departamentos-service:8081',
    changeOrigin: true,
    pathRewrite: {
      '^/docs/departamentos': '/swagger',
    },
  })
);

// Perfiles
app.use(
  ['/docs/perfiles', '/docs/perfiles/*'],
  createProxyMiddleware({
    target: 'http://perfiles-service:8085',
    changeOrigin: true,
    pathRewrite: {
      '^/docs/perfiles': '/swagger-ui.html',
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
  console.log(`API Gateway corriendo en puerto ${PORT}`);
});