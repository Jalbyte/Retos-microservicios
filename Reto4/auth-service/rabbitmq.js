const amqp = require('amqplib');

const EMPLEADOS_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'empleados_exchange';
const AUTH_EXCHANGE = process.env.AUTH_EXCHANGE || 'auth_exchange';
const QUEUE_NAME = 'auth.empleados.queue';
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

let channel;
let eventHandler; // callback(event) set by index.js

async function connectRabbit(retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);

      connection.on('error', (err) => {
        console.error('[RabbitMQ] Conexión perdida:', err.message);
      });
      connection.on('close', () => {
        console.warn('[RabbitMQ] Conexión cerrada. Reconectando en 5s...');
        setTimeout(() => connectRabbit(), 5000);
      });

      channel = await connection.createChannel();

      // Exchange fanout de empleados (producido por gestion-empleados)
      await channel.assertExchange(EMPLEADOS_EXCHANGE, 'fanout', { durable: true });

      // Exchange fanout de auth (este servicio publica aquí)
      await channel.assertExchange(AUTH_EXCHANGE, 'fanout', { durable: true });

      // Queue dedicada al auth-service para consumir eventos de empleados
      const q = await channel.assertQueue(QUEUE_NAME, { durable: true });
      await channel.bindQueue(q.queue, EMPLEADOS_EXCHANGE, '');

      console.log(`[RabbitMQ] Conectado. Escuchando cola "${QUEUE_NAME}"...`);

      channel.consume(q.queue, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          if (eventHandler) await eventHandler(event);
          channel.ack(msg);
        } catch (err) {
          console.error('[RabbitMQ] Error procesando mensaje:', err.message);
          channel.nack(msg, false, false);
        }
      });

      return;
    } catch (err) {
      console.error(`[RabbitMQ] Intento ${attempt}/${retries} fallido: ${err.message}`);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error('[RabbitMQ] No se pudo conectar tras todos los intentos. Continuando sin RabbitMQ.');
      }
    }
  }
}

async function publishToAuth(event) {
  try {
    if (!channel) {
      console.warn('[RabbitMQ] Canal no disponible. Evento descartado:', event.event);
      return;
    }
    channel.publish(
      AUTH_EXCHANGE,
      '',
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    console.log(`[RabbitMQ] Evento publicado → ${AUTH_EXCHANGE}:`, event.event);
  } catch (error) {
    console.error('[RabbitMQ] Error publicando evento:', error.message);
  }
}

function setEventHandler(handler) {
  eventHandler = handler;
}

module.exports = { connectRabbit, publishToAuth, setEventHandler };
