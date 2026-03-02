const amqp = require("amqplib");

let channel;

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect("amqp://admin:admin@rabbitmq:5672");
        channel = await connection.createChannel();

        await channel.assertExchange("empleados_exchange", "fanout", {
            durable: true,
        });

        console.log("Conectado a RabbitMQ");
    } catch (error) {
        console.error("Error conectando a RabbitMQ:", error);
    }
}

async function publishEvent(eventType, data) {
    if (!channel) {
        console.error("RabbitMQ no está conectado");
        return;
    }

    const message = JSON.stringify({
        type: eventType,
        data,
    });

    channel.publish("empleados_exchange", "", Buffer.from(message));
}

module.exports = { connectRabbitMQ, publishEvent };