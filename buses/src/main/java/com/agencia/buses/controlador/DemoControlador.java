package com.agencia.buses.controlador;

import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.Map;
import java.util.Queue;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agencia.buses.modelo.Reserva;

// DEMOSTRACIÓN de las estructuras de datos del proyecto.
// Es solo para mostrar al profesor qué estructuras usaremos; luego se integrarán a las reservas reales.
//
// 1. ArrayList<Bus>  -> YA se usa en BusDAO.listar() para guardar los buses leídos de la BD.
// 2. Queue<Reserva>  -> cola de reservas pendientes (FIFO: el primero en llegar es el primero en atenderse).
// 3. boolean[][]     -> matriz de asientos del bus (true = ocupado, false = libre).
//
// TRANSACCIONES (para el futuro): reservar un asiento es una operación sensible.
// Habrá que usar transacciones JDBC: con.setAutoCommit(false), con.commit() si todo sale bien
// y con.rollback() si algo falla, para no dejar reservas a medias ni asientos duplicados.
@RestController
@RequestMapping("/api/demo")
public class DemoControlador {

    // GET /api/demo/estructuras
    @GetMapping("/estructuras")
    public Map<String, Object> estructuras() {

        // ---- Queue: cola de reservas pendientes ----
        Queue<Reserva> cola = new LinkedList<>();
        cola.offer(new Reserva("Ana", 1));   // offer() agrega al final de la cola
        cola.offer(new Reserva("Luis", 2));
        cola.offer(new Reserva("Rosa", 3));
        Reserva atendida = cola.poll();      // poll() saca al primero (Ana)

        // ---- Matriz: 10 filas x 4 columnas = 40 asientos ----
        boolean[][] asientos = new boolean[10][4];
        asientos[0][0] = true;               // fila 1, columna 1 ocupado
        asientos[2][1] = true;               // fila 3, columna 2 ocupado

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("reservaAtendida", atendida);
        respuesta.put("reservasPendientes", cola);
        respuesta.put("matrizAsientos", asientos);
        return respuesta;
    }
}
