package com.perfiles.controller;

import com.perfiles.dto.ActualizarPerfilRequest;
import com.perfiles.model.Perfil;
import com.perfiles.service.PerfilService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
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
    name        = "Perfiles",
    description = "Gestión de perfiles de empleados. Los perfiles se crean automáticamente al recibir el evento `empleado.creado` " +
                  "desde RabbitMQ y pueden ser actualizados o consultados vía REST."
)
public class PerfilController {

    private final PerfilService perfilService;

    // ─── Health ───────────────────────────────────────────────────────────────

    @Operation(
        summary     = "Health check",
        description = "Verifica que el servicio se encuentra en ejecución",
        tags        = { "Health" }
    )
    @ApiResponse(responseCode = "200", description = "Servicio disponible")
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "gestion-perfiles"));
    }

    // ─── Endpoints de perfiles ────────────────────────────────────────────────

    @Operation(
        summary     = "Listar todos los perfiles",
        description = "Retorna la lista paginada de perfiles registrados en el sistema."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description  = "Página de perfiles",
            content      = @Content(
                mediaType = "application/json",
                schema    = @Schema(implementation = Page.class)
            )
        )
    })
    @GetMapping("/perfiles")
    public ResponseEntity<Page<Perfil>> listarTodos(
            @Parameter(description = "Número de página (0-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página", example = "10")
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(perfilService.listarTodos(
                PageRequest.of(page, size, Sort.by("fechaCreacion").descending())));
    }

    @Operation(
        summary     = "Obtener perfil de un empleado",
        description = "Retorna el perfil asociado al empleado indicado. " +
                      "El perfil es creado automáticamente cuando el evento `empleado.creado` es recibido."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description  = "Perfil encontrado",
            content      = @Content(
                mediaType = "application/json",
                schema    = @Schema(implementation = Perfil.class),
                examples  = @ExampleObject(value = """
                    {
                      "id": "550e8400-e29b-41d4-a716-446655440000",
                      "empleadoId": "123",
                      "nombre": "Juan Pérez",
                      "email": "juan@empresa.com",
                      "telefono": "",
                      "direccion": "",
                      "ciudad": "",
                      "biografia": "",
                      "fechaCreacion": "2026-03-04T10:00:00"
                    }
                    """)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description  = "No existe perfil para el empleado indicado",
            content      = @Content(
                mediaType = "application/json",
                examples  = @ExampleObject(value = """
                    {
                      "status": 404,
                      "error": "Not Found",
                      "mensaje": "No existe perfil para el empleado con id: 123"
                    }
                    """)
            )
        )
    })
    @GetMapping("/perfiles/{empleadoId}")
    public ResponseEntity<?> obtenerPerfil(
            @Parameter(description = "ID del empleado", required = true, example = "123")
            @PathVariable String empleadoId) {

        return perfilService.obtenerPorEmpleadoId(empleadoId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(404).body(Map.of(
                        "status", 404,
                        "error", "Not Found",
                        "mensaje", "No existe perfil para el empleado con id: " + empleadoId
                )));
    }

    @Operation(
        summary     = "Actualizar perfil de un empleado",
        description = "Permite actualizar los campos del perfil de un empleado. " +
                      "Solo se actualizan los campos que se envíen (parcial). " +
                      "Los campos `id`, `empleadoId` y `fechaCreacion` no pueden modificarse."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description  = "Perfil actualizado correctamente",
            content      = @Content(
                mediaType = "application/json",
                schema    = @Schema(implementation = Perfil.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description  = "No existe perfil para el empleado indicado",
            content      = @Content(
                mediaType = "application/json",
                examples  = @ExampleObject(value = """
                    {
                      "status": 404,
                      "error": "Not Found",
                      "mensaje": "No existe perfil para el empleado con id: 123"
                    }
                    """)
            )
        )
    })
    @PutMapping("/perfiles/{empleadoId}")
    public ResponseEntity<?> actualizarPerfil(
            @Parameter(description = "ID del empleado", required = true, example = "123")
            @PathVariable String empleadoId,
            @RequestBody(
                description = "Campos a actualizar (solo se modifican los enviados)",
                required    = true,
                content     = @Content(
                    mediaType = "application/json",
                    schema    = @Schema(implementation = ActualizarPerfilRequest.class),
                    examples  = @ExampleObject(value = """
                        {
                          "telefono": "+57 300 123 4567",
                          "direccion": "Calle 123 # 45-67",
                          "ciudad": "Bogotá",
                          "biografia": "Ingeniero de software con 5 años de experiencia."
                        }
                        """)
                )
            )
            @org.springframework.web.bind.annotation.RequestBody ActualizarPerfilRequest request) {

        return perfilService.actualizar(empleadoId, request)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(404).body(Map.of(
                        "status", 404,
                        "error", "Not Found",
                        "mensaje", "No existe perfil para el empleado con id: " + empleadoId
                )));
    }
}
