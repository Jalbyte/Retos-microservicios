package com.perfiles.service;

import com.perfiles.dto.ActualizarPerfilRequest;
import com.perfiles.model.Perfil;
import com.perfiles.repository.PerfilRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PerfilService {

    private final PerfilRepository repository;

    /**
     * Crea un perfil por defecto cuando se recibe el evento empleado.creado.
     * Si ya existe un perfil para ese empleado, la operación es idempotente.
     */
    public Perfil crearPerfilPorDefecto(String empleadoId, String nombre, String email) {
        if (repository.existsByEmpleadoId(empleadoId)) {
            log.warn("[PERFILES] Ya existe un perfil para empleadoId={}. Se omite creación duplicada.", empleadoId);
            return repository.findByEmpleadoId(empleadoId).orElseThrow();
        }

        Perfil perfil = Perfil.builder()
                .id(UUID.randomUUID().toString())
                .empleadoId(empleadoId)
                .nombre(nombre)
                .email(email)
                .telefono("")
                .direccion("")
                .ciudad("")
                .biografia("")
                .fechaCreacion(LocalDateTime.now())
                .build();

        Perfil guardado = repository.save(perfil);
        log.info("[PERFILES] Perfil por defecto creado para empleadoId={}, nombre={}", empleadoId, nombre);
        return guardado;
    }

    /**
     * Retorna el perfil del empleado indicado.
     * @return Optional vacío si no existe
     */
    public Optional<Perfil> obtenerPorEmpleadoId(String empleadoId) {
        return repository.findByEmpleadoId(empleadoId);
    }

    /**
     * Actualiza los campos editables del perfil.
     * Solo actualiza los campos que vienen no-nulos en el request.
     * @return Optional vacío si el perfil no existe
     */
    public Optional<Perfil> actualizar(String empleadoId, ActualizarPerfilRequest req) {
        return repository.findByEmpleadoId(empleadoId).map(perfil -> {
            if (req.getTelefono()  != null) perfil.setTelefono(req.getTelefono());
            if (req.getDireccion() != null) perfil.setDireccion(req.getDireccion());
            if (req.getCiudad()    != null) perfil.setCiudad(req.getCiudad());
            if (req.getBiografia() != null) perfil.setBiografia(req.getBiografia());
            if (req.getNombre()    != null) perfil.setNombre(req.getNombre());
            if (req.getEmail()     != null) perfil.setEmail(req.getEmail());
            return repository.save(perfil);
        });
    }

    /**
     * Desactiva el perfil asociado a un empleado (soft delete).
     * Llamado al recibir el evento empleado.eliminado desde RabbitMQ.
     * @return true si el perfil fue encontrado y desactivado, false si no existe
     */
    public boolean desactivar(String empleadoId) {
        return repository.findByEmpleadoId(empleadoId).map(perfil -> {
            perfil.setActive(false);
            repository.save(perfil);
            log.info("[PERFILES] Perfil desactivado para empleadoId={}", empleadoId);
            return true;
        }).orElseGet(() -> {
            log.warn("[PERFILES] No se encontró perfil para desactivar, empleadoId={}", empleadoId);
            return false;
        });
    }

    /**
     * Retorna todos los perfiles registrados de forma paginada.
     */
    public Page<Perfil> listarTodos(Pageable pageable) {
        return repository.findAll(pageable);
    }
}
