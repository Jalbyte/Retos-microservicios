const { createApp } = require('./app');
const logger = require('./logger');

const app = createApp();
const port = process.env.PORT || 8086;

app.listen(port, () => {
  logger.info(`Reto6 Express escuchando en puerto ${port}`);
});
