package com.agencia.buses.negocio;

import java.util.Queue;

// MODIFICACIÓN: las operaciones de reservas se separan de la gestión de buses.
public interface IReservaNegocio {

    boolean[][] simularMapaAsientos(int filas, int columnas);

    String encolarReservaEspera(String pasajero);

    Queue<String> obtenerColaEspera();
}
