package com.perfiles.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "perfiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Perfil de un empleado")
public class Perfil {

    @Id
    @Column(length = 36)
    @Schema(description = "ID único del perfil (UUID)", example = "550e8400-e29b-41d4-a716-446655440000", accessMode = Schema.AccessMode.READ_ONLY)
    private String id;

    @Column(nullable = false, unique = true, length = 36)
    @Schema(description = "ID del empleado asociado", example = "123", accessMode = Schema.AccessMode.READ_ONLY)
    private String empleadoId;

    @Column(nullable = false, length = 150)
    @Schema(description = "Nombre completo del empleado", example = "Juan Pérez")
    private String nombre;

    @Column(nullable = false, length = 255)
    @Schema(description = "Correo electrónico del empleado", example = "juan@empresa.com")
    private String email;

    @Column(length = 30)
    @Schema(description = "Número de teléfono", example = "+57 300 123 4567")
    private String telefono;

    @Column(length = 255)
    @Schema(description = "Dirección de residencia", example = "Calle 123 # 45-67")
    private String direccion;

    @Column(length = 100)
    @Schema(description = "Ciudad de residencia", example = "Bogotá")
    private String ciudad;

    @Column(columnDefinition = "TEXT")
    @Schema(description = "Breve biografía del empleado", example = "Ingeniero de software con 5 años de experiencia.")
    private String biografia;

    @Column(nullable = false, updatable = false)
    @Schema(description = "Fecha y hora de creación del perfil", accessMode = Schema.AccessMode.READ_ONLY)
    private LocalDateTime fechaCreacion;
}
