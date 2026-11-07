package com.agencia.buses.controlador;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.agencia.buses.modelo.Venta;
import com.agencia.buses.dao.VentaRepositorio;

@RestController
@RequestMapping("/api/ventas")
public class VentaControlador {
    private final VentaRepositorio ventas;

    public VentaControlador(VentaRepositorio ventas) {
        this.ventas = ventas;
    }

    @GetMapping
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(ventas.findAll());
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Venta venta) {
        if (venta.getIdViaje() == null || venta.getNumeroAsiento() == null || venta.getTotal() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Viaje, asiento y total son obligatorios"));
        }
        venta.setEstado("PAGADO");
        venta.setFechaVenta(LocalDateTime.now());
        venta.setTotal(venta.getTotal().compareTo(BigDecimal.ZERO) <= 0 ? null : venta.getTotal());
        if (venta.getTotal() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "El total debe ser mayor que cero"));
        }
        Integer idViaje = venta.getIdViaje();
        Integer numeroAsiento = venta.getNumeroAsiento();
        boolean ocupado = ventas.findByIdViajeAndEstadoNot(idViaje, "ANULADO").stream()
                .anyMatch(v -> numeroAsiento.equals(v.getNumeroAsiento()));
        if (ocupado) {
            return ResponseEntity.badRequest().body(Map.of("error", "El asiento ya está ocupado"));
        }
        venta.setComprobante("CB-" + System.currentTimeMillis());
        venta = ventas.save(venta);
        venta.setComprobante("CB-" + venta.getFechaVenta().toLocalDate().toString().replace("-", "")
                + "-" + String.format("%06d", venta.getId()));
        ventas.save(venta);
        return ResponseEntity.status(HttpStatus.CREATED).body(venta);
    }

    @PostMapping("/{id}/anular")
    public ResponseEntity<?> anular(@PathVariable Integer id) {
        Venta venta = ventas.findById(id).orElse(null);
        if (venta == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Venta no encontrada"));
        }
        venta.setEstado("ANULADO");
        ventas.save(venta);
        return ResponseEntity.ok(venta);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> modificar(@PathVariable Integer id, @RequestBody Venta cambios) {
        Venta venta = ventas.findById(id).orElse(null);
        if (venta == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Venta no encontrada"));
        }
        if ("ANULADO".equalsIgnoreCase(venta.getEstado())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Una venta anulada no puede modificarse"));
        }
        if (cambios.getNumeroAsiento() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "El asiento es obligatorio"));
        }
        boolean ocupado = ventas.findByIdViajeAndEstadoNot(venta.getIdViaje(), "ANULADO").stream()
                .filter(v -> !v.getId().equals(id))
                .anyMatch(v -> cambios.getNumeroAsiento().equals(v.getNumeroAsiento()));
        if (ocupado) {
            return ResponseEntity.badRequest().body(Map.of("error", "El asiento ya está ocupado"));
        }
        venta.setNumeroAsiento(cambios.getNumeroAsiento());
        return ResponseEntity.ok(ventas.save(venta));
    }
}
