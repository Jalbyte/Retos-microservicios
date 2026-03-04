package com.notificaciones.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.SimpleMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.URI;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.exchange:empleados_exchange}")
    private String exchangeName;

    @Value("${rabbitmq.url:amqp://admin:admin@localhost:5672}")
    private String rabbitUrl;

    /**
     * Parses the full amqp://user:pass@host:port URI and configures the connection factory.
     */
    @Bean
    public CachingConnectionFactory connectionFactory() {
        // Replace "amqp://" with "http://" so java.net.URI can parse it correctly
        URI uri = URI.create(rabbitUrl.replaceFirst("^amqp://", "http://"));

        String host = uri.getHost();
        int    port = uri.getPort() > 0 ? uri.getPort() : 5672;
        String user = "guest";
        String pass = "guest";

        if (uri.getUserInfo() != null) {
            String[] parts = uri.getUserInfo().split(":", 2);
            user = parts[0];
            if (parts.length > 1) {
                pass = parts[1];
            }
        }

        CachingConnectionFactory factory = new CachingConnectionFactory();
        factory.setHost(host);
        factory.setPort(port);
        factory.setUsername(user);
        factory.setPassword(pass);
        factory.setVirtualHost("/");
        return factory;
    }

    /**
     * Declares the same fanout exchange used by Reto1 (empleados_exchange, durable).
     */
    @Bean
    public FanoutExchange empleadosExchange() {
        return new FanoutExchange(exchangeName, true, false);
    }

    /**
     * Durable, non-exclusive queue dedicated to this service.
     */
    @Bean
    public Queue notificacionesQueue() {
        return new Queue("notificaciones.queue", true, false, false);
    }

    /**
     * Binds the queue to the fanout exchange so it receives every published event.
     */
    @Bean
    public Binding binding(Queue notificacionesQueue, FanoutExchange empleadosExchange) {
        return BindingBuilder.bind(notificacionesQueue).to(empleadosExchange);
    }

    /**
     * Listener container factory that uses SimpleMessageConverter.
     * This delivers messages as plain String / byte[], which is what Reto1 (Node.js)
     * publishes — raw JSON bytes without any Spring/Jackson type headers.
     */
    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            CachingConnectionFactory connectionFactory) {

        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(new SimpleMessageConverter());
        return factory;
    }

    /**
     * RabbitTemplate uses Jackson for any outbound messages (not strictly needed here
     * since this service only consumes, but kept for completeness).
     */
    @Bean
    public RabbitTemplate rabbitTemplate(CachingConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(new Jackson2JsonMessageConverter());
        return template;
    }
}
