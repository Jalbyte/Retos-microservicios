const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: process.env.OTEL_SERVICE_NAME || 'empleados-service' },
  transports: [
    new winston.transports.Console()
  ],
});
module.exports = logger;
