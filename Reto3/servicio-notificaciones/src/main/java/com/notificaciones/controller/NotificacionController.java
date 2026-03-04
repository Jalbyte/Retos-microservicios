package com.notificaciones.controller;

import com.notificaciones.model.Notificacion;
import com.notificaciones.service.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;

    // ─── Health check ─────────────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "servicio-notificaciones"));
    }

    // ─── Endpoints de notificaciones ──────────────────────────────────────────

    /**
     * Lista todas las notificaciones registradas.
     * GET /notificaciones
     */
    @GetMapping("/notificaciones")
    public ResponseEntity<List<Notificacion>> listarTodas() {
        List<Notificacion> notificaciones = notificacionService.listarTodas();
        return ResponseEntity.ok(notificaciones);
    }

    /**
     * Lista las notificaciones de un empleado específico.
     * GET /notificaciones/{empleadoId}
     */
    @GetMapping("/notificaciones/{empleadoId}")
    public ResponseEntity<?> listarPorEmpleado(@PathVariable String empleadoId) {
        List<Notificacion> notificaciones = notificacionService.listarPorEmpleado(empleadoId);

        if (notificaciones.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "empleadoId", empleadoId,
                    "notificaciones", List.of(),
                    "mensaje", "No se encontraron notificaciones para este empleado"
            ));
        }

        return ResponseEntity.ok(notificaciones);
    }
}
