package com.perfiles.config;

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
     * Parses amqp://user:pass@host:port URI and configures CachingConnectionFactory.
     */
    @Bean
    public CachingConnectionFactory connectionFactory() {
        URI uri = URI.create(rabbitUrl.replaceFirst("^amqp://", "http://"));

        String host = uri.getHost();
        int    port = uri.getPort() > 0 ? uri.getPort() : 5672;
        String user = "guest";
        String pass = "guest";

        if (uri.getUserInfo() != null) {
            String[] parts = uri.getUserInfo().split(":", 2);
            user = parts[0];
            if (parts.length > 1) pass = parts[1];
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
     * Declares the same fanout exchange as Reto1 (empleados_exchange, durable).
     */
    @Bean
    public FanoutExchange empleadosExchange() {
        return new FanoutExchange(exchangeName, true, false);
    }

    /**
     * Dedicated, durable queue for this service.
     */
    @Bean
    public Queue perfilesQueue() {
        return new Queue("perfiles.queue", true, false, false);
    }

    /**
     * Binds the queue to the fanout exchange — receives every published event.
     */
    @Bean
    public Binding binding(Queue perfilesQueue, FanoutExchange empleadosExchange) {
        return BindingBuilder.bind(perfilesQueue).to(empleadosExchange);
    }

    /**
     * SimpleMessageConverter so that messages from Node.js (raw JSON bytes,
     * no Spring type headers) are delivered as plain String to @RabbitListener.
     */
    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            CachingConnectionFactory connectionFactory) {

        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(new SimpleMessageConverter());
        return factory;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(CachingConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(new Jackson2JsonMessageConverter());
        return template;
    }
}
