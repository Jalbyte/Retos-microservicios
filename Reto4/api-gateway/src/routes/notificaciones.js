const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate, requireRole } = require('../middleware/auth');
const { createServiceProxy } = require('../utils/proxy');

module.exports = (app) => {

  app.use(
    '/notificaciones',
    authenticate,
    requireRole('USER', 'ADMIN'),
    createServiceProxy('http://notificaciones-service:8084')
  );

};
