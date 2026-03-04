package com.notificaciones.controller;

import com.notificaciones.model.Notificacion;
import com.notificaciones.service.NotificacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(
    name        = "Notificaciones",
    description = "Historial de notificaciones generadas automáticamente al consumir eventos de empleados desde RabbitMQ"
)
public class NotificacionController {

    private final NotificacionService notificacionService;

    // ─── Health check ─────────────────────────────────────────────────────────

    @Operation(
        summary     = "Health check",
        description = "Verifica que el servicio se encuentra en ejecución",
        tags        = { "Health" }
    )
    @ApiResponse(responseCode = "200", description = "Servicio disponible")
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "servicio-notificaciones"));
    }

    // ─── Endpoints de notificaciones ──────────────────────────────────────────

    @Operation(
        summary     = "Listar todas las notificaciones",
        description = """
            Retorna el historial paginado de notificaciones registradas.
            Cada notificación es generada automáticamente cuando el servicio consume
            los eventos `empleado.creado` (tipo **BIENVENIDA**) o
            `empleado.eliminado` (tipo **DESVINCULACION**) desde RabbitMQ.
            """
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description  = "Página de notificaciones",
            content      = @Content(
                mediaType = "application/json",
                schema    = @Schema(implementation = Page.class)
            )
        )
    })
    @GetMapping("/notificaciones")
    public ResponseEntity<Page<Notificacion>> listarTodas(
            @Parameter(description = "Número de página (0-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página", example = "10")
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(notificacionService.listarTodas(
                PageRequest.of(page, size, Sort.by("fechaEnvio").descending())));
    }

    @Operation(
        summary     = "Listar notificaciones de un empleado",
        description = "Retorna todas las notificaciones asociadas al `empleadoId` indicado, ordenadas por fecha descendente."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description  = "Notificaciones del empleado (puede ser lista vacía)",
            content      = @Content(
                mediaType = "application/json",
                examples  = @ExampleObject(value = """
                    [
                      {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "tipo": "BIENVENIDA",
                        "destinatario": "juan@empresa.com",
                        "mensaje": "Bienvenido Juan Pérez. Su cuenta ha sido creada exitosamente.",
                        "fechaEnvio": "2026-03-04T10:00:00",
                        "empleadoId": "123"
                      }
                    ]
                    """)
            )
        )
    })
    @GetMapping("/notificaciones/{empleadoId}")
    public ResponseEntity<Page<Notificacion>> listarPorEmpleado(
            @Parameter(description = "ID del empleado cuyas notificaciones se desean consultar", required = true, example = "123")
            @PathVariable String empleadoId,
            @Parameter(description = "Número de página (0-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página", example = "10")
            @RequestParam(defaultValue = "10") int size) {

        Page<Notificacion> notificaciones = notificacionService.listarPorEmpleado(
                empleadoId, PageRequest.of(page, size));
        return ResponseEntity.ok(notificaciones);
    }
}
