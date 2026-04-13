const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate, requireRole } = require('../middleware/auth');
const { createServiceProxy } = require('../utils/proxy');

module.exports = (app) => {

  app.use(
    '/perfiles',
    authenticate,
    requireRole('USER', 'ADMIN'),
    createServiceProxy('http://perfiles-service:8085')
  );
};