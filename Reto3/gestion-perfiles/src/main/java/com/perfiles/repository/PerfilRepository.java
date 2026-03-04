package com.perfiles.repository;

import com.perfiles.model.Perfil;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PerfilRepository extends JpaRepository<Perfil, String> {

    Optional<Perfil> findByEmpleadoId(String empleadoId);

    boolean existsByEmpleadoId(String empleadoId);
}
