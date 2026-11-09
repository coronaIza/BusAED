package com.agencia.buses.controlador;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.agencia.buses.modelo.Incidencia;
import com.agencia.buses.dao.IncidenciaRepositorio;

@RestController
@RequestMapping("/api/incidencias")
public class IncidenciaControlador {
    private final IncidenciaRepositorio incidencias;

    public IncidenciaControlador(IncidenciaRepositorio incidencias) {
        this.incidencias = incidencias;
    }

    @GetMapping
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(incidencias.findAll());
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Incidencia incidencia) {
        if (incidencia.getIdViaje() == null || incidencia.getTipo() == null
                || incidencia.getDescripcion() == null || incidencia.getDescripcion().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Viaje, tipo y descripción son obligatorios"));
        }
        incidencia.setFecha(LocalDateTime.now());
        incidencias.save(incidencia);
        return ResponseEntity.status(HttpStatus.CREATED).body(incidencia);
    }
}
