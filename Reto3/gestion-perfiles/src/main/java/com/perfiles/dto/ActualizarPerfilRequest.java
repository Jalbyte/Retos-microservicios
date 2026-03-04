package com.perfiles.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Datos actualizables del perfil de un empleado")
public class ActualizarPerfilRequest {

    @Schema(description = "Número de teléfono", example = "+57 300 123 4567")
    private String telefono;

    @Schema(description = "Dirección de residencia", example = "Calle 123 # 45-67")
    private String direccion;

    @Schema(description = "Ciudad de residencia", example = "Bogotá")
    private String ciudad;

    @Schema(description = "Breve biografía del empleado", example = "Ingeniero de software con 5 años de experiencia.")
    private String biografia;

    @Schema(description = "Nombre completo del empleado", example = "Juan Pérez Actualizado")
    private String nombre;

    @Schema(description = "Correo electrónico", example = "juan.nuevo@empresa.com")
    private String email;
}
