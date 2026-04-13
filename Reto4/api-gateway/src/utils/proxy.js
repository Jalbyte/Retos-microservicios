const { createProxyMiddleware } = require('http-proxy-middleware');

const createServiceProxy = (target, pathRewrite = null) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,

    ...(pathRewrite && { pathRewrite }),

    onProxyReq: (proxyReq, req) => {
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);

        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

        proxyReq.write(bodyData);
      }
    },

    logLevel: 'debug',
  });
};

module.exports = { createServiceProxy };