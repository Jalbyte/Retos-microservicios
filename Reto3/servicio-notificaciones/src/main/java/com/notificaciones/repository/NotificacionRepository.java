package com.notificaciones.repository;

import com.notificaciones.model.Notificacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, String> {

    Page<Notificacion> findByEmpleadoIdOrderByFechaEnvioDesc(String empleadoId, Pageable pageable);
}
