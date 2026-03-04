package com.notificaciones.repository;

import com.notificaciones.model.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, String> {

    List<Notificacion> findByEmpleadoIdOrderByFechaEnvioDesc(String empleadoId);
}
