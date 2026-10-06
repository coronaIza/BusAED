package com.agencia.buses.negocio;

import java.util.ArrayDeque;
import java.util.Queue;

import org.springframework.stereotype.Service;

@Service
public class ReservaNegocio implements IReservaNegocio {

    // ArrayDeque mantiene una cola FIFO en memoria para reservas en espera.
    private final Queue<String> colaEspera = new ArrayDeque<>();

    @Override
    public boolean[][] simularMapaAsientos(int filas, int columnas) {
        if (filas <= 0 || columnas <= 0) {
            throw new IllegalArgumentException("Las filas y columnas deben ser mayores que cero");
        }
        // En esta simulación, false representa un asiento libre.
        return new boolean[filas][columnas];
    }

    @Override
    public synchronized String encolarReservaEspera(String pasajero) {
        if (pasajero == null || pasajero.isBlank()) {
            throw new IllegalArgumentException("El nombre del pasajero no puede estar vacío");
        }
        colaEspera.add(pasajero.trim());
        return "Reserva agregada a la cola de espera";
    }

    @Override
    public synchronized Queue<String> obtenerColaEspera() {
        // Se entrega una copia para que quien consulta no modifique la cola interna.
        return new ArrayDeque<>(colaEspera);
    }
}
