package com.notificaciones.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notificaciones.service.NotificacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consume eventos publicados por auth-service en la cola notificaciones.auth.queue
 * (vinculada al fanout exchange auth_exchange).
 *
 * Eventos manejados:
 *  - usuario.creado      → notificación de activación de cuenta
 *  - usuario.recuperacion → notificación de recuperación de contraseña
 *
 * Formato esperado:
 * {
 *   "event": "usuario.creado" | "usuario.recuperacion",
 *   "data": { "email": "...", "token": "jwt-reset-aqui" }
 * }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthEventConsumer {

    private final NotificacionService notificacionService;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "notificaciones.auth.queue")
    public void handleAuthEvent(String messageBody) {
        try {
            JsonNode root = objectMapper.readTree(messageBody);
            String eventType = root.path("event").asText();
            JsonNode data    = root.path("data");

            switch (eventType) {
                case "usuario.creado"       -> procesarUsuarioCreado(data);
                case "usuario.recuperacion" -> procesarUsuarioRecuperacion(data);
                default -> log.warn("[AUTH-CONSUMER] Evento desconocido recibido: {}", eventType);
            }
        } catch (Exception e) {
            log.error("[AUTH-CONSUMER] Error procesando mensaje: {}", e.getMessage(), e);
        }
    }

    private void procesarUsuarioCreado(JsonNode data) {
        String email = data.path("email").asText();
        String token = data.path("token").asText();

        log.info("[AUTH-CONSUMER] usuario.creado recibido para: {}", email);
        notificacionService.registrarCredencialesSeguridad(email, token, "CREACION");
    }

    private void procesarUsuarioRecuperacion(JsonNode data) {
        String email = data.path("email").asText();
        String token = data.path("token").asText();

        log.info("[AUTH-CONSUMER] usuario.recuperacion recibido para: {}", email);
        notificacionService.registrarCredencialesSeguridad(email, token, "RECUPERACION");
    }
}
