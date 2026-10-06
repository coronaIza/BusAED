package com.agencia.buses.controlador;

import com.agencia.buses.negocio.IChoferNegocio;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// GET /api/choferes -> lista de choferes (solo ADMIN, ver SecurityConfig).
@RestController
@RequestMapping("/api/choferes")
public class ChoferControlador {

    private final IChoferNegocio negocio;

    public ChoferControlador(IChoferNegocio negocio) {
        this.negocio = negocio;
    }

    @GetMapping
    public ResponseEntity<?> listar() {
        try {
            return ResponseEntity.ok(negocio.listar());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor: " + e.getMessage()));
        }
    }
}
