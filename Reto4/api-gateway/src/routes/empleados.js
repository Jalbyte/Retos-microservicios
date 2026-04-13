const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate, requireRole } = require('../middleware/auth');
const { createServiceProxy } = require('../utils/proxy');

module.exports = (app) => {

  // ADMIN → crear empleado
  app.use(
    '/empleado',
    authenticate,
    requireRole('ADMIN'),
    createServiceProxy('http://empleados-service:8080')
  );

  // USER o ADMIN → consultas
  app.use(
    '/empleados',
    authenticate,
    requireRole('USER', 'ADMIN'),
    createServiceProxy('http://empleados-service:8080')
  );
};