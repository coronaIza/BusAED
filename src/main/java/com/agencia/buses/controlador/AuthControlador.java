package com.agencia.buses.controlador;

import java.util.Map;
import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agencia.buses.dao.UsuarioRepositorio;
import com.agencia.buses.modelo.Usuario;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthControlador {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final UsuarioRepositorio usuarios;
    private final PasswordEncoder passwordEncoder;

    public AuthControlador(AuthenticationManager authenticationManager,
                           SecurityContextRepository securityContextRepository,
                           UsuarioRepositorio usuarios,
                           PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest datos,
                                   HttpServletRequest request,
                                   HttpServletResponse response) {
        if (datos == null || datos.correo() == null || datos.clave() == null
                || datos.correo().isBlank() || datos.clave().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Correo y clave son obligatorios"));
        }

        try {
            Authentication autenticacion = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            datos.correo().trim().toLowerCase(Locale.ROOT), datos.clave()));
            if (request.getSession(false) != null) {
                request.changeSessionId();
            }
            SecurityContext contexto = SecurityContextHolder.createEmptyContext();
            contexto.setAuthentication(autenticacion);
            SecurityContextHolder.setContext(contexto);
            securityContextRepository.saveContext(contexto, request, response);
            return ResponseEntity.ok(respuestaUsuario(autenticacion));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Correo o clave incorrectos"));
        }
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registrar(@RequestBody RegistroRequest datos) {
        if (datos == null || datos.nombre() == null || datos.nombre().isBlank()
                || datos.correo() == null || datos.correo().isBlank()
                || datos.nombre().trim().length() > 100
                || datos.correo().trim().length() > 254
                || datos.clave() == null || datos.clave().length() < 8 || datos.clave().length() > 72) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Revisa nombre y correo; la clave debe tener entre 8 y 72 caracteres"));
        }

        String correo = datos.correo().trim().toLowerCase(Locale.ROOT);
        if (usuarios.findByCorreo(correo).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Ya existe una cuenta con ese correo"));
        }

        Usuario usuario = new Usuario(correo, passwordEncoder.encode(datos.clave()),
                datos.nombre().trim(), "cliente");
        try {
            usuarios.save(usuario);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Ya existe una cuenta con ese correo"));
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("mensaje", "Cuenta creada. Ya puedes iniciar sesión."));
    }

    @GetMapping("/me")
    public ResponseEntity<?> usuarioActual(Authentication autenticacion) {
        String correo = ((UserDetails) autenticacion.getPrincipal()).getUsername();
        Usuario usuario = usuarios.findByCorreo(correo)
                .orElseThrow(() -> new IllegalStateException("La cuenta autenticada ya no existe"));
        return ResponseEntity.ok(respuestaUsuario(autenticacion, usuario));
    }

    private Map<String, String> respuestaUsuario(Authentication autenticacion) {
        Usuario usuario = usuarios.findByCorreo(autenticacion.getName())
                .orElseThrow(() -> new IllegalStateException("La cuenta autenticada ya no existe"));
        return respuestaUsuario(autenticacion, usuario);
    }

    private Map<String, String> respuestaUsuario(Authentication autenticacion, Usuario usuario) {
        String rol = autenticacion.getAuthorities().iterator().next().getAuthority()
                .replaceFirst("^ROLE_", "").toLowerCase(Locale.ROOT);
        String nombre = usuario.getNombre() == null ? "" : usuario.getNombre();
        return Map.of("correo", usuario.getCorreo(), "nombre", nombre, "rol", rol);
    }

    public record LoginRequest(String correo, String clave) {
    }

    public record RegistroRequest(String nombre, String correo, String clave) {
    }
}
