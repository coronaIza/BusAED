package com.agencia.buses.config;

import java.util.Locale;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

import com.agencia.buses.dao.UsuarioRepositorio;
import com.agencia.buses.modelo.Usuario;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(UsuarioRepositorio usuarios) {
        return correo -> {
            Usuario usuario = usuarios.findByCorreo(correo)
                    .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
            String rol = usuario.getRol() == null ? "" : usuario.getRol().trim().toUpperCase(Locale.ROOT);
            if (!rol.equals("ADMIN") && !rol.equals("CLIENTE") && !rol.equals("CHOFER")) {
                throw new AuthenticationServiceException("El usuario tiene un rol no válido");
            }
            return User.withUsername(usuario.getCorreo())
                    .password(usuario.getClave())
                    .roles(rol)
                    .build();
        };
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            SecurityContextRepository securityContextRepository) throws Exception {
        CookieCsrfTokenRepository csrfRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepository.setHeaderName("X-XSRF-TOKEN");

        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepository)
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
                .securityContext(security -> security.securityContextRepository(securityContextRepository))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/", "/login.html", "/registro.html", "/login.js", "/registro.js",
                                "/api/auth/csrf", "/api/auth/login", "/api/auth/registro")
                        .permitAll()
                        .requestMatchers("/index.html", "/buses.js", "/rutas.html", "/rutas.js",
                                "/viajes.html", "/viajes.js").hasRole("ADMIN")
                        .requestMatchers("/pasajero.html", "/pasajero.js", "/reservas.html", "/reservas.js")
                        .hasAnyRole("CLIENTE", "ADMIN")
                        .requestMatchers("/chofer.html", "/chofer.js").hasRole("CHOFER")
                        .requestMatchers("/api/buses/**", "/api/choferes/**").hasRole("ADMIN")
                        .requestMatchers("/api/reservas/**").hasAnyRole("CLIENTE", "ADMIN")
                        // CHOFER: solo SU hoja de ruta.
                        .requestMatchers("/api/viajes/mi-hoja/**").hasRole("CHOFER")
                        // La hoja de ruta de un chofer cualquiera (por id) es solo del ADMIN.
                        .requestMatchers("/api/viajes/chofer/**").hasRole("ADMIN")
                        // Rutas y viajes: el CLIENTE solo puede CONSULTAR (GET); crear/editar/borrar es de ADMIN.
                        // El orden importa: la regla de GET va antes que la regla general.
                        .requestMatchers(HttpMethod.GET, "/api/rutas/**", "/api/viajes/**").hasAnyRole("ADMIN", "CLIENTE")
                        .requestMatchers("/api/rutas/**", "/api/viajes/**").hasRole("ADMIN")
                        .requestMatchers("/api/auth/me").authenticated()
                        .anyRequest().denyAll())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) ->
                                response.sendError(HttpStatus.UNAUTHORIZED.value()))
                        .accessDeniedHandler((request, response, exception) ->
                                response.sendError(HttpStatus.FORBIDDEN.value())))
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler((request, response, authentication) ->
                                response.setStatus(HttpServletResponse.SC_NO_CONTENT)));

        return http.build();
    }
}