package com.perfiles.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.perfiles.service.PerfilService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmpleadoEventConsumer {

    private final PerfilService perfilService;
    private final ObjectMapper  objectMapper;

    /**
     * Escucha todos los mensajes publicados en perfiles.queue,
     * vinculada al fanout exchange empleados_exchange.
     *
     * Formato esperado del mensaje (publicado por Reto1 - Node.js):
     * {
     *   "event": "empleado.creado" | "empleado.eliminado",
     *   "data": { ... }
     * }
     *
     * Solo se procesa el evento empleado.creado.
     */
    @RabbitListener(queues = "perfiles.queue")
    public void handleEmpleadoEvent(String messageBody) {
        try {
            JsonNode root      = objectMapper.readTree(messageBody);
            String   eventType = root.path("event").asText();

            if ("empleado.creado".equals(eventType)) {
                JsonNode data       = root.path("data");
                String   empleadoId = data.path("id").asText();
                String   nombre     = data.path("nombre").asText();
                String   email      = data.path("email").asText();

                log.info("[CONSUMER] Evento empleado.creado recibido — id: {}, nombre: {}, email: {}",
                        empleadoId, nombre, email);

                perfilService.crearPerfilPorDefecto(empleadoId, nombre, email);
            } else {
                // Ignoramos eventos que no son de interés (empleado.eliminado, etc.)
                log.debug("[CONSUMER] Evento ignorado: {}", eventType);
            }

        } catch (Exception e) {
            log.error("[CONSUMER] Error procesando mensaje: {}", e.getMessage(), e);
        }
    }
}
