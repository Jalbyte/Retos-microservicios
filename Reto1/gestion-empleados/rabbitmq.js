const amqp = require('amqplib');

const EXCHANGE = 'empleados_exchange';
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

let channel;

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
            await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });

            console.log('[RabbitMQ] Conectado exitosamente');
            return;
        } catch (err) {
            console.error(`[RabbitMQ] Intento ${attempt}/${retries} fallido: ${err.message}`);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            } else {
                console.error('[RabbitMQ] No se pudo conectar tras todos los intentos. El servicio continuará sin RabbitMQ.');
            }
        }
    }
}

async function publishEvent(event) {
    try {
        if (!channel) {
            console.warn('[RabbitMQ] Canal no disponible. Evento descartado:', event.event);
            return;
        }
        channel.publish(
            EXCHANGE,
            '',
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );
    } catch (error) {
        console.error("Error publicando evento:", error.message);
    }
}

module.exports = {
    connectRabbit,
    publishEvent
};