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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agencia.buses.dao.UsuarioRepositorio;
import com.agencia.buses.dao.IChoferDAO;
import com.agencia.buses.modelo.Usuario;
import com.agencia.buses.modelo.Chofer;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthControlador {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final UsuarioRepositorio usuarios;
    private final PasswordEncoder passwordEncoder;
    private final IChoferDAO choferDAO; // NUEVO: Inyectamos el DAO del chofer

    public AuthControlador(AuthenticationManager authenticationManager,
                           SecurityContextRepository securityContextRepository,
                           UsuarioRepositorio usuarios,
                           PasswordEncoder passwordEncoder,
                           IChoferDAO choferDAO) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
        this.choferDAO = choferDAO;
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
    public ResponseEntity<?> registrar(@RequestBody RegistroRequest datos, Authentication autenticacion) {
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

        String rolSolicitado = (datos.rol() != null && !datos.rol().isBlank())
                            ? datos.rol().trim().toLowerCase(Locale.ROOT)
                            : "cliente";
        boolean administradorAutenticado = autenticacion != null && autenticacion.getAuthorities().stream()
                .anyMatch(autoridad -> autoridad.getAuthority().equals("ROLE_ADMIN"));
        if (!administradorAutenticado && !"cliente".equals(rolSolicitado)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Solo un administrador puede crear cuentas internas"));
        }
        String rolAsignado = rolSolicitado;

        Usuario usuario = new Usuario(correo, passwordEncoder.encode(datos.clave()), datos.nombre().trim(), rolAsignado);

        try {
            // 1. Guarda al usuario y la base de datos genera su ID (ej: ID 18)
            usuario = usuarios.save(usuario);

            // 2. Si elegiste "chofer", lo inserta automáticamente en la tabla chofer y usa los datos reales del formulario
            if ("chofer".equals(rolAsignado)) {
                String apellidosReales = (datos.apellidos() != null && !datos.apellidos().isBlank()) ? datos.apellidos().trim() : "";
                String licenciaReal = (datos.licencia() != null && !datos.licencia().isBlank()) ? datos.licencia().trim() : "Sin Licencia";
                String telefonoReal = (datos.telefono() != null && !datos.telefono().isBlank()) ? datos.telefono().trim() : "Sin Teléfono";
                // Lo crea con datos básicos por defecto ("Pendiente") que luego se pueden actualizar
                Chofer nuevoChofer = new Chofer(null, usuario.getNombre(), apellidosReales, licenciaReal, telefonoReal, usuario.getId());
                choferDAO.insertar(nuevoChofer);
            }

        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Ya existe una cuenta con ese correo"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno al registrar: " + e.getMessage()));
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

    public record RegistroRequest(String nombre, String correo, String clave, String rol,
                                  String apellidos, String licencia, String telefono) {
    }

    @GetMapping("/usuarios")
    public ResponseEntity<?> listarUsuarios() {
        try {
            return ResponseEntity.ok(usuarios.findAll());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al obtener usuarios"));
        }
    }

    // ENDPOINT: Eliminar un usuario por su ID
    @DeleteMapping("/usuarios/{id}")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Integer id) {
        try {
            // 1. Verificamos si el usuario existe en la base de datos
            Usuario usuario = usuarios.findById(id).orElse(null);
            if (usuario == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "El usuario no existe"));
            }

            // 2. Si es chofer, buscamos su registro en la tabla chofer y lo borramos primero
            if ("chofer".equalsIgnoreCase(usuario.getRol())) {
                try {
                    Chofer choferBD = choferDAO.buscarPorCorreo(usuario.getCorreo());
                    if (choferBD != null) {
                        // Ahora sí, llamamos al método eliminar que acabas de crear
                        choferDAO.eliminar(choferBD.getId());
                    }
                } catch (Exception e) {
                    System.out.println("Error al intentar borrar el registro del chofer: " + e.getMessage());
                }
            }

            // 3. Finalmente, borramos el usuario
            // (Si hay registros en reserva_boleto ligados a este ID, saltará la excepción de conflicto)
            usuarios.deleteById(id);

            return ResponseEntity.ok(Map.of("mensaje", "Usuario eliminado correctamente"));

        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "No se puede eliminar porque este empleado está asignado a un viaje o proceso activo."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno al eliminar"));
        }
    }

    // NUEVO ENDPOINT: Borrado lógico (Alternar estado Activo/Inactivo)
    @PatchMapping("/usuarios/{id}/estado")
    public ResponseEntity<?> alternarEstadoUsuario(@PathVariable Integer id) {
        try {
            Usuario usuario = usuarios.findById(id).orElse(null);
            if (usuario == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "El usuario no existe"));
            }

            // Si está activo, lo inactiva. Si está inactivo, lo reactiva.
            if ("ACTIVO".equalsIgnoreCase(usuario.getEstado())) {
                usuario.setEstado("INACTIVO");
            } else {
                usuario.setEstado("ACTIVO");
            }

            usuarios.save(usuario);
            return ResponseEntity.ok(Map.of("mensaje", "Estado actualizado a " + usuario.getEstado()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno al cambiar el estado"));
        }
    }

}