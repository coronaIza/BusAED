package com.agencia.buses.controlador;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Segundo endpoint: demuestra que la arquitectura se puede ampliar.
//
// TEMPORAL: por ahora devuelve datos de EJEMPLO.
// Más adelante se reemplazará por: ViajeControlador -> ViajeNegocio -> ViajeDAO -> tabla "viaje" en PostgreSQL.
@RestController
@RequestMapping("/api/viajes")
public class ViajeControlador {

    // GET /api/viajes
    @GetMapping
    public List<Map<String, Object>> listar() {
        List<Map<String, Object>> viajes = new ArrayList<>();
        viajes.add(crearViaje(1, "Lima", "Ica", "2026-11-01", "08:00", "PROGRAMADO"));
        viajes.add(crearViaje(2, "Ica", "Nazca", "2026-11-01", "14:30", "PROGRAMADO"));
        return viajes;
    }

    private Map<String, Object> crearViaje(int id, String origen, String destino,
                                           String fecha, String hora, String estado) {
        Map<String, Object> viaje = new LinkedHashMap<>();
        viaje.put("id", id);
        viaje.put("origen", origen);
        viaje.put("destino", destino);
        viaje.put("fechaSalida", fecha);
        viaje.put("horaSalida", hora);
        viaje.put("estado", estado);
        return viaje;
    }
}
