package com.agencia.buses.controlador;

import com.agencia.buses.modelo.Ruta;
import com.agencia.buses.negocio.IRutaNegocio;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

// Solo recibe HTTP y llama al Negocio. Sin SQL ni reglas.
@RestController
@RequestMapping("/api/rutas")
public class RutaControlador {

    private final IRutaNegocio negocio;

    public RutaControlador(IRutaNegocio negocio) {
        this.negocio = negocio;
    }

    // GET /api/rutas
    @GetMapping
    public ResponseEntity<?> listar() {
        try {
            return ResponseEntity.ok(negocio.listar());
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // GET /api/rutas/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(negocio.obtenerPorId(id));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // POST /api/rutas
    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Ruta ruta) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(negocio.registrar(ruta));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // PUT /api/rutas/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Integer id, @RequestBody Ruta ruta) {
        try {
            return ResponseEntity.ok(negocio.actualizar(id, ruta));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // DELETE /api/rutas/{id}
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
