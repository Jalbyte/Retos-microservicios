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

/**
 * Configuración de RabbitMQ para el servicio de notificaciones.
 * 
 * Esta clase configura la conexión con RabbitMQ y define los componentes
 * necesarios
 * para consumir mensajes del exchange "empleados_exchange", que es el mismo
 * exchange
 * utilizado por el Reto1 (sistema de empleados). El servicio actúa como
 * consumidor
 * de eventos relacionados con empleados para enviar notificaciones.
 * 
 * @author Equipo de Desarrollo
 * @version 1.0
 */
@Configuration
public class RabbitMQConfig {

    /**
     * Nombre del exchange de tipo fanout al que se suscribirá este servicio.
     * Por defecto: "empleados_exchange"
     * Puede ser sobreescrito mediante la propiedad: rabbitmq.exchange
     */
    @Value("${rabbitmq.exchange:empleados_exchange}")
    private String exchangeName;

    /**
     * URL completa de conexión a RabbitMQ en formato AMQP.
     * Por defecto: amqp://admin:admin@localhost:5672
     * Puede ser sobreescrito mediante la propiedad: rabbitmq.url
     * Formato esperado: amqp://usuario:contraseña@host:puerto
     */
    @Value("${rabbitmq.url:amqp://admin:admin@localhost:5672}")
    private String rabbitUrl;

    /**
     * Configura y crea la fábrica de conexiones a RabbitMQ.
     * 
     * Este método parsea la URL AMQP proporcionada extrayendo:
     * - Host: dirección del servidor RabbitMQ
     * - Puerto: puerto de conexión (por defecto 5672 si no se especifica)
     * - Usuario: credenciales de autenticación
     * - Contraseña: credenciales de autenticación
     * 
     * Nota: Se reemplaza "amqp://" por "http://" temporalmente para facilitar
     * el parseo mediante java.net.URI.
     * 
     * @return CachingConnectionFactory configurada con los parámetros de conexión
     */
    @Bean
    public CachingConnectionFactory connectionFactory() {
        // Reemplazar "amqp://" con "http://" para que java.net.URI pueda parsearlo
        // correctamente
        URI uri = URI.create(rabbitUrl.replaceFirst("^amqp://", "http://"));

        String host = uri.getHost();
        int port = uri.getPort() > 0 ? uri.getPort() : 5672;
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
     * Declara el exchange fanout utilizado por el sistema de empleados.
     * 
     * Características:
     * - Tipo: Fanout (distribuye mensajes a todas las colas vinculadas)
     * - Nombre: Configurable mediante rabbitmq.exchange
     * - Durable: true (sobrevive a reinicios de RabbitMQ)
     * - Auto-delete: false (no se elimina automáticamente)
     * 
     * El exchange fanout asegura que todos los servicios suscritos reciban
     * cada evento de empleados (creación, actualización, eliminación).
     * 
     * @return FanoutExchange configurado
     */
    @Bean
    public FanoutExchange empleadosExchange() {
        return new FanoutExchange(exchangeName, true, false);
    }

    /**
     * Declara la cola dedicada para este servicio de notificaciones.
     * 
     * Características:
     * - Nombre: "notificaciones.queue"
     * - Durable: true (los mensajes persisten en disco)
     * - Exclusiva: false (puede ser compartida)
     * - Auto-delete: false (no se elimina cuando no hay consumidores)
     * 
     * Esta cola almacenará los eventos de empleados hasta que sean procesados
     * por el servicio de notificaciones.
     * 
     * @return Queue configurada para notificaciones
     */
    @Bean
    public Queue notificacionesQueue() {
        return new Queue("notificaciones.queue", true, false, false);
    }

    /**
     * Establece el binding entre la cola de notificaciones y el exchange de
     * empleados.
     * 
     * Al ser un exchange fanout, no se requiere routing key específica -
     * todos los mensajes publicados en el exchange serán entregados a esta cola.
     * 
     * @param notificacionesQueue La cola de notificaciones
     * @param empleadosExchange   El exchange de empleados
     * @return Binding que conecta la cola con el exchange
     */
    @Bean
    public Binding binding(Queue notificacionesQueue, FanoutExchange empleadosExchange) {
        return BindingBuilder.bind(notificacionesQueue).to(empleadosExchange);
    }

    /**
     * Configura la fábrica de listeners para consumir mensajes de RabbitMQ.
     * 
     * Utiliza SimpleMessageConverter para mantener compatibilidad con el
     * publicador Node.js del Reto1. Este convertidor maneja los mensajes como
     * Strings planos o arrays de bytes, que es exactamente lo que publica
     * Node.js - bytes JSON sin cabeceras adicionales de tipo.
     * 
     * Esto es CRÍTICO para la interoperabilidad con el sistema existente,
     * ya que Jackson2JsonMessageConverter esperaría cabeceras de tipo que
     * Node.js no proporciona.
     * 
     * @param connectionFactory La fábrica de conexiones a RabbitMQ
     * @return SimpleRabbitListenerContainerFactory configurada
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
     * Configura la plantilla RabbitTemplate para posibles operaciones de envío.
     * 
     * Aunque este servicio está diseñado principalmente como consumidor,
     * se proporciona RabbitTemplate con convertidor Jackson por completitud
     * y para posibles futuras necesidades de publicación de mensajes.
     * 
     * @param connectionFactory La fábrica de conexiones a RabbitMQ
     * @return RabbitTemplate configurado con convertidor Jackson
     */
    @Bean
    public RabbitTemplate rabbitTemplate(CachingConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(new Jackson2JsonMessageConverter());
        return template;
    }
}