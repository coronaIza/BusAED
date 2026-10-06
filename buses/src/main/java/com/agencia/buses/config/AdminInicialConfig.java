package com.agencia.buses.config;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.agencia.buses.dao.UsuarioRepositorio;
import com.agencia.buses.modelo.Usuario;

@Configuration
public class AdminInicialConfig {

    @Bean
    CommandLineRunner crearAdministradorInicial(
            UsuarioRepositorio usuarios,
            PasswordEncoder passwordEncoder,
            @Value("${APP_ADMIN_EMAIL:}") String correo,
            @Value("${APP_ADMIN_PASSWORD:}") String clave,
            @Value("${APP_ADMIN_NAME:Administrador}") String nombre) {
        return args -> {
            boolean tieneCorreo = !correo.isBlank();
            boolean tieneClave = !clave.isBlank();
            if (tieneCorreo != tieneClave) {
                throw new IllegalStateException(
                        "Configura APP_ADMIN_EMAIL y APP_ADMIN_PASSWORD juntas, o deja ambas vacías");
            }
            if (!tieneCorreo) {
                return;
            }
            if (clave.length() < 12 || clave.length() > 72) {
                throw new IllegalStateException(
                        "APP_ADMIN_PASSWORD debe tener entre 12 y 72 caracteres");
            }

            String correoNormalizado = correo.trim().toLowerCase(Locale.ROOT);
            Usuario usuario = usuarios.findByCorreo(correoNormalizado).orElse(null);
            if (usuario == null) {
                usuarios.save(new Usuario(correoNormalizado, passwordEncoder.encode(clave),
                        nombre.trim(), "admin"));
            } else if (!"ADMIN".equalsIgnoreCase(usuario.getRol())) {
                throw new IllegalStateException(
                        "APP_ADMIN_EMAIL ya pertenece a una cuenta que no tiene rol ADMIN");
            }
        };
    }
}
