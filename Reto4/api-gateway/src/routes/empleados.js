const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate, requireRole } = require('../middleware/auth');
const { createServiceProxy } = require('../utils/proxy');

module.exports = (app) => {

  // ADMIN → crear empleado (POST)
  // Consultas -> ADMIN/USER
  app.get(
    ['/empleado', '/empleado/:id'],
    authenticate,
    requireRole('USER', 'ADMIN'),
    createServiceProxy('http://empleados-service:8080')
  );

  // Escritura -> ADMIN
  app.use(
    ['/empleado', '/empleado/:id'],
    authenticate,
    requireRole('ADMIN'),
    createServiceProxy('http://empleados-service:8080')
  );

  // Retrocompatibilidad
  app.use(
    ['/empleados', '/empleados/*'],
    authenticate,
    requireRole('USER', 'ADMIN'),
    createServiceProxy('http://empleados-service:8080', { '^/empleados': '/empleado' })
  );
};