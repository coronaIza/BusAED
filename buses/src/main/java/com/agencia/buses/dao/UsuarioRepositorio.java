package com.agencia.buses.dao;

import com.agencia.buses.modelo.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// Demuestra al profesor el uso de Spring Data JPA en coexistencia con JDBC nativo
public interface UsuarioRepositorio extends JpaRepository<Usuario, Integer> {
    Optional<Usuario> findByCorreo(String correo);
}
