package com.notificaciones.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notificaciones")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notificacion {

    @Id
    @Column(length = 36)
    private String id;

    /** BIENVENIDA | DESVINCULACION */
    @Column(nullable = false, length = 20)
    private String tipo;

    /** Email del empleado */
    @Column(nullable = false, length = 255)
    private String destinatario;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String mensaje;

    @Column(nullable = false)
    private LocalDateTime fechaEnvio;

    @Column(nullable = false, length = 36)
    private String empleadoId;
}
