const { createApp } = require('./app');

const app = createApp();
const port = process.env.PORT || 8086;

app.listen(port, () => {
  console.log(`Reto6 Express escuchando en puerto ${port}`);
});
