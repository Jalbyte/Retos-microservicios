package com.notificaciones.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notificaciones.service.NotificacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmpleadoEventConsumer {

    private final NotificacionService notificacionService;
    private final ObjectMapper objectMapper;

    /**
     * Escucha todos los mensajes publicados en la queue notificaciones.queue,
     * que está vinculada al fanout exchange empleados_exchange.
     *
     * Formato esperado del mensaje:
     * {
     *   "event": "empleado.creado" | "empleado.eliminado",
     *   "data": { ... }
     * }
     */
    @RabbitListener(queues = "notificaciones.queue")
    public void handleEmpleadoEvent(String messageBody) {
        try {
            JsonNode root = objectMapper.readTree(messageBody);

            String eventType = root.path("event").asText();
            JsonNode data = root.path("data");

            switch (eventType) {
                case "empleado.creado" -> procesarEmpleadoCreado(data);
                case "empleado.eliminado" -> procesarEmpleadoEliminado(data);
                default -> log.warn("[CONSUMER] Evento desconocido recibido: {}", eventType);
            }

        } catch (Exception e) {
            log.error("[CONSUMER] Error procesando mensaje: {}", e.getMessage(), e);
        }
    }

    private void procesarEmpleadoCreado(JsonNode data) {
        String empleadoId = data.path("id").asText();
        String nombre     = data.path("nombre").asText();
        String email      = data.path("email").asText();

        log.info("[CONSUMER] Evento empleado.creado recibido - id: {}, nombre: {}, email: {}",
                empleadoId, nombre, email);

        notificacionService.registrarBienvenida(empleadoId, nombre, email);
    }

    private void procesarEmpleadoEliminado(JsonNode data) {
        String empleadoId = data.path("id").asText();
        // El evento eliminado incluye "nombre" y "apellido" por separado
        String nombre     = data.path("nombre").asText() + " " + data.path("apellido").asText();
        String email      = data.path("email").asText();

        log.info("[CONSUMER] Evento empleado.eliminado recibido - id: {}, nombre: {}, email: {}",
                empleadoId, nombre.trim(), email);

        notificacionService.registrarDesvinculacion(empleadoId, nombre.trim(), email);
    }
}
