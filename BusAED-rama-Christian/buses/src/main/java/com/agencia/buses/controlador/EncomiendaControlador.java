package com.agencia.buses.controlador;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.agencia.buses.modelo.Encomienda;
import com.agencia.buses.dao.EncomiendaRepositorio;

@RestController
@RequestMapping("/api/encomiendas")
public class EncomiendaControlador {
    private final EncomiendaRepositorio encomiendas;

    public EncomiendaControlador(EncomiendaRepositorio encomiendas) {
        this.encomiendas = encomiendas;
    }

    @GetMapping
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(encomiendas.findAll());
    }

    @GetMapping("/mis-encomiendas")
    public ResponseEntity<?> listarMisEncomiendas(java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String correo = principal.getName();
        java.util.List<Encomienda> misEncomiendas = encomiendas.findAll().stream()
                .filter(e -> e.getCorreoRemitente() != null && e.getCorreoRemitente().equalsIgnoreCase(correo))
                .toList();
        return ResponseEntity.ok(misEncomiendas);
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Encomienda encomienda) {
        if (vacio(encomienda.getRemitente()) || vacio(encomienda.getDestinatario())
                || vacio(encomienda.getOrigen()) || vacio(encomienda.getDestino())) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Remitente, destinatario, origen y destino son obligatorios"));
        }
        if (encomienda.getPesoKg() == null || encomienda.getPesoKg().compareTo(BigDecimal.ZERO) <= 0
                || encomienda.getPrecio() == null || encomienda.getPrecio().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Peso y precio deben ser mayores que cero"));
        }

        // taquilla.js manda PAGADO (cobrada en ventanilla) o PENDIENTE (la paga el cliente en la app);
        // antes se pisaba siempre a REGISTRADO y el estado elegido se perdía.
        String estadoPedido = encomienda.getEstado() == null ? "" : encomienda.getEstado().trim().toUpperCase();
        encomienda.setEstado("PAGADO".equals(estadoPedido) || "PENDIENTE".equals(estadoPedido)
                ? estadoPedido : "REGISTRADO");

        encomienda.setFechaRegistro(LocalDateTime.now());
        try {
            Encomienda registrada = encomiendas.save(encomienda);
            return ResponseEntity.status(HttpStatus.CREATED).body(registrada);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "No se pudo guardar la encomienda: "
                            + mensajeTecnico(e)));
        }
    }

    @PatchMapping("/{id}/entregar")
    public ResponseEntity<?> entregar(@PathVariable Integer id) {
        Encomienda encomienda = encomiendas.findById(id).orElse(null);
        if (encomienda == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Encomienda no encontrada"));
        }
        encomienda.setEstado("ENTREGADO");
        encomienda.setFechaEntrega(LocalDateTime.now());
        encomiendas.save(encomienda);
        return ResponseEntity.ok(encomienda);
    }

    @PatchMapping("/{id}/pagar")
    public ResponseEntity<?> pagar(@PathVariable Integer id,
                                   org.springframework.security.core.Authentication autenticacion) {
        Encomienda encomienda = encomiendas.findById(id).orElse(null);
        if (encomienda == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Encomienda no encontrada"));
        }
        boolean personal = autenticacion.getAuthorities().stream()
                .anyMatch(rol -> "ROLE_TAQUILLERO".equals(rol.getAuthority()) || "ROLE_ADMIN".equals(rol.getAuthority()));
        boolean esSuya = encomienda.getCorreoRemitente() != null
                && encomienda.getCorreoRemitente().equalsIgnoreCase(autenticacion.getName());
        if (!personal && !esSuya) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Esta encomienda no te pertenece"));
        }
        if ("ENTREGADO".equalsIgnoreCase(encomienda.getEstado())) {
            return ResponseEntity.badRequest().body(Map.of("error", "La encomienda ya fue entregada"));
        }
        encomienda.setEstado("PAGADO");
        encomiendas.save(encomienda);
        return ResponseEntity.ok(encomienda);
    }

    private boolean vacio(String valor) {
        return valor == null || valor.isBlank();
    }

    private String mensajeTecnico(Throwable error) {
        Throwable causa = error;
        while (causa.getCause() != null && causa.getCause() != causa) {
            causa = causa.getCause();
        }
        return causa.getMessage() == null ? error.getClass().getSimpleName() : causa.getMessage();
    }
}
