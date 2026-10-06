package com.agencia.buses.controlador;

import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agencia.buses.modelo.Viaje;
import com.agencia.buses.negocio.IViajeNegocio;

// REEMPLAZA al ViajeControlador anterior (el que devolvía datos de ejemplo).
// Mantiene GET /api/viajes, así que pasajero.js sigue funcionando, ahora con datos reales.
@RestController
@RequestMapping("/api/viajes")
public class ViajeControlador {

    private final IViajeNegocio negocio;

    public ViajeControlador(IViajeNegocio negocio) {
        this.negocio = negocio;
    }

    // GET /api/viajes -> horarios disponibles (cliente y admin)
    @GetMapping
    public ResponseEntity<?> listar() {
        try {
            return ResponseEntity.ok(negocio.listar());
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // GET /api/viajes/mi-hoja -> hoja de ruta del chofer que inició sesión (solo CHOFER)
    // "Authentication" lo entrega Spring Security: getName() es el correo del usuario logueado.
    @GetMapping("/mi-hoja")
    public ResponseEntity<?> miHoja(Authentication autenticacion) {
        try {
            return ResponseEntity.ok(negocio.listarMiHoja(autenticacion.getName()));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // PATCH /api/viajes/mi-hoja/{id}/estado  con  {"estado":"EN CURSO"}  (solo CHOFER, solo sus viajes)
    @PatchMapping("/mi-hoja/{id}/estado")
    public ResponseEntity<?> cambiarMiEstado(@PathVariable Integer id, @RequestBody Map<String, String> cuerpo,
                                             Authentication autenticacion) {
        try {
            return ResponseEntity.ok(negocio.cambiarEstadoMiViaje(
                    autenticacion.getName(), id, cuerpo == null ? null : cuerpo.get("estado")));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // GET /api/viajes/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(negocio.obtenerPorId(id));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // GET /api/viajes/chofer/{idChofer} -> hoja de ruta de CUALQUIER chofer (solo ADMIN)
    @GetMapping("/chofer/{idChofer}")
    public ResponseEntity<?> listarPorChofer(@PathVariable Integer idChofer) {
        try {
            return ResponseEntity.ok(negocio.listarPorChofer(idChofer));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // POST /api/viajes -> programar un viaje (admin)
    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Viaje viaje) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(negocio.registrar(viaje));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // PUT /api/viajes/{id} -> reprogramar o cambiar bus/chofer (admin)
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Integer id, @RequestBody Viaje viaje) {
        try {
            return ResponseEntity.ok(negocio.actualizar(id, viaje));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // PATCH /api/viajes/{id}/estado  con  {"estado":"EN CURSO"}  -> iniciar / finalizar / cancelar
    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Integer id, @RequestBody Map<String, String> cuerpo) {
        try {
            return ResponseEntity.ok(negocio.cambiarEstado(id, cuerpo == null ? null : cuerpo.get("estado")));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // DELETE /api/viajes/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Integer id) {
        try {
            negocio.eliminar(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return responderError(e);
        }
    }

    private ResponseEntity<?> responderError(Exception e) {
        if (e instanceof IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
        if (e instanceof NoSuchElementException) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error interno del servidor: " + e.getMessage()));
    }
}
