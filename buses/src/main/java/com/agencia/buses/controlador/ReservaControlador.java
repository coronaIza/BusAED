package com.agencia.buses.controlador;

import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agencia.buses.modelo.Reserva;
import com.agencia.buses.negocio.IReservaNegocio;

@RestController
@RequestMapping("/api/reservas")
public class ReservaControlador {

    private final IReservaNegocio negocio;

    public ReservaControlador(IReservaNegocio negocio) {
        this.negocio = negocio;
    }

    @GetMapping("/viaje/{idViaje}/disponibilidad")
    public ResponseEntity<?> consultarDisponibilidad(@PathVariable Integer idViaje) {
        try {
            return ResponseEntity.ok(negocio.consultarDisponibilidad(idViaje));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    @GetMapping("/viaje/{idViaje}")
    public ResponseEntity<?> listarPorViaje(@PathVariable Integer idViaje) {
        try {
            return ResponseEntity.ok(negocio.listarPorViaje(idViaje));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    @GetMapping("/mis-reservas")
    public ResponseEntity<?> listarMisReservas(Authentication autenticacion) {
        try {
            return ResponseEntity.ok(negocio.listarPorCliente(autenticacion.getName()));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Reserva reserva, Authentication autenticacion) {
        try {
            if (autenticacion == null) {
                throw new IllegalArgumentException("Debe iniciar sesión para reservar");
            }
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(negocio.registrar(reserva, autenticacion.getName()));
        } catch (Exception e) {
            return responderError(e);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelar(@PathVariable Integer id, Authentication autenticacion) {
        try {
            if (autenticacion == null) {
                throw new IllegalArgumentException("Debe iniciar sesión para cancelar");
            }
            negocio.cancelar(id, autenticacion.getName());
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
