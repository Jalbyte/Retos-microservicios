const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate, requireRole } = require('../middleware/auth');
const { createServiceProxy } = require('../utils/proxy');

module.exports = (app) => {

  // USER o ADMIN → consultas (GET)
  app.get(
    '/departamentos',
    authenticate,
    requireRole('USER', 'ADMIN'),
    createServiceProxy('http://departamentos-service:8081')
  );

  // ADMIN → crear/modificar/eliminar departamentos (POST, PUT, DELETE)
  app.post(
    '/departamentos',
    authenticate,
    requireRole('ADMIN'),
    createServiceProxy('http://departamentos-service:8081')
  );

  app.put(
    '/departamentos/:id',
    authenticate,
    requireRole('ADMIN'),
    createServiceProxy('http://departamentos-service:8081')
  );

  app.delete(
    '/departamentos/:id',
    authenticate,
    requireRole('ADMIN'),
    createServiceProxy('http://departamentos-service:8081')
  );

};