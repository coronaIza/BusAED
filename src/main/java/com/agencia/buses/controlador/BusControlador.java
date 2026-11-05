package com.agencia.buses.controlador;

import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agencia.buses.modelo.Bus;
import com.agencia.buses.negocio.IBusNegocio;

// El Controlador recibe las solicitudes HTTP (por ejemplo desde Postman).
// No tiene SQL ni reglas de negocio: solo llama al Negocio y devuelve la respuesta.
@RestController
@RequestMapping("/api/buses")
public class BusControlador {

    // Spring nos entrega (inyecta) el Negocio.
    private final IBusNegocio negocio;

    public BusControlador(IBusNegocio negocio) {
        this.negocio = negocio;
    }

    // GET /api/buses -> lista todos los buses (200 OK)
    @GetMapping
    public ResponseEntity<?> listar() {
        try {
            return ResponseEntity.ok(negocio.listar());
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // GET /api/buses/{id} -> busca un bus (200 OK o 404)
    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(negocio.obtenerPorId(id));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // POST /api/buses -> registra un bus (201 CREATED o 400)
    // @RequestBody convierte el JSON recibido en un objeto Bus.
    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Bus bus) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(negocio.registrar(bus));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // PUT /api/buses/{id} -> actualiza un bus (200 OK, 400 o 404)
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Integer id, @RequestBody Bus bus) {
        try {
            return ResponseEntity.ok(negocio.actualizar(id, bus));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // DELETE /api/buses/{id} -> elimina un bus (204 NO CONTENT o 404)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Integer id) {
        try {
            negocio.eliminar(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return responderError(e);
        }
    }

    // Convierte el tipo de error en el código HTTP correspondiente.
    private ResponseEntity<?> responderError(Exception e) {
        if (e instanceof IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
        if (e instanceof NoSuchElementException) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
        // Cualquier otro error (por ejemplo, la base de datos caída): 500
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error interno del servidor: " + e.getMessage()));
    }
}
