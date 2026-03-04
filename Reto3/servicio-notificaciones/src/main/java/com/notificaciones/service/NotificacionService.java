package com.notificaciones.service;

import com.notificaciones.model.Notificacion;
import com.notificaciones.repository.NotificacionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificacionService {

    private final NotificacionRepository repository;

    /**
     * Registra y simula el envío de un email de bienvenida.
     */
    public Notificacion registrarBienvenida(String empleadoId, String nombre, String email) {
        String mensaje = String.format("Bienvenido %s. Su cuenta ha sido creada exitosamente.", nombre);

        Notificacion notificacion = Notificacion.builder()
                .id(UUID.randomUUID().toString())
                .tipo("BIENVENIDA")
                .destinatario(email)
                .mensaje(mensaje)
                .fechaEnvio(LocalDateTime.now())
                .empleadoId(empleadoId)
                .build();

        repository.save(notificacion);

        // Simular envío de email con log estructurado
        log.info("[NOTIFICACIÓN] Tipo: BIENVENIDA | Para: {} | Mensaje: \"{}\"", email, mensaje);

        return notificacion;
    }

    /**
     * Registra y simula el envío de una notificación de desvinculación.
     */
    public Notificacion registrarDesvinculacion(String empleadoId, String nombre, String email) {
        String mensaje = String.format("Su cuenta ha sido desactivada. Lamentamos su partida, %s.", nombre);

        Notificacion notificacion = Notificacion.builder()
                .id(UUID.randomUUID().toString())
                .tipo("DESVINCULACION")
                .destinatario(email)
                .mensaje(mensaje)
                .fechaEnvio(LocalDateTime.now())
                .empleadoId(empleadoId)
                .build();

        repository.save(notificacion);

        // Simular envío de email con log estructurado
        log.info("[NOTIFICACIÓN] Tipo: DESVINCULACIÓN | Para: {} | Mensaje: \"{}\"", email, mensaje);

        return notificacion;
    }

    /**
     * Lista todas las notificaciones de forma paginada.
     */
    public Page<Notificacion> listarTodas(Pageable pageable) {
        return repository.findAll(pageable);
    }

    /**
     * Lista las notificaciones de un empleado específico de forma paginada.
     */
    public Page<Notificacion> listarPorEmpleado(String empleadoId, Pageable pageable) {
        return repository.findByEmpleadoIdOrderByFechaEnvioDesc(empleadoId, pageable);
    }
}
