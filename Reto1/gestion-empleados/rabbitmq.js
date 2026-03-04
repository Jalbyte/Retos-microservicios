const amqp = require('amqplib');

const EXCHANGE = 'empleados_exchange';

let channel;

async function connectRabbit() {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, 'fanout', {
        durable: true
    });

    console.log("Conectado a RabbitMQ");
}

async function publishEvent(event) {
    try {
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