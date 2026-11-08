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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
        try { return ResponseEntity.ok(negocio.consultarDisponibilidad(idViaje)); }
        catch (Exception e) { return responderError(e); }
    }

    @GetMapping("/viaje/{idViaje}")
    public ResponseEntity<?> listarPorViaje(@PathVariable Integer idViaje) {
        try { return ResponseEntity.ok(negocio.listarPorViaje(idViaje)); }
        catch (Exception e) { return responderError(e); }
    }

    @GetMapping("/mis-reservas")
    public ResponseEntity<?> listarMisReservas(Authentication autenticacion) {
        try { return ResponseEntity.ok(negocio.listarPorCliente(autenticacion.getName())); }
        catch (Exception e) { return responderError(e); }
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Reserva reserva, Authentication autenticacion) {
        try {
            if (autenticacion == null) throw new IllegalArgumentException("Debe iniciar sesión para reservar");
            return ResponseEntity.status(HttpStatus.CREATED).body(negocio.registrar(reserva, autenticacion.getName()));
        } catch (Exception e) { return responderError(e); }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelar(@PathVariable Integer id, Authentication autenticacion) {
        try {
            if (autenticacion == null) throw new IllegalArgumentException("Debe iniciar sesión para cancelar");
            negocio.cancelar(id, autenticacion.getName());
            return ResponseEntity.noContent().build();
        } catch (Exception e) { return responderError(e); }
    }

    @PostMapping("/{id}/pago")
    public ResponseEntity<?> pagar(@PathVariable Integer id, Authentication autenticacion) {
        try { return ResponseEntity.ok(negocio.pagar(id, autenticacion.getName())); }
        catch (Exception e) { return responderError(e); }
    }

    @PatchMapping("/{id}/reprogramar")
    public ResponseEntity<?> reprogramar(@PathVariable Integer id, @RequestBody Map<String, Integer> datos,
                                         Authentication autenticacion) {
        try {
            return ResponseEntity.ok(negocio.reprogramar(id, datos.get("idViaje"),
                    datos.get("numeroAsiento"), autenticacion.getName()));
        } catch (Exception e) { return responderError(e); }
    }

    @GetMapping("/historial")
    public ResponseEntity<?> historial(Authentication autenticacion,
                                       @RequestParam(required = false) String estado,
                                       @RequestParam(required = false) String desde,
                                       @RequestParam(required = false) String hasta) {
        try { return ResponseEntity.ok(negocio.historial(autenticacion.getName(), estado, desde, hasta)); }
        catch (Exception e) { return responderError(e); }
    }

    @PatchMapping("/{id}/abordaje")
    public ResponseEntity<?> validarAbordaje(@PathVariable Integer id, @RequestBody Map<String, String> datos) {
        try {
            negocio.validarAbordaje(id, datos.get("estado"));
            return ResponseEntity.ok(Map.of("mensaje", "Abordaje actualizado"));
        } catch (Exception e) { return responderError(e); }
    }

    private ResponseEntity<?> responderError(Exception e) {
        if (e instanceof IllegalArgumentException)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        if (e instanceof NoSuchElementException)
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error interno del servidor: " + e.getMessage()));
    }
}
